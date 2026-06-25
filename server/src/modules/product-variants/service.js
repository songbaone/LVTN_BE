const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');

const VARIANT_COLUMNS = [
  'variant_id',
  'product_id',
  'size',
  'color',
  'material',
  'additional_price',
  'stock_quantity',
  'sku',
  'created_at',
  'updated_at',
];

function mapVariant(record) {
  if (!record) {
    return null;
  }

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

function parseVariantId(variantId) {
  const id = parseInt(variantId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid variant ID', 400);
  }

  return id;
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

async function ensureVariantExists(variantId, trx = db) {
  const variant = await trx(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id: variantId })
    .first();

  if (!variant) {
    throw new AppError('Variant not found', 404);
  }

  return variant;
}

async function ensureSkuUnique({
  sku,
  excludeVariantId = null,
  trx = db,
}) {
  console.log('sku param:', sku);

  let query = trx(TABLES.PRODUCT_VARIANTS)
    .where({ sku });

  if (excludeVariantId !== null) {
    query = query.whereNot('variant_id', excludeVariantId);
  }

  console.log(query.toSQL());

  const existing = await query.first();

  if (existing) {
    throw new AppError('SKU already exists', 409);
  }
}

async function getAllVariants(queryParams) {
  const { page, limit, offset } = getPagination(queryParams, { maxLimit: 1000 });
  const { size, color, material, min_price, max_price, min_stock, max_stock, sku, product_id, search } = queryParams;

  // Build count query for total
  let countQuery = db(TABLES.PRODUCT_VARIANTS);

  if (size) {
    countQuery.where('size', 'like', `%${size}%`);
  }

  if (color) {
    countQuery.where('color', 'like', `%${color}%`);
  }

  if (material) {
    countQuery.where('material', 'like', `%${material}%`);
  }

  if (min_price) {
    countQuery.where('additional_price', '>=', parseFloat(min_price));
  }

  if (max_price) {
    countQuery.where('additional_price', '<=', parseFloat(max_price));
  }

  if (min_stock) {
    countQuery.where('stock_quantity', '>=', parseInt(min_stock, 10));
  }

  if (max_stock) {
    countQuery.where('stock_quantity', '<=', parseInt(max_stock, 10));
  }

  if (sku) {
    countQuery.where('sku', 'like', `%${sku}%`);
  }

  if (product_id) {
    countQuery.where('product_id', parseInt(product_id, 10));
  }

  if (search) {
    countQuery.where(function () {
      this.where('sku', 'like', `%${search}%`)
        .orWhere('size', 'like', `%${search}%`)
        .orWhere('color', 'like', `%${search}%`)
        .orWhere('material', 'like', `%${search}%`);
    });
  }

  const countResult = await countQuery.count({ total: 'variant_id' });
  const total = Number(countResult[0]?.total ?? 0);

  // Build data query
  let dataQuery = db(TABLES.PRODUCT_VARIANTS).select(VARIANT_COLUMNS);

  if (size) {
    dataQuery.where('size', 'like', `%${size}%`);
  }

  if (color) {
    dataQuery.where('color', 'like', `%${color}%`);
  }

  if (material) {
    dataQuery.where('material', 'like', `%${material}%`);
  }

  if (min_price) {
    dataQuery.where('additional_price', '>=', parseFloat(min_price));
  }

  if (max_price) {
    dataQuery.where('additional_price', '<=', parseFloat(max_price));
  }

  if (min_stock) {
    dataQuery.where('stock_quantity', '>=', parseInt(min_stock, 10));
  }

  if (max_stock) {
    dataQuery.where('stock_quantity', '<=', parseInt(max_stock, 10));
  }

  if (sku) {
    dataQuery.where('sku', 'like', `%${sku}%`);
  }

  if (product_id) {
    dataQuery.where('product_id', parseInt(product_id, 10));
  }

  if (search) {
    dataQuery.where(function () {
      this.where('sku', 'like', `%${search}%`)
        .orWhere('size', 'like', `%${search}%`)
        .orWhere('color', 'like', `%${search}%`)
        .orWhere('material', 'like', `%${search}%`);
    });
  }

  const variants = await dataQuery
    .orderBy('variant_id', 'asc')
    .offset(offset)
    .limit(limit);

  return {
    variants: variants.map(mapVariant),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function createVariant(productId, body) {
  return db.transaction(async (trx) => {
    const productIdNum = parseInt(productId, 10);

    await ensureProductExists(productIdNum, trx);
    await ensureSkuUnique({ sku: body.sku, trx });

    const insertData = {
      product_id: productIdNum,
      size: body.size || null,
      color: body.color || null,
      material: body.material || null,
      additional_price: Number(body.additional_price || 0),
      stock_quantity: Number(body.stock_quantity || 0),
      sku: body.sku,
      created_at: new Date(),
      updated_at: new Date(),
      status: 1
    };

    await trx(TABLES.PRODUCT_VARIANTS)
      .insert(insertData);

    const variant = await trx(TABLES.PRODUCT_VARIANTS)
      .where({ sku: insertData.sku })
      .first();

    return mapVariant(variant);
  });
}

async function getProductVariants(productId) {
  const productIdNum = parseInt(productId, 10);
  await ensureProductExists(productIdNum);

  const variants = await db(TABLES.PRODUCT_VARIANTS)
    .select(VARIANT_COLUMNS)
    .where({ product_id: productIdNum })
    .orderBy('variant_id', 'asc');

  return variants.map(mapVariant);
}

async function getVariantById(variantId) {
  const variantIdNum = parseVariantId(variantId);
  const variant = await ensureVariantExists(variantIdNum);

  return mapVariant(variant);
}

async function updateVariant(variantId, body) {
  const variantIdNum = parseVariantId(variantId);
  await ensureVariantExists(variantIdNum);

  const updateData = {};

  if (body.size !== undefined) {
    updateData.size = body.size || null;
  }

  if (body.color !== undefined) {
    updateData.color = body.color || null;
  }

  if (body.material !== undefined) {
    updateData.material = body.material || null;
  }

  if (body.additional_price !== undefined) {
    updateData.additional_price =
      body.additional_price === null || body.additional_price === ''
        ? 0
        : parseFloat(body.additional_price);
  }

  if (body.stock_quantity !== undefined) {
    updateData.stock_quantity =
      body.stock_quantity === null || body.stock_quantity === ''
        ? 0
        : parseInt(body.stock_quantity, 10);
  }

  if (body.sku !== undefined) {
    await ensureSkuUnique({ sku: body.sku, excludeVariantId: variantIdNum });
    updateData.sku = body.sku;
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = new Date();
    await db(TABLES.PRODUCT_VARIANTS)
      .where({ variant_id: variantIdNum })
      .update(updateData);
  }

  const variant = await db(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id: variantIdNum })
    .first();

  return mapVariant(variant);
}

async function deleteVariant(variantId) {
  const variantIdNum = parseVariantId(variantId);
  const variant = await ensureVariantExists(variantIdNum);

  // Check if variant is referenced by order details
  const orderRef = await db(TABLES.ORDER_DETAILS)
    .where({ variant_id: variantIdNum })
    .first();

  if (orderRef) {
    throw new AppError(
      'Cannot delete variant because it is referenced by order details',
      409
    );
  }

  // Check if variant is referenced by inventory transactions (stock logs)
  const inventoryRef = await db(TABLES.STOCK_LOGS)
    .where({ variant_id: variantIdNum })
    .first();

  if (inventoryRef) {
    throw new AppError(
      'Cannot delete variant because it is referenced by inventory transactions',
      409
    );
  }

  await db(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id: variantIdNum })
    .del();

  return { variant_id: variantIdNum, sku: variant.sku };
}


async function softDeleteVariant(variantId) {
  const variantIdNum = parseVariantId(variantId);
  const variant = await ensureVariantExists(variantIdNum);

  // Check if variant is referenced by order details
  const orderRef = await db(TABLES.ORDER_DETAILS)
    .where({ variant_id: variantIdNum })
    .first();

  if (orderRef) {
    throw new AppError(
      'Cannot soft delete variant because it is referenced by order details',
      409
    );
  }

  // Check if variant is referenced by inventory transactions (stock logs)
  const inventoryRef = await db(TABLES.STOCK_LOGS)
    .where({ variant_id: variantIdNum })
    .first();

  if (inventoryRef) {
    throw new AppError(
      'Cannot soft delete variant because it is referenced by inventory transactions',
      409
    );
  }

  await db(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id: variantIdNum })
    .update({ status: 0, updated_at: new Date() });

  return { variant_id: variantIdNum, sku: variant.sku };
}

module.exports = {
  createVariant,
  getProductVariants,
  getVariantById,
  updateVariant,
  deleteVariant,
  softDeleteVariant,
  getAllVariants
};