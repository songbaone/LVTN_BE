const { body, param, query } = require('express-validator');
const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');

const reviewIdParamValidation = [
  param('reviewId')
    .isInt({ min: 1 })
    .withMessage('Invalid review ID')
    .toInt(),
];

const productIdParamValidation = [
  param('productId')
    .isInt({ min: 1 })
    .withMessage('Invalid product ID')
    .toInt(),
];

const createReviewValidation = [
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('Product ID is required and must be a positive integer')
    .toInt()
    .custom(async (productId) => {
      const product = await db(TABLES.PRODUCTS)
        .where({ product_id: productId })
        .first();

      if (!product) {
        throw new Error('Product not found');
      }

      return true;
    }),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
    .toInt(),
  body('comment')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

const updateReviewValidation = [
  ...reviewIdParamValidation,
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
    .toInt(),
  body('comment')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  body().custom((_, { req }) => {
    if (req.body.rating === undefined && req.body.comment === undefined) {
      throw new Error('At least rating or comment must be provided to update');
    }

    return true;
  }),
];

const listReviewsQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
];

const adminListReviewsQueryValidation = [
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
  query('product_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
];

module.exports = {
  reviewIdParamValidation,
  productIdParamValidation,
  createReviewValidation,
  updateReviewValidation,
  listReviewsQueryValidation,
  adminListReviewsQueryValidation,
};