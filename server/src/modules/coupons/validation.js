const { body, param, query } = require('express-validator');
const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');

const couponIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid coupon ID')
    .toInt(),
];

const listCouponsQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('coupon_code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Coupon code search must not exceed 50 characters'),
  query('status')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Status must be 0 (inactive) or 1 (active)'),
];

const createCouponValidation = [
  body('coupon_code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ max: 50 })
    .withMessage('Coupon code must not exceed 50 characters')
    .custom(async (couponCode) => {
      const existing = await db(TABLES.COUPONS)
        .where({ coupon_code: couponCode })
        .first();

      if (existing) {
        throw new Error('Coupon code already exists');
      }

      return true;
    }),
  body('coupon_name')
    .trim()
    .notEmpty()
    .withMessage('Coupon name is required')
    .isLength({ max: 100 })
    .withMessage('Coupon name must not exceed 100 characters'),
  body('discount_type')
    .trim()
    .notEmpty()
    .withMessage('Discount type is required')
    .isIn(['PERCENT', 'FIXED', 'percent', 'fixed'])
    .withMessage('Discount type must be PERCENT or FIXED'),
  body('discount_value')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  body('min_order_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order value must be a positive number'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('status')
    .optional()
    .isIn([0, 1, '0', '1'])
    .withMessage('Status must be 0 or 1'),
];

const updateCouponValidation = [
  ...couponIdParamValidation,
  body('coupon_code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Coupon code cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Coupon code must not exceed 50 characters'),
  body('coupon_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Coupon name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Coupon name must not exceed 100 characters'),
  body('discount_type')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Discount type cannot be empty')
    .isIn(['PERCENT', 'FIXED', 'percent', 'fixed'])
    .withMessage('Discount type must be PERCENT or FIXED'),
  body('discount_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  body('min_order_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order value must be a positive number'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('status')
    .optional()
    .isIn([0, 1, '0', '1'])
    .withMessage('Status must be 0 or 1'),
  body().custom((_, { req }) => {
    const fields = [
      'coupon_code',
      'coupon_name',
      'discount_type',
      'discount_value',
      'min_order_value',
      'start_date',
      'end_date',
      'quantity',
      'status',
    ];

    const hasField = fields.some((field) => req.body[field] !== undefined);

    if (!hasField) {
      throw new Error('At least one field must be provided to update');
    }

    return true;
  }),
];

const validateCouponValidation = [
  body('coupon_code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ max: 50 })
    .withMessage('Coupon code must not exceed 50 characters'),
  body('order_amount')
    .isFloat({ min: 0 })
    .withMessage('Order amount must be a positive number'),
];

const applyCouponValidation = [
  ...validateCouponValidation,
];

module.exports = {
  couponIdParamValidation,
  listCouponsQueryValidation,
  createCouponValidation,
  updateCouponValidation,
  validateCouponValidation,
  applyCouponValidation,
};
