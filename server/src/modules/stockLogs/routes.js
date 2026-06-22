const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  listStockLogsValidation,
  logIdParamValidation,
  referenceCodeParamValidation,
  productIdParamValidation,
  variantIdParamValidation,
} = require('./validation');

const router = express.Router();

// All routes require authentication + admin/staff role
router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.STAFF));

// Preview rollback (must be before /:logId to avoid param conflict)
router.get(
  '/rollback-preview/:referenceCode',
  referenceCodeParamValidation,
  validate,
  controller.previewRollback
);

// Rollback stock operation
router.post(
  '/rollback/:referenceCode',
  referenceCodeParamValidation,
  validate,
  controller.rollbackStock
);

// List stock logs with filters
router.get('/', listStockLogsValidation, validate, controller.listStockLogs);

// Get logs by reference code (must be before /:logId)
router.get(
  '/reference/:referenceCode',
  referenceCodeParamValidation,
  validate,
  controller.getStockLogsByReference
);

// Get logs by product (must be before /:logId)
router.get(
  '/product/:productId',
  productIdParamValidation,
  validate,
  controller.getStockLogsByProduct
);

// Get logs by variant (must be before /:logId)
router.get(
  '/variant/:variantId',
  variantIdParamValidation,
  validate,
  controller.getStockLogsByVariant
);

// Get single log by ID
router.get('/:logId', logIdParamValidation, validate, controller.getStockLogById);

module.exports = router;