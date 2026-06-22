const { param, query, body } = require('express-validator');

const listStockLogsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search must not exceed 255 characters'),
  query('action_type')
    .optional()
    .trim()
    .isIn(['MANUAL_IMPORT', 'EXCEL_IMPORT', 'ADJUST', 'ROLLBACK'])
    .withMessage('Invalid action type'),
  query('product_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  query('variant_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Variant ID must be a positive integer'),
  query('created_by')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Created by must be a positive integer'),
  query('date_from')
    .optional()
    .trim()
    .isISO8601()
    .withMessage('Date from must be a valid ISO 8601 date'),
  query('date_to')
    .optional()
    .trim()
    .isISO8601()
    .withMessage('Date to must be a valid ISO 8601 date'),
];

const logIdParamValidation = [
  param('logId')
    .isInt({ min: 1 })
    .withMessage('Log ID must be a positive integer'),
];

const referenceCodeParamValidation = [
  param('referenceCode')
    .trim()
    .notEmpty()
    .withMessage('Reference code is required'),
];

const productIdParamValidation = [
  param('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
];

const variantIdParamValidation = [
  param('variantId')
    .isInt({ min: 1 })
    .withMessage('Variant ID must be a positive integer'),
];

const rollbackValidation = [
  param('referenceCode')
    .trim()
    .notEmpty()
    .withMessage('Reference code is required'),
];

module.exports = {
  listStockLogsValidation,
  logIdParamValidation,
  referenceCodeParamValidation,
  productIdParamValidation,
  variantIdParamValidation,
  rollbackValidation,
};