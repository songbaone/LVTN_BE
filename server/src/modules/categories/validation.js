const { body, param, query } = require('express-validator');
const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');

const categoryIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid category ID')
    .toInt(),
];

const listCategoriesQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('category_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category name search must not exceed 100 characters'),
  query('status')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Status must be 0 (inactive) or 1 (active)'),
];

const treeQueryValidation = [
  query('status')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Status must be 0 (inactive) or 1 (active)'),
];

const createCategoryValidation = [
  body('category_name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 100 })
    .withMessage('Category name must not exceed 100 characters')
    .custom(async (categoryName) => {
      const existing = await db(TABLES.CATEGORIES)
        .where({ category_name: categoryName })
        .first();

      if (existing) {
        throw new Error('Category name already exists');
      }

      return true;
    }),
  body('parent_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a positive integer'),
  body('description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('image_url')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Image URL must not exceed 255 characters'),
  body('status')
    .optional()
    .isIn([0, 1, '0', '1'])
    .withMessage('Status must be 0 or 1'),
];

const updateCategoryValidation = [
  ...categoryIdParamValidation,
  body('category_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Category name must not exceed 100 characters'),
  body('parent_id')
    .optional({ values: 'null' })
    .custom((value) => {
      if (value === null || value === '') {
        return true;
      }

      const parsed = parseInt(value, 10);

      if (Number.isNaN(parsed) || parsed < 1) {
        throw new Error('Parent ID must be a positive integer or null');
      }

      return true;
    }),
  body('description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('image_url')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Image URL must not exceed 255 characters'),
  body('status')
    .optional()
    .isIn([0, 1, '0', '1'])
    .withMessage('Status must be 0 or 1'),
  body().custom((_, { req }) => {
    const { category_name, parent_id, description, image_url, status } = req.body;

    if (
      category_name === undefined &&
      parent_id === undefined &&
      description === undefined &&
      image_url === undefined &&
      status === undefined
    ) {
      throw new Error('At least one field must be provided to update');
    }

    return true;
  }),
];

module.exports = {
  categoryIdParamValidation,
  listCategoriesQueryValidation,
  treeQueryValidation,
  createCategoryValidation,
  updateCategoryValidation,
};
