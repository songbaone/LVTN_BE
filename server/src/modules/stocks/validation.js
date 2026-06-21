const { body, param, query } = require('express-validator');

const listStocksQueryValidation = [
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
  query('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  query('brand_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Brand ID must be a positive integer'),
];

const stockImportValidation = [
  body('product_id')
    .notEmpty()
    .withMessage('Product ID is required')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  body('variants')
    .isArray({ min: 1 })
    .withMessage('Variants must be a non-empty array'),
  body('variants.*.variant_id')
    .isInt({ min: 1 })
    .withMessage('Each variant_id must be a positive integer'),
  body('variants.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each quantity must be a positive integer'),
];

const stockAdjustValidation = [
  body('variant_id')
    .notEmpty()
    .withMessage('Variant ID is required')
    .isInt({ min: 1 })
    .withMessage('Variant ID must be a positive integer'),
  body('stock_quantity')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
];

const updateVariantStockValidation = [
  param('variantId')
    .isInt({ min: 1 })
    .withMessage('Variant ID must be a positive integer'),
  body('stock_quantity')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
];

const lowStockQueryValidation = [
  query('threshold')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Threshold must be a positive integer'),
];

const productIdParamValidation = [
  param('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
];

module.exports = {
  listStocksQueryValidation,
  stockImportValidation,
  stockAdjustValidation,
  updateVariantStockValidation,
  lowStockQueryValidation,
  productIdParamValidation,
};