const stockLogService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function listStockLogs(req, res, next) {
  try {
    const result = await stockLogService.listStockLogs(req.query);
    return sendSuccess(res, 'Stock logs retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getStockLogById(req, res, next) {
  try {
    const result = await stockLogService.getStockLogById(
      parseInt(req.params.logId, 10)
    );
    return sendSuccess(res, 'Stock log retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getStockLogsByReference(req, res, next) {
  try {
    const result = await stockLogService.getStockLogsByReference(
      req.params.referenceCode
    );
    return sendSuccess(res, 'Stock logs retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getStockLogsByProduct(req, res, next) {
  try {
    const result = await stockLogService.getStockLogsByProduct(
      parseInt(req.params.productId, 10)
    );
    return sendSuccess(res, 'Product stock history retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getStockLogsByVariant(req, res, next) {
  try {
    const result = await stockLogService.getStockLogsByVariant(
      parseInt(req.params.variantId, 10)
    );
    return sendSuccess(res, 'Variant stock history retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function previewRollback(req, res, next) {
  try {
    const result = await stockLogService.previewRollback(
      req.params.referenceCode
    );
    return sendSuccess(res, 'Rollback preview generated', result);
  } catch (error) {
    return next(error);
  }
}

async function rollbackStock(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await stockLogService.rollbackStock(
      req.params.referenceCode,
      userId
    );
    return sendSuccess(res, 'Stock rollback completed', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listStockLogs,
  getStockLogById,
  getStockLogsByReference,
  getStockLogsByProduct,
  getStockLogsByVariant,
  previewRollback,
  rollbackStock,
};