const fs = require('fs');
const path = require('path');
const { db } = require('../../database/connection');
const { TABLES, UPLOADS_DIR } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { generateUniqueSlug } = require('../../utils/slug');

const PRODUCT_COLUMNS = [
  'Products.product_id',
  'Products.product_name',
  'Products.slug',
  'Products.sku',
  'Products.category_id',
  'Products.brand_id',
  'Categories.category_name',
  'Brands.brand_name',
  'Products.description',
  'Products.short_description',
  'Products.thumbnail',
  'Products.price',
  'Products.discount_price',
  'Products.weight',
  'Products.age_from',
  'Products.age_to',
  'Products.status',
  'Products.created_at',
  'Products.updated_at',
];

function parseProductId(productId) {
  const id = parseInt(productId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid product ID', 400);
  }

  return id;
}

function mapProduct(record) {
  if (!record) {
    return null;
  }

  return {
    product_id: record.product_id,
    product_name: record.product_name,
    slug: record.slug,
    sku: record.sku,
    category_id: record.category_id,
    category_name: record.category_name ?? null,
    brand_id: record.brand_id,
    brand_name: record.brand_name ?? null,
    description: record.description ?? null,
    short_description: record.short_description ?? null,
    thumbnail: record.thumbnail ?? null,
    price: Number(record.price),
    discount_price:
      record.discount_price !== null && record.discount_price !== undefined
        ? Number(record.discount_price)
        : null,
    weight:
      record.weight !== null && record.weight !== undefined
        ? Number(record.weight)
        : null,
    age_from: record.age_from ?? null,
    age_to: record.age_to ?? null,
    status: Boolean(record.status),
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapCategoryInfo(record) {
  if (!record) {
    return null;
  }

  return {
    category_id: record.category_id,
    category_name: record.category_name,
    slug: record.category_slug,
    description: record.category_description ?? null,
    image_url: record.category_image_url ?? null,
    status: Boolean(record.category_status),
  };
}

function mapBrandInfo(record) {
  if (!record) {
    return null;
  }

  return {
    brand_id: record.brand_id,
    brand_name: record.brand_name,
    logo_url: record.brand_logo_url ?? null,
    country: record.brand_country ?? null,
    description: record.brand_description ?? null,
    status: Boolean(record.brand_status),
  };
}

function mapImage(record) {
  return {
    image_id: record.image_id,
    image_url: record.image_url,
    is_main: Boolean(record.is_main),
  };
}

function removeUploadedFiles(files = []) {
  files.forEach((file) => {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
}

function parseMainImageIndex(value, filesLength) {
  if (filesLength === 0) {
    return null;
  }

  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const index = parseInt(value, 10);

  if (Number.isNaN(index) || index < 0 || index >= filesLength) {
    throw new AppError('Main image index is out of range', 400);
  }

  return index;
}

function buildProductInsertData(body, slug, sku) {
  return {
    product_name: body.product_name,
    slug,
    sku,
    category_id: parseInt(body.category_id, 10),
    brand_id: parseInt(body.brand_id, 10),
    description: body.description || null,
    short_description: body.short_description || null,
    thumbnail: null,
    price: parseFloat(body.price),
    discount_price:
      body.discount_price !== undefined && body.discount_price !== null && body.discount_price !== ''
        ? parseFloat(body.discount_price)
        : null,
    weight:
      body.weight !== undefined && body.weight !== null && body.weight !== ''
        ? parseFloat(body.weight)
        : null,
    age_from:
      body.age_from !== undefined && body.age_from !== null && body.age_from !== ''
        ? parseInt(body.age_from, 10)
        : null,
    age_to:
      body.age_to !== undefined && body.age_to !== null && body.age_to !== ''
        ? parseInt(body.age_to, 10)
        : null,
    status:
      body.status !== undefined && body.status !== null && body.status !== ''
        ? parseInt(body.status, 10)
        : 1,
  };
}

function buildProductUpdateData(body) {
  const updateData = {};

  if (body.product_name !== undefined) {
    updateData.product_name = body.product_name;
  }

  if (body.category_id !== undefined) {
    updateData.category_id = parseInt(body.category_id, 10);
  }

  if (body.brand_id !== undefined) {
    updateData.brand_id = parseInt(body.brand_id, 10);
  }

  if (body.description !== undefined) {
    updateData.description = body.description || null;
  }

  if (body.short_description !== undefined) {
    updateData.short_description = body.short_description || null;
  }

  if (body.price !== undefined) {
    updateData.price = parseFloat(body.price);
  }

  if (body.discount_price !== undefined) {
    updateData.discount_price =
      body.discount_price === null || body.discount_price === ''
        ? null
        : parseFloat(body.discount_price);
  }

  if (body.weight !== undefined) {
    updateData.weight =
      body.weight === null || body.weight === '' ? null : parseFloat(body.weight);
  }

  if (body.age_from !== undefined) {
    updateData.age_from =
      body.age_from === null || body.age_from === '' ? null : parseInt(body.age_from, 10);
  }

  if (body.age_to !== undefined) {
    updateData.age_to =
      body.age_to === null || body.age_to === '' ? null : parseInt(body.age_to, 10);
  }

  if (body.status !== undefined) {
    updateData.status = parseInt(body.status, 10);
  }

  return updateData;
}

async function generateUniqueSku(trx = db) {
  let sku = buildSku();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await trx(TABLES.PRODUCTS).where({ sku }).first();

    if (!existing) {
      return sku;
    }

    sku = buildSku();
    attempts += 1;
  }

  throw new AppError('Unable to generate a unique SKU', 500);
}

function buildSku() {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SKU-${Date.now()}-${randomPart}`;
}

async function ensureCategoryExists(categoryId, trx = db) {
  const category = await trx(TABLES.CATEGORIES)
    .where({ category_id: categoryId })
    .first();

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return category;
}

async function ensureBrandExists(brandId, trx = db) {
  const brand = await trx(TABLES.BRANDS).where({ brand_id: brandId }).first();

  if (!brand) {
    throw new AppError('Brand not found', 404);
  }

  return brand;
}

async function ensureProductExists(productId, trx = db) {
  const product = await trx(TABLES.PRODUCTS)
    .where({ product_id: productId })
    .first();

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product;
}

function buildDetailQuery(trx = db) {
  return trx(TABLES.PRODUCTS)
    .join(TABLES.CATEGORIES, 'Products.category_id', 'Categories.category_id')
    .join(TABLES.BRANDS, 'Products.brand_id', 'Brands.brand_id')
    .select([
      ...PRODUCT_COLUMNS,
      'Categories.slug as category_slug',
      'Categories.description as category_description',
      'Categories.image_url as category_image_url',
      'Categories.status as category_status',
      'Brands.logo_url as brand_logo_url',
      'Brands.country as brand_country',
      'Brands.description as brand_description',
      'Brands.status as brand_status',
    ]);
}

async function getProductImages(productId, trx = db) {
  const images = await trx(TABLES.PRODUCT_IMAGES)
    .select('image_id', 'image_url', 'is_main')
    .where({ product_id: productId })
    .orderBy('is_main', 'desc')
    .orderBy('image_id', 'asc');

  return images.map(mapImage);
}

async function getVariantAggregates(productIds) {
  if (!productIds.length) {
    return {};
  }

  const rows = await db(TABLES.PRODUCT_VARIANTS)
    .select('product_id')
    .count({ count: 'variant_id' })
    .sum({ stock: 'stock_quantity' })
    .whereIn('product_id', productIds)
    .groupBy('product_id');

  const result = {};
  rows.forEach((row) => {
    result[row.product_id] = {
      variant_count: Number(row.count),
      total_stock: Number(row.stock) || 0,
    };
  });

  return result;
}

async function insertProductImages(trx, productId, files, mainImageIndex) {
  if (!files.length) {
    return [];
  }

  const hasMainSelection =
    mainImageIndex !== null && mainImageIndex !== undefined;
  const insertedImages = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const image_url = `/uploads/products/${file.filename}`;
    const is_main = hasMainSelection && index === mainImageIndex ? 1 : 0;

    await trx(TABLES.PRODUCT_IMAGES).insert({
      product_id: productId,
      image_url,
      is_main,
    });

    const image = await trx(TABLES.PRODUCT_IMAGES)
      .where({ product_id: productId, image_url })
      .first();

    insertedImages.push(image);
  }

  return insertedImages;
}

async function setMainImageForProduct(trx, productId, mainImageId) {
  await trx(TABLES.PRODUCT_IMAGES)
    .where({ product_id: productId })
    .update({ is_main: 0 });

  await trx(TABLES.PRODUCT_IMAGES)
    .where({ image_id: mainImageId, product_id: productId })
    .update({ is_main: 1 });

  const mainImage = await trx(TABLES.PRODUCT_IMAGES)
    .where({ image_id: mainImageId })
    .first();

  if (mainImage) {
    await trx(TABLES.PRODUCTS)
      .where({ product_id: productId })
      .update({ thumbnail: mainImage.image_url });
  }
}

function applyListFilters(query, filters, tablePrefix = '') {
  const col = (name) => `${tablePrefix}${name}`;

  if (filters.product_name) {
    query.where(col('product_name'), 'like', `%${filters.product_name}%`);
  }

  if (filters.category_id) {
    query.where(col('category_id'), filters.category_id);
  }

  if (filters.brand_id) {
    query.where(col('brand_id'), filters.brand_id);
  }

  if (filters.age_from !== undefined && filters.age_from !== null) {
    query.where(col('age_from'), '>=', filters.age_from);
  }

  if (filters.age_to !== undefined && filters.age_to !== null) {
    query.where(col('age_to'), '<=', filters.age_to);
  }

  if (filters.min_price !== undefined && filters.min_price !== null) {
    query.where(col('price'), '>=', filters.min_price);
  }

  if (filters.max_price !== undefined && filters.max_price !== null) {
    query.where(col('price'), '<=', filters.max_price);
  }

  if (filters.status !== undefined && filters.status !== null) {
    query.where(col('status'), filters.status);
  }

  return query;
}

function parseListFilters(queryParams) {
  return {
    product_name: queryParams.product_name?.trim() || null,
    category_id: queryParams.category_id
      ? parseInt(queryParams.category_id, 10)
      : null,
    brand_id: queryParams.brand_id ? parseInt(queryParams.brand_id, 10) : null,
    age_from:
      queryParams.age_from !== undefined
        ? parseInt(queryParams.age_from, 10)
        : undefined,
    age_to:
      queryParams.age_to !== undefined
        ? parseInt(queryParams.age_to, 10)
        : undefined,
    min_price:
      queryParams.min_price !== undefined
        ? parseFloat(queryParams.min_price)
        : undefined,
    max_price:
      queryParams.max_price !== undefined
        ? parseFloat(queryParams.max_price)
        : undefined,
    status:
      queryParams.status !== undefined
        ? parseInt(queryParams.status, 10)
        : undefined,
  };
}

async function getProducts(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);
  const filters = parseListFilters(queryParams);

  let countQuery = db(TABLES.PRODUCTS);
  countQuery = applyListFilters(countQuery, filters);
  const countResult = await countQuery.count({ total: 'product_id' });
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(TABLES.PRODUCTS)
    .leftJoin(TABLES.CATEGORIES, 'Products.category_id', 'Categories.category_id')
    .leftJoin(TABLES.BRANDS, 'Products.brand_id', 'Brands.brand_id')
    .select(
      'Products.product_id',
      'Products.product_name',
      'Products.slug',
      'Products.sku',
      'Products.category_id',
      'Products.brand_id',
      'Categories.category_name',
      'Brands.brand_name',
      'Products.short_description',
      'Products.description',
      'Products.thumbnail',
      'Products.price',
      'Products.discount_price',
      'Products.age_from',
      'Products.age_to',
      'Products.status',
      'Products.created_at'
    );
  listQuery = applyListFilters(listQuery, filters, 'Products.');

  const products = await listQuery
    .orderBy('Products.created_at', 'desc')
    .offset(offset)
    .limit(limit);

  const productIds = products.map((p) => p.product_id);

  let imagesByProduct = {};

  if (productIds.length > 0) {
    const allImages = await db(TABLES.PRODUCT_IMAGES)
      .select('image_id', 'product_id', 'image_url', 'is_main')
      .whereIn('product_id', productIds)
      .orderBy('is_main', 'desc')
      .orderBy('image_id', 'asc');

    imagesByProduct = allImages.reduce((acc, img) => {
      if (!acc[img.product_id]) {
        acc[img.product_id] = [];
      }
      acc[img.product_id].push(mapImage(img));
      return acc;
    }, {});
  }

  const variantAggs = await getVariantAggregates(productIds);

  const productsWithImages = products.map((product) => {
    const productImages = imagesByProduct[product.product_id] || [];
    const mainImage = productImages.find((img) => img.is_main) || productImages[0] || null;
    const aggs = variantAggs[product.product_id] || {};

    return {
      ...mapProduct(product),
      thumbnail: mainImage?.image_url || null,
      images: productImages,
      variant_count: aggs.variant_count || 0,
      total_stock: aggs.total_stock || 0,
    };
  });

  return {
    products: productsWithImages,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getProductVariants(productId) {
  const variants = await db(TABLES.PRODUCT_VARIANTS)
    .select(
      'variant_id',
      'size',
      'color',
      'material',
      'additional_price',
      'stock_quantity',
      'sku'
    )
    .where({ product_id: productId })
    .orderBy('variant_id', 'asc');

  return variants.map((v) => ({
    variant_id: v.variant_id,
    size: v.size ?? null,
    color: v.color ?? null,
    material: v.material ?? null,
    additional_price: Number(v.additional_price ?? 0),
    stock_quantity: Number(v.stock_quantity ?? 0),
    sku: v.sku,
  }));
}

async function getProductById(productIdParam) {
  const productId = parseProductId(productIdParam);

  const record = await buildDetailQuery()
    .where('Products.product_id', productId)
    .first();

  if (!record) {
    throw new AppError('Product not found', 404);
  }

  const [images, agg, variants] = await Promise.all([
    getProductImages(productId),
    getVariantAggregates([productId]),
    getProductVariants(productId),
  ]);

  const mainImage = images.find((img) => img.is_main) || images[0] || null;
  const aggs = agg[productId] || {};

  return {
    product: {
      ...mapProduct(record),
      thumbnail: mainImage?.image_url || null,
      images,
      variant_count: aggs.variant_count || 0,
      total_stock: aggs.total_stock || 0,
      variants,
    },
    category: mapCategoryInfo(record),
    brand: mapBrandInfo(record),
  };
}

async function createProduct(body, files = []) {
  const uploadedFiles = Array.isArray(files) ? files : [];
  const mainImageIndex = parseMainImageIndex(body.main_image_index, uploadedFiles.length);

  await ensureCategoryExists(parseInt(body.category_id, 10));
  await ensureBrandExists(parseInt(body.brand_id, 10));

  let createdProductId;

  try {
    await db.transaction(async (trx) => {
      const sku = await generateUniqueSku(trx);
      const slug = await generateUniqueSlug(
        trx,
        TABLES.PRODUCTS,
        'slug',
        body.product_name
      );

      const insertData = buildProductInsertData(body, slug, sku);
      await trx(TABLES.PRODUCTS).insert(insertData);

      const product = await trx(TABLES.PRODUCTS).where({ sku }).first();
      const productId = product.product_id;
      createdProductId = productId;

      const insertedImages = await insertProductImages(
        trx,
        productId,
        uploadedFiles,
        uploadedFiles.length > 0 ? mainImageIndex : undefined
      );

      if (insertedImages.length > 0) {
        const mainImage = insertedImages.find((image) => Boolean(image.is_main));

        if (mainImage) {
          await trx(TABLES.PRODUCTS)
            .where({ product_id: productId })
            .update({ thumbnail: mainImage.image_url });
        }
      }
    });
  } catch (error) {
    removeUploadedFiles(uploadedFiles);
    throw error;
  }

  return getProductById(createdProductId);
}

async function updateProduct(productIdParam, body, files = []) {
  const productId = parseProductId(productIdParam);
  const uploadedFiles = Array.isArray(files) ? files : [];
  const mainImageIndex = parseMainImageIndex(
    body.main_image_index,
    uploadedFiles.length
  );

  await ensureProductExists(productId);

  const updateData = buildProductUpdateData(body);

  if (updateData.category_id !== undefined) {
    await ensureCategoryExists(updateData.category_id);
  }

  if (updateData.brand_id !== undefined) {
    await ensureBrandExists(updateData.brand_id);
  }

  if (updateData.product_name !== undefined) {
    updateData.slug = await generateUniqueSlug(
      db,
      TABLES.PRODUCTS,
      'slug',
      updateData.product_name,
      productId
    );
  }

  // Parse image management fields
  let deleteImageIds = [];
  if (body.delete_image_ids !== undefined && body.delete_image_ids !== null) {
    deleteImageIds = Array.isArray(body.delete_image_ids)
      ? body.delete_image_ids.map((id) => parseInt(id, 10))
      : [];
  }

  let mainImageId = null;
  if (body.main_image_id !== undefined && body.main_image_id !== null) {
    mainImageId = parseInt(body.main_image_id, 10);
  }

  try {
    await db.transaction(async (trx) => {
      // 1. Update product fields
      if (Object.keys(updateData).length > 0) {
        await trx(TABLES.PRODUCTS).where({ product_id: productId }).update(updateData);
      }

      // 2. Delete specified images
      if (deleteImageIds.length > 0) {
        const imagesToDelete = await trx(TABLES.PRODUCT_IMAGES)
          .whereIn('image_id', deleteImageIds)
          .where({ product_id: productId });

        for (const image of imagesToDelete) {
          removeLocalLogoFile(image.image_url);
        }

        await trx(TABLES.PRODUCT_IMAGES)
          .whereIn('image_id', deleteImageIds)
          .where({ product_id: productId })
          .del();
      }

      // 3. Upload new images
      let insertedImages = [];
      if (uploadedFiles.length > 0) {
        const remainingCountResult = await trx(TABLES.PRODUCT_IMAGES)
          .where({ product_id: productId })
          .count({ count: '*' });
        const remainingCount = Number(remainingCountResult[0]?.count ?? 0);

        // If no existing images remain, first uploaded image becomes main by default
        let imageMainIndex;
        if (body.main_image_index !== undefined) {
          imageMainIndex = mainImageIndex;
        } else if (remainingCount === 0) {
          imageMainIndex = 0;
        }

        insertedImages = await insertProductImages(
          trx,
          productId,
          uploadedFiles,
          imageMainIndex
        );

        if (body.main_image_index !== undefined) {
          const selectedMainImage = insertedImages[mainImageIndex];
          await setMainImageForProduct(trx, productId, selectedMainImage.image_id);
        } else if (remainingCount === 0 && insertedImages.length > 0) {
          // First new image becomes main when no other images exist
          await trx(TABLES.PRODUCT_IMAGES)
            .where({ product_id: productId })
            .update({ is_main: 0 });
          await trx(TABLES.PRODUCT_IMAGES)
            .where({ image_id: insertedImages[0].image_id })
            .update({ is_main: 1 });
        }
      }

      // 4. Set main image by existing image_id
      if (mainImageId !== null) {
        // Verify the image belongs to this product
        const targetImage = await trx(TABLES.PRODUCT_IMAGES)
          .where({ image_id: mainImageId, product_id: productId })
          .first();

        if (targetImage) {
          await trx(TABLES.PRODUCT_IMAGES)
            .where({ product_id: productId })
            .update({ is_main: 0 });

          await trx(TABLES.PRODUCT_IMAGES)
            .where({ image_id: mainImageId })
            .update({ is_main: 1 });
        }
      }

      // 5. Ensure at least one main image exists if images remain
      const allRemainingImages = await trx(TABLES.PRODUCT_IMAGES)
        .where({ product_id: productId })
        .orderBy('is_main', 'desc')
        .orderBy('image_id', 'asc');

      if (allRemainingImages.length > 0) {
        const hasMain = allRemainingImages.some((img) => img.is_main === 1);

        if (!hasMain) {
          // Promote first image to main
          await trx(TABLES.PRODUCT_IMAGES)
            .where({ image_id: allRemainingImages[0].image_id })
            .update({ is_main: 1 });
        }

        // Update product thumbnail with current main image
        const mainImg = await trx(TABLES.PRODUCT_IMAGES)
          .where({ product_id: productId, is_main: 1 })
          .first();

        const thumbnailUrl = mainImg ? mainImg.image_url : allRemainingImages[0].image_url;

        await trx(TABLES.PRODUCTS)
          .where({ product_id: productId })
          .update({ thumbnail: thumbnailUrl });
      } else {
        // No images remain, clear thumbnail
        await trx(TABLES.PRODUCTS)
          .where({ product_id: productId })
          .update({ thumbnail: null });
      }
    });
  } catch (error) {
    removeUploadedFiles(uploadedFiles);
    throw error;
  }

  return getProductById(productId);
}

async function deleteProduct(productIdParam) {
  const productId = parseProductId(productIdParam);
  await ensureProductExists(productId);

  await db(TABLES.PRODUCTS).where({ product_id: productId }).update({
    status: 0,
  });

  return getProductById(productId);
}

function removeLocalLogoFile(logoUrl) {
  if (!logoUrl || !logoUrl.startsWith('/uploads/')) {
    return;
  }

  const relativePath = logoUrl.replace('/uploads/', '');
  const absolutePath = path.join(UPLOADS_DIR, relativePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};