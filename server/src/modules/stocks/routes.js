const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { uploadExcelFile } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  listStocksQueryValidation,
  stockImportValidation,
  stockAdjustValidation,
  updateVariantStockValidation,
  lowStockQueryValidation,
  productIdParamValidation,
} = require('./validation');

const router = express.Router();

// All routes require authentication + admin/staff role
router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.STAFF));

// Stock Dashboard
router.get('/dashboard', controller.getDashboard);

// Low Stock
router.get('/low-stock', lowStockQueryValidation, validate, controller.getLowStock);

// Out of Stock
router.get('/out-of-stock', controller.getOutOfStock);

// Export Template
router.get('/export-template', controller.exportTemplate);

// Export Report
router.get('/export-report', controller.exportReport);

// Preview Excel Import
router.post(
  '/preview-import',
  uploadExcelFile,
  controller.previewImport
);

// Import Excel Stock
router.post(
  '/import-excel',
  uploadExcelFile,
  controller.importExcel
);

// Stock Import (manual JSON)
router.post('/import', stockImportValidation, validate, controller.importStock);

// Stock Adjustment
router.post('/adjust', stockAdjustValidation, validate, controller.adjustStock);

// Update Single Variant Stock
router.patch(
  '/:variantId',
  updateVariantStockValidation,
  validate,
  controller.updateVariantStock
);

// Product Stock Detail
router.get(
  '/:productId',
  productIdParamValidation,
  validate,
  controller.getProductStock
);

// Stock List (must be last to avoid param conflict)
router.get('/', listStocksQueryValidation, validate, controller.listStocks);

module.exports = router;