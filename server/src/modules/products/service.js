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
    brand_id: record.brand_id,
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

function mapVariant(record) {
  return {
    variant_id: record.variant_id,
    product_id: record.product_id,
    size: record.size ?? null,
    color: record.color ?? null,
    material: record.material ?? null,
    additional_price: Number(record.additional_price ?? 0),
    stock_quantity: Number(record.stock_quantity ?? 0),
    sku: record.sku,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function buildSku() {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SKU-${Date.now()}-${randomPart}`;
}

function buildVariantSku(productId) {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VAR-${productId}-${Date.now()}-${randomPart}`;
}

function removeUploadedFiles(files = []) {
  files.forEach((file) => {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
}

function parseVariantsInput(variantsValue) {
  if (variantsValue === undefined || variantsValue === null || variantsValue === '') {
    return [];
  }

  let parsed;

  try {
    parsed = typeof variantsValue === 'string' ? JSON.parse(variantsValue) : variantsValue;
  } catch {
    throw new AppError('Variants must be a valid JSON array', 400);
  }

  if (!Array.isArray(parsed)) {
    throw new AppError('Variants must be a JSON array', 400);
  }

  return parsed;
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

async function generateUniqueVariantSku(trx, productId) {
  let sku = buildVariantSku(productId);
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await trx(TABLES.PRODUCT_VARIANTS).where({ sku }).first();

    if (!existing) {
      return sku;
    }

    sku = buildVariantSku(productId);
    attempts += 1;
  }

  throw new AppError('Unable to generate a unique variant SKU', 500);
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

async function ensureVariantBelongsToProduct(trx, productId, variantId) {
  const variant = await trx(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id: variantId, product_id: productId })
    .first();

  if (!variant) {
    throw new AppError(`Variant ${variantId} not found for this product`, 404);
  }

  return variant;
}

function buildDetailQuery(trx = db) {
  return trx(TABLES.PRODUCTS)
    .join(TABLES.CATEGORIES, 'Products.category_id', 'Categories.category_id')
    .join(TABLES.BRANDS, 'Products.brand_id', 'Brands.brand_id')
    .select([
      ...PRODUCT_COLUMNS,
      'Categories.category_name',
      'Categories.slug as category_slug',
      'Categories.description as category_description',
      'Categories.image_url as category_image_url',
      'Categories.status as category_status',
      'Brands.brand_name',
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

async function getProductVariants(productId, trx = db) {
  const variants = await trx(TABLES.PRODUCT_VARIANTS)
    .where({ product_id: productId })
    .orderBy('variant_id', 'asc');

  return variants.map(mapVariant);
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

async function insertVariants(trx, productId, variants) {
  const insertedVariants = [];

  for (const variant of variants) {
    if (variant.variant_id) {
      continue;
    }

    const sku =
      variant.sku && String(variant.sku).trim()
        ? String(variant.sku).trim()
        : await generateUniqueVariantSku(trx, productId);

    if (variant.sku && String(variant.sku).trim()) {
      const existingSku = await trx(TABLES.PRODUCT_VARIANTS)
        .where({ sku })
        .first();

      if (existingSku) {
        throw new AppError(`Variant SKU ${sku} already exists`, 409);
      }
    }

    await trx(TABLES.PRODUCT_VARIANTS).insert({
      product_id: productId,
      size: variant.size || null,
      color: variant.color || null,
      material: variant.material || null,
      additional_price:
        variant.additional_price !== undefined
          ? parseFloat(variant.additional_price)
          : 0,
      stock_quantity:
        variant.stock_quantity !== undefined
          ? parseInt(variant.stock_quantity, 10)
          : 0,
      sku,
    });

    const inserted = await trx(TABLES.PRODUCT_VARIANTS)
      .where({ product_id: productId, sku })
      .first();

    insertedVariants.push(inserted);
  }

  return insertedVariants;
}

async function updateVariants(trx, productId, variants) {
  const updatedVariants = [];

  for (const variant of variants) {
    if (!variant.variant_id) {
      continue;
    }

    const variantId = parseInt(variant.variant_id, 10);
    await ensureVariantBelongsToProduct(trx, productId, variantId);

    const updateData = {};

    if (variant.size !== undefined) {
      updateData.size = variant.size || null;
    }

    if (variant.color !== undefined) {
      updateData.color = variant.color || null;
    }

    if (variant.material !== undefined) {
      updateData.material = variant.material || null;
    }

    if (variant.additional_price !== undefined) {
      updateData.additional_price = parseFloat(variant.additional_price);
    }

    if (variant.stock_quantity !== undefined) {
      updateData.stock_quantity = parseInt(variant.stock_quantity, 10);
    }

    if (variant.sku !== undefined && variant.sku) {
      const trimmedSku = String(variant.sku).trim();
      const existingSku = await trx(TABLES.PRODUCT_VARIANTS)
        .where({ sku: trimmedSku })
        .whereNot({ variant_id: variantId })
        .first();

      if (existingSku) {
        throw new AppError(`Variant SKU ${trimmedSku} already exists`, 409);
      }

      updateData.sku = trimmedSku;
    }

    if (Object.keys(updateData).length > 0) {
      await trx(TABLES.PRODUCT_VARIANTS)
        .where({ variant_id: variantId })
        .update(updateData);
    }

    const updated = await trx(TABLES.PRODUCT_VARIANTS)
      .where({ variant_id: variantId })
      .first();

    updatedVariants.push(updated);
  }

  return updatedVariants;
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

  let listQuery = db(TABLES.PRODUCTS).select(
    'product_id',
    'product_name',
    'slug',
    'sku',
    'category_id',
    'brand_id',
    'short_description',
    'thumbnail',
    'price',
    'discount_price',
    'age_from',
    'age_to',
    'status',
    'created_at'
  );
  listQuery = applyListFilters(listQuery, filters);

  const products = await listQuery
    .orderBy('created_at', 'desc')
    .offset(offset)
    .limit(limit);

  return {
    products: products.map(mapProduct),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getProductById(productIdParam) {
  const productId = parseProductId(productIdParam);

  const record = await buildDetailQuery()
    .where('Products.product_id', productId)
    .first();

  if (!record) {
    throw new AppError('Product not found', 404);
  }

  const [images, variants] = await Promise.all([
    getProductImages(productId),
    getProductVariants(productId),
  ]);

  return {
    product: mapProduct(record),
    category: mapCategoryInfo(record),
    brand: mapBrandInfo(record),
    images,
    variants,
  };
}

async function createProduct(body, files = []) {
  const uploadedFiles = Array.isArray(files) ? files : [];
  const variants = parseVariantsInput(body.variants);
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

      if (variants.length > 0) {
        await insertVariants(trx, productId, variants);
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
  const variants = parseVariantsInput(body.variants);
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

  try {
    await db.transaction(async (trx) => {
      if (Object.keys(updateData).length > 0) {
        await trx(TABLES.PRODUCTS).where({ product_id: productId }).update(updateData);
      }

      if (uploadedFiles.length > 0) {
        const existingImageCountResult = await trx(TABLES.PRODUCT_IMAGES)
          .where({ product_id: productId })
          .count({ count: '*' });
        const hasExistingImages = Number(existingImageCountResult[0]?.count ?? 0) > 0;

        let imageMainIndex;

        if (body.main_image_index !== undefined) {
          imageMainIndex = mainImageIndex;
        } else if (!hasExistingImages) {
          imageMainIndex = 0;
        }

        const insertedImages = await insertProductImages(
          trx,
          productId,
          uploadedFiles,
          imageMainIndex
        );

        if (body.main_image_index !== undefined) {
          const selectedMainImage = insertedImages[mainImageIndex];
          await setMainImageForProduct(trx, productId, selectedMainImage.image_id);
        } else if (!hasExistingImages && insertedImages.length > 0) {
          await setMainImageForProduct(trx, productId, insertedImages[0].image_id);
        }
      }

      if (variants.length > 0) {
        await updateVariants(trx, productId, variants);
        await insertVariants(trx, productId, variants);
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

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
