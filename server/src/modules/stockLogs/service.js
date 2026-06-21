const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { generateReferenceCode } = require('./refCode');

const LOG_COLUMNS = [
  'StockLogs.log_id',
  'StockLogs.product_id',
  'StockLogs.variant_id',
  'StockLogs.old_quantity',
  'StockLogs.change_quantity',
  'StockLogs.new_quantity',
  'StockLogs.action_type',
  'StockLogs.reference_code',
  'StockLogs.note',
  'StockLogs.created_by',
  'StockLogs.created_at',
];

/**
 * Create stock log records inside a transaction.
 *
 * @param {object} trx - Knex transaction object
 * @param {object} params
 * @param {number} params.product_id
 * @param {number} params.variant_id
 * @param {number} params.old_quantity
 * @param {number} params.change_quantity
 * @param {number} params.new_quantity
 * @param {string} params.action_type
 * @param {string} params.reference_code
 * @param {string} [params.note]
 * @param {number} params.created_by
 */
async function createStockLog(trx, params) {
  const {
    product_id,
    variant_id,
    old_quantity,
    change_quantity,
    new_quantity,
    action_type,
    reference_code,
    note,
    created_by,
  } = params;

  await trx(TABLES.STOCK_LOGS).insert({
    product_id,
    variant_id,
    old_quantity,
    change_quantity,
    new_quantity,
    action_type,
    reference_code,
    note: note || null,
    created_by,
  });
}

/**
 * GET /api/v1/stock-logs
 * List stock logs with pagination, search, and filters.
 */
async function listStockLogs(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);
  const {
    search,
    action_type,
    product_id,
    variant_id,
    created_by,
    date_from,
    date_to,
  } = queryParams;

  let countQuery = db(TABLES.STOCK_LOGS)
    .join(TABLES.PRODUCTS, 'StockLogs.product_id', 'Products.product_id')
    .join(
      TABLES.PRODUCT_VARIANTS,
      'StockLogs.variant_id',
      'ProductVariants.variant_id'
    );

  let listQuery = db(TABLES.STOCK_LOGS)
    .join(TABLES.PRODUCTS, 'StockLogs.product_id', 'Products.product_id')
    .join(
      TABLES.PRODUCT_VARIANTS,
      'StockLogs.variant_id',
      'ProductVariants.variant_id'
    )
    .select(
      ...LOG_COLUMNS,
      'Products.product_name',
      'ProductVariants.sku as variant_sku'
    );

  if (search) {
    const searchPattern = `%${search}%`;
    const searchFilter = function (qb) {
      qb.where('Products.product_name', 'like', searchPattern)
        .orWhere('ProductVariants.sku', 'like', searchPattern)
        .orWhere('StockLogs.reference_code', 'like', searchPattern);
    };
    countQuery.where(searchFilter);
    listQuery.where(searchFilter);
  }

  if (action_type) {
    countQuery.where('StockLogs.action_type', action_type);
    listQuery.where('StockLogs.action_type', action_type);
  }

  if (product_id) {
    const pid = parseInt(product_id, 10);
    countQuery.where('StockLogs.product_id', pid);
    listQuery.where('StockLogs.product_id', pid);
  }

  if (variant_id) {
    const vid = parseInt(variant_id, 10);
    countQuery.where('StockLogs.variant_id', vid);
    listQuery.where('StockLogs.variant_id', vid);
  }

  if (created_by) {
    const cb = parseInt(created_by, 10);
    countQuery.where('StockLogs.created_by', cb);
    listQuery.where('StockLogs.created_by', cb);
  }

  if (date_from) {
    countQuery.where('StockLogs.created_at', '>=', new Date(date_from));
    listQuery.where('StockLogs.created_at', '>=', new Date(date_from));
  }

  if (date_to) {
    countQuery.where('StockLogs.created_at', '<=', new Date(date_to));
    listQuery.where('StockLogs.created_at', '<=', new Date(date_to));
  }

  const countResult = await countQuery.count({ total: 'StockLogs.log_id' });
  const total = Number(countResult[0]?.total ?? 0);

  const logs = await listQuery
    .orderBy('StockLogs.created_at', 'desc')
    .orderBy('StockLogs.log_id', 'desc')
    .offset(offset)
    .limit(limit);

  const rows = logs.map((row) => ({
    log_id: row.log_id,
    product_id: row.product_id,
    product_name: row.product_name,
    variant_id: row.variant_id,
    variant_sku: row.variant_sku,
    old_quantity: row.old_quantity,
    change_quantity: row.change_quantity,
    new_quantity: row.new_quantity,
    action_type: row.action_type,
    reference_code: row.reference_code,
    note: row.note ?? null,
    created_by: row.created_by,
    created_at: row.created_at,
  }));

  return {
    logs: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

/**
 * GET /api/v1/stock-logs/:logId
 * Return full log detail.
 */
async function getStockLogById(logId) {
  const log = await db(TABLES.STOCK_LOGS)
    .join(TABLES.PRODUCTS, 'StockLogs.product_id', 'Products.product_id')
    .join(
      TABLES.PRODUCT_VARIANTS,
      'StockLogs.variant_id',
      'ProductVariants.variant_id'
    )
    .select(
      ...LOG_COLUMNS,
      'Products.product_name',
      'ProductVariants.sku as variant_sku',
      'ProductVariants.size',
      'ProductVariants.color',
      'ProductVariants.material'
    )
    .where('StockLogs.log_id', logId)
    .first();

  if (!log) {
    throw new AppError('Stock log not found', 404);
  }

  return {
    log_id: log.log_id,
    product_id: log.product_id,
    product_name: log.product_name,
    variant_id: log.variant_id,
    variant_sku: log.variant_sku,
    variant_size: log.size ?? null,
    variant_color: log.color ?? null,
    variant_material: log.material ?? null,
    old_quantity: log.old_quantity,
    change_quantity: log.change_quantity,
    new_quantity: log.new_quantity,
    action_type: log.action_type,
    reference_code: log.reference_code,
    note: log.note ?? null,
    created_by: log.created_by,
    created_at: log.created_at,
  };
}

/**
 * GET /api/v1/stock-logs/reference/:referenceCode
 * Return all log records belonging to the same batch.
 */
async function getStockLogsByReference(referenceCode) {
  const logs = await db(TABLES.STOCK_LOGS)
    .join(TABLES.PRODUCTS, 'StockLogs.product_id', 'Products.product_id')
    .join(
      TABLES.PRODUCT_VARIANTS,
      'StockLogs.variant_id',
      'ProductVariants.variant_id'
    )
    .select(
      ...LOG_COLUMNS,
      'Products.product_name',
      'ProductVariants.sku as variant_sku'
    )
    .where('StockLogs.reference_code', referenceCode)
    .orderBy('StockLogs.variant_id', 'asc');

  if (logs.length === 0) {
    throw new AppError('No stock logs found for this reference code', 404);
  }

  return logs.map((log) => ({
    log_id: log.log_id,
    product_id: log.product_id,
    product_name: log.product_name,
    variant_id: log.variant_id,
    variant_sku: log.variant_sku,
    old_quantity: log.old_quantity,
    change_quantity: log.change_quantity,
    new_quantity: log.new_quantity,
    action_type: log.action_type,
    reference_code: log.reference_code,
    note: log.note ?? null,
    created_by: log.created_by,
    created_at: log.created_at,
  }));
}

/**
 * GET /api/v1/stock-logs/product/:productId
 * Return inventory history for a product, newest first.
 */
async function getStockLogsByProduct(productId) {
  const logs = await db(TABLES.STOCK_LOGS)
    .join(TABLES.PRODUCTS, 'StockLogs.product_id', 'Products.product_id')
    .join(
      TABLES.PRODUCT_VARIANTS,
      'StockLogs.variant_id',
      'ProductVariants.variant_id'
    )
    .select(
      ...LOG_COLUMNS,
      'Products.product_name',
      'ProductVariants.sku as variant_sku'
    )
    .where('StockLogs.product_id', productId)
    .orderBy('StockLogs.created_at', 'desc')
    .orderBy('StockLogs.log_id', 'desc');

  return logs.map((log) => ({
    log_id: log.log_id,
    product_id: log.product_id,
    product_name: log.product_name,
    variant_id: log.variant_id,
    variant_sku: log.variant_sku,
    old_quantity: log.old_quantity,
    change_quantity: log.change_quantity,
    new_quantity: log.new_quantity,
    action_type: log.action_type,
    reference_code: log.reference_code,
    note: log.note ?? null,
    created_by: log.created_by,
    created_at: log.created_at,
  }));
}

/**
 * GET /api/v1/stock-logs/variant/:variantId
 * Return inventory history for a variant, newest first.
 */
async function getStockLogsByVariant(variantId) {
  const logs = await db(TABLES.STOCK_LOGS)
    .join(TABLES.PRODUCTS, 'StockLogs.product_id', 'Products.product_id')
    .join(
      TABLES.PRODUCT_VARIANTS,
      'StockLogs.variant_id',
      'ProductVariants.variant_id'
    )
    .select(
      ...LOG_COLUMNS,
      'Products.product_name',
      'ProductVariants.sku as variant_sku'
    )
    .where('StockLogs.variant_id', variantId)
    .orderBy('StockLogs.created_at', 'desc')
    .orderBy('StockLogs.log_id', 'desc');

  return logs.map((log) => ({
    log_id: log.log_id,
    product_id: log.product_id,
    product_name: log.product_name,
    variant_id: log.variant_id,
    variant_sku: log.variant_sku,
    old_quantity: log.old_quantity,
    change_quantity: log.change_quantity,
    new_quantity: log.new_quantity,
    action_type: log.action_type,
    reference_code: log.reference_code,
    note: log.note ?? null,
    created_by: log.created_by,
    created_at: log.created_at,
  }));
}

/**
 * GET /api/v1/stock-logs/rollback-preview/:referenceCode
 * Preview rollback without modifying data.
 */
async function previewRollback(referenceCode) {
  const logs = await db(TABLES.STOCK_LOGS)
    .where({ reference_code: referenceCode })
    .orderBy('log_id', 'desc');

  if (logs.length === 0) {
    throw new AppError('No stock logs found for this reference code', 404);
  }

  const actionType = logs[0].action_type;
  if (actionType === 'ROLLBACK') {
    throw new AppError('Cannot rollback a rollback operation', 400);
  }

  const affectedVariants = [];
  for (const log of logs) {
    const variant = await db(TABLES.PRODUCT_VARIANTS)
      .where({ variant_id: log.variant_id })
      .first();

    affectedVariants.push({
      variant_id: log.variant_id,
      sku: variant ? variant.sku : 'Unknown',
      current_stock: variant ? Number(variant.stock_quantity) : 0,
      target_rollback_stock: log.old_quantity,
      log_old_quantity: log.old_quantity,
      log_change_quantity: log.change_quantity,
      log_new_quantity: log.new_quantity,
    });
  }

  return {
    reference_code: referenceCode,
    action_type: actionType,
    total_records: logs.length,
    affected_variants: affectedVariants,
  };
}

/**
 * POST /api/v1/stock-logs/rollback/:referenceCode
 * Rollback a previous stock operation inside a transaction.
 */
async function rollbackStock(referenceCode, userId) {
  const logs = await db(TABLES.STOCK_LOGS)
    .where({ reference_code: referenceCode })
    .orderBy('log_id', 'desc');

  if (logs.length === 0) {
    throw new AppError('No stock logs found for this reference code', 404);
  }

  const actionType = logs[0].action_type;
  if (actionType === 'ROLLBACK') {
    throw new AppError('Cannot rollback a rollback operation', 400);
  }

  const rollbackRefCode = await generateReferenceCode('ROLLBACK');

  await db.transaction(async (trx) => {
    for (const log of logs) {
      const variant = await trx(TABLES.PRODUCT_VARIANTS)
        .where({ variant_id: log.variant_id })
        .first();

      if (!variant) {
        throw new AppError(
          `Variant ${log.variant_id} no longer exists during rollback`,
          404
        );
      }

      const currentStock = Number(variant.stock_quantity);
      const targetStock = log.old_quantity;

      // Update variant stock back to old_quantity
      await trx(TABLES.PRODUCT_VARIANTS)
        .where({ variant_id: log.variant_id })
        .update({ stock_quantity: targetStock });

      // Create ROLLBACK log entry
      await trx(TABLES.STOCK_LOGS).insert({
        product_id: log.product_id,
        variant_id: log.variant_id,
        old_quantity: currentStock,
        change_quantity: targetStock - currentStock,
        new_quantity: targetStock,
        action_type: 'ROLLBACK',
        reference_code: rollbackRefCode,
        note: `Rollback from ${referenceCode}`,
        created_by: userId,
      });
    }
  });

  return {
    rollback_reference_code: rollbackRefCode,
    message: `Rollback completed for ${referenceCode}`,
  };
}

module.exports = {
  createStockLog,
  listStockLogs,
  getStockLogById,
  getStockLogsByReference,
  getStockLogsByProduct,
  getStockLogsByVariant,
  previewRollback,
  rollbackStock,
};