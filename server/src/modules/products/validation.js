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
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
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
  body('main_image_index')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Main image index must be a non-negative integer'),
  body('delete_image_ids')
    .optional({ values: 'null' })
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    })
    .isArray({ min: 1 })
    .withMessage('delete_image_ids must be a non-empty array'),
  body('delete_image_ids.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each delete_image_ids value must be a positive integer'),
  body('main_image_id')
    .optional({ values: 'null' })
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? value : parsed;
      }
      return value;
    })
    .isInt({ min: 1 })
    .withMessage('main_image_id must be a positive integer'),
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
    const hasImages = files.length > 0;
    const hasDeleteImageIds =
      req.body.delete_image_ids !== undefined &&
      req.body.delete_image_ids !== null;
    const hasMainImageId =
      req.body.main_image_id !== undefined &&
      req.body.main_image_id !== null;

    if (!hasProductField && !hasImages && !hasDeleteImageIds && !hasMainImageId) {
      throw new Error(
        'At least one product field, image upload, delete_image_ids, or main_image_id is required'
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