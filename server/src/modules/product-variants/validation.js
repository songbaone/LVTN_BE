const { body, param, query } = require('express-validator');

const productIdParamValidation = [
  param('productId')
    .isInt({ min: 1 })
    .withMessage('Invalid product ID')
    .toInt(),
];

const variantIdParamValidation = [
  param('variantId')
    .isInt({ min: 1 })
    .withMessage('Invalid variant ID')
    .toInt(),
];

const listVariantsQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('size')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Size search must not exceed 50 characters'),
  query('color')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Color search must not exceed 50 characters'),
  query('material')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Material search must not exceed 100 characters'),
  query('min_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a non-negative number'),
  query('max_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a non-negative number'),
  query('min_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock quantity must be a non-negative integer'),
  query('max_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum stock quantity must be a non-negative integer'),
  query('sku')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('SKU search must not exceed 100 characters'),
  query('product_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search must not exceed 255 characters'),
];

const createVariantValidation = [
  ...productIdParamValidation,
  body('size')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Size must not exceed 50 characters'),
  body('color')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Color must not exceed 50 characters'),
  body('material')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Material must not exceed 100 characters'),
  body('additional_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Additional price must be a non-negative number'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ max: 100 })
    .withMessage('SKU must not exceed 100 characters'),
];

const updateVariantValidation = [
  ...variantIdParamValidation,
  body('size')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Size must not exceed 50 characters'),
  body('color')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Color must not exceed 50 characters'),
  body('material')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Material must not exceed 100 characters'),
  body('additional_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Additional price must be a non-negative number'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('sku')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('SKU cannot be empty')
    .isLength({ max: 100 })
    .withMessage('SKU must not exceed 100 characters'),
  body().custom((_, { req }) => {
    const variantFields = [
      'size',
      'color',
      'material',
      'additional_price',
      'stock_quantity',
      'sku',
    ];

    const hasField = variantFields.some(
      (field) => req.body[field] !== undefined
    );

    if (!hasField) {
      throw new Error('At least one variant field is required for update');
    }

    return true;
  }),
];

module.exports = {
  productIdParamValidation,
  variantIdParamValidation,
  createVariantValidation,
  updateVariantValidation,
  listVariantsQueryValidation
};