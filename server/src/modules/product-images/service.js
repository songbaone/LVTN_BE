const fs = require('fs');
const path = require('path');
const { db } = require('../../database/connection');
const { TABLES, UPLOADS_DIR } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');

function parseId(value, label) {
  const id = parseInt(value, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return id;
}

function mapImage(record) {
  if (!record) {
    return null;
  }

  return {
    image_id: record.image_id,
    image_url: record.image_url,
    is_main: Boolean(record.is_main),
  };
}

function removeLocalImageFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
    return;
  }

  const relativePath = imageUrl.replace('/uploads/', '');
  const absolutePath = path.join(UPLOADS_DIR, relativePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

async function ensureProductExists(productId) {
  const product = await db(TABLES.PRODUCTS)
    .where({ product_id: productId })
    .first();

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product;
}

async function ensureImageBelongsToProduct(productId, imageId) {
  const image = await db(TABLES.PRODUCT_IMAGES)
    .where({ image_id: imageId, product_id: productId })
    .first();

  if (!image) {
    throw new AppError('Product image not found', 404);
  }

  return image;
}

async function getProductImages(productIdParam) {
  const productId = parseId(productIdParam, 'product ID');
  await ensureProductExists(productId);

  const images = await db(TABLES.PRODUCT_IMAGES)
    .select('image_id', 'image_url', 'is_main')
    .where({ product_id: productId })
    .orderBy('is_main', 'desc')
    .orderBy('image_id', 'asc');

  return {
    images: images.map(mapImage),
  };
}

async function uploadProductImage(productIdParam, file) {
  const productId = parseId(productIdParam, 'product ID');

  if (!file) {
    throw new AppError('Image file is required', 400);
  }

  await ensureProductExists(productId);

  const imageCountResult = await db(TABLES.PRODUCT_IMAGES)
    .where({ product_id: productId })
    .count({ count: '*' });

  const imageCount = Number(imageCountResult[0]?.count ?? 0);
  const is_main = imageCount === 0 ? 1 : 0;
  const image_url = `/uploads/products/${file.filename}`;

  await db(TABLES.PRODUCT_IMAGES).insert({
    product_id: productId,
    image_url,
    is_main,
  });

  const image = await db(TABLES.PRODUCT_IMAGES)
    .where({ product_id: productId, image_url })
    .first();

  return mapImage(image);
}

async function deleteProductImage(productIdParam, imageIdParam) {
  const productId = parseId(productIdParam, 'product ID');
  const imageId = parseId(imageIdParam, 'image ID');

  const image = await ensureImageBelongsToProduct(productId, imageId);
  const wasMain = Boolean(image.is_main);

  await db(TABLES.PRODUCT_IMAGES).where({ image_id: imageId }).del();
  removeLocalImageFile(image.image_url);

  if (wasMain) {
    const nextMain = await db(TABLES.PRODUCT_IMAGES)
      .where({ product_id: productId })
      .orderBy('image_id', 'asc')
      .first();

    if (nextMain) {
      await db(TABLES.PRODUCT_IMAGES)
        .where({ image_id: nextMain.image_id })
        .update({ is_main: 1 });
    }
  }

  return { image_id: imageId };
}

async function setMainImage(productIdParam, imageIdParam) {
  const productId = parseId(productIdParam, 'product ID');
  const imageId = parseId(imageIdParam, 'image ID');

  await ensureImageBelongsToProduct(productId, imageId);

  await db.transaction(async (trx) => {
    await trx(TABLES.PRODUCT_IMAGES)
      .where({ product_id: productId })
      .update({ is_main: 0 });

    await trx(TABLES.PRODUCT_IMAGES)
      .where({ image_id: imageId, product_id: productId })
      .update({ is_main: 1 });
  });

  const image = await db(TABLES.PRODUCT_IMAGES)
    .where({ image_id: imageId })
    .first();

  return mapImage(image);
}

module.exports = {
  getProductImages,
  uploadProductImage,
  deleteProductImage,
  setMainImage,
};
