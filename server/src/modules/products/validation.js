const { body, param, query } = require('express-validator');

const productIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid product ID')
    .toInt(),
];

const listProductsQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('product_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Product name search must not exceed 255 characters'),
  query('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  query('brand_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Brand ID must be a positive integer'),
  query('age_from')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Age from must be a non-negative integer'),
  query('age_to')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Age to must be a non-negative integer'),
  query('min_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a non-negative number'),
  query('max_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a non-negative number'),
  query('status')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Status must be 0 (inactive) or 1 (active)'),
];

function validateVariantsJson(value) {
  if (value === undefined || value === null || value === '') {
    return true;
  }

  let parsed;

  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    throw new Error('Variants must be a valid JSON array');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Variants must be a JSON array');
  }

  parsed.forEach((variant, index) => {
    if (!variant || typeof variant !== 'object') {
      throw new Error(`Variant at index ${index} must be an object`);
    }

    if (variant.variant_id !== undefined) {
      const variantId = parseInt(variant.variant_id, 10);

      if (Number.isNaN(variantId) || variantId < 1) {
        throw new Error(`Variant at index ${index} has an invalid variant_id`);
      }
    }

    if (
      variant.stock_quantity !== undefined &&
      (Number.isNaN(parseInt(variant.stock_quantity, 10)) ||
        parseInt(variant.stock_quantity, 10) < 0)
    ) {
      throw new Error(`Variant at index ${index} has an invalid stock_quantity`);
    }

    if (
      variant.additional_price !== undefined &&
      Number.isNaN(parseFloat(variant.additional_price))
    ) {
      throw new Error(`Variant at index ${index} has an invalid additional_price`);
    }
  });

  return true;
}

const createProductValidation = [
  body('product_name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 255 })
    .withMessage('Product name must not exceed 255 characters'),
  body('category_id')
    .notEmpty()
    .withMessage('Category ID is required')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('brand_id')
    .notEmpty()
    .withMessage('Brand ID is required')
    .isInt({ min: 1 })
    .withMessage('Brand ID must be a positive integer'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('discount_price')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a non-negative number'),
  body('short_description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description must not exceed 500 characters'),
  body('description')
    .optional({ values: 'null' })
    .trim(),
  body('weight')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Weight must be a non-negative number'),
  body('age_from')
    .optional({ values: 'null' })
    .isInt({ min: 0 })
    .withMessage('Age from must be a non-negative integer'),
  body('age_to')
    .optional({ values: 'null' })
    .isInt({ min: 0 })
    .withMessage('Age to must be a non-negative integer'),
  body('status')
    .optional()
    .isIn([0, 1, '0', '1'])
    .withMessage('Status must be 0 or 1'),
  body('variants').optional().custom(validateVariantsJson),
  body('main_image_index')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Main image index must be a non-negative integer'),
  body().custom((_, { req }) => {
    const files = req.files || [];

    if (files.length > 10) {
      throw new Error('A maximum of 10 images is allowed');
    }

    if (req.body.main_image_index !== undefined && files.length === 0) {
      throw new Error('Main image index requires at least one uploaded image');
    }

    const mainIndex = parseInt(req.body.main_image_index, 10);

    if (
      req.body.main_image_index !== undefined &&
      !Number.isNaN(mainIndex) &&
      mainIndex >= files.length
    ) {
      throw new Error('Main image index is out of range');
    }

    return true;
  }),
];

const updateProductValidation = [
  ...productIdParamValidation,
  body('product_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Product name must not exceed 255 characters'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('brand_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Brand ID must be a positive integer'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('discount_price')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a non-negative number'),
  body('short_description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description must not exceed 500 characters'),
  body('description')
    .optional({ values: 'null' })
    .trim(),
  body('weight')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Weight must be a non-negative number'),
  body('age_from')
    .optional({ values: 'null' })
    .isInt({ min: 0 })
    .withMessage('Age from must be a non-negative integer'),
  body('age_to')
    .optional({ values: 'null' })
    .isInt({ min: 0 })
    .withMessage('Age to must be a non-negative integer'),
  body('status')
    .optional()
    .isIn([0, 1, '0', '1'])
    .withMessage('Status must be 0 or 1'),
  body('variants').optional().custom(validateVariantsJson),
  body('main_image_index')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Main image index must be a non-negative integer'),
  body().custom((_, { req }) => {
    const files = req.files || [];
    const productFields = [
      'product_name',
      'category_id',
      'brand_id',
      'price',
      'discount_price',
      'short_description',
      'description',
      'weight',
      'age_from',
      'age_to',
      'status',
    ];

    const hasProductField = productFields.some(
      (field) => req.body[field] !== undefined
    );
    const hasVariants =
      req.body.variants !== undefined &&
      req.body.variants !== null &&
      req.body.variants !== '';
    const hasImages = files.length > 0;

    if (!hasProductField && !hasVariants && !hasImages) {
      throw new Error(
        'At least one product field, variants payload, or image upload is required'
      );
    }

    if (files.length > 10) {
      throw new Error('A maximum of 10 images is allowed per request');
    }

    if (req.body.main_image_index !== undefined && !hasImages) {
      throw new Error('Main image index requires at least one uploaded image');
    }

    const mainIndex = parseInt(req.body.main_image_index, 10);

    if (
      req.body.main_image_index !== undefined &&
      !Number.isNaN(mainIndex) &&
      mainIndex >= files.length
    ) {
      throw new Error('Main image index is out of range for uploaded images');
    }

    return true;
  }),
];

module.exports = {
  productIdParamValidation,
  listProductsQueryValidation,
  createProductValidation,
  updateProductValidation,
};
