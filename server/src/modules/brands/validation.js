const { body, param, query } = require('express-validator');
const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');

const brandIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid brand ID')
    .toInt(),
];

const listBrandsQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('brand_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand name search must not exceed 100 characters'),
  query('status')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Status must be 0 (inactive) or 1 (active)'),
];

const createBrandValidation = [
  body('brand_name')
    .trim()
    .notEmpty()
    .withMessage('Brand name is required')
    .isLength({ max: 100 })
    .withMessage('Brand name must not exceed 100 characters')
    .custom(async (brandName) => {
      const existing = await db(TABLES.BRANDS)
        .where({ brand_name: brandName })
        .first();

      if (existing) {
        throw new Error('Brand name already exists');
      }

      return true;
    }),
  body('country')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),
  body('description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('status')
    .optional()
    .isIn([0, 1, '0', '1'])
    .withMessage('Status must be 0 or 1'),
];

const updateBrandValidation = [
  ...brandIdParamValidation,
  body('brand_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Brand name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Brand name must not exceed 100 characters'),
  body('country')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),
  body('description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('status')
    .optional()
    .isIn([0, 1, '0', '1'])
    .withMessage('Status must be 0 or 1'),
  body().custom((_, { req }) => {
    const { brand_name, country, description, status } = req.body;

    if (
      brand_name === undefined &&
      country === undefined &&
      description === undefined &&
      status === undefined &&
      !req.file
    ) {
      throw new Error('At least one field or logo must be provided to update');
    }

    return true;
  }),
];

module.exports = {
  brandIdParamValidation,
  listBrandsQueryValidation,
  createBrandValidation,
  updateBrandValidation,
};
