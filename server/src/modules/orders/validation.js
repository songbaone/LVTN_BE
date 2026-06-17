const { body, param, query } = require('express-validator');

const PAYMENT_METHOD = {
  COD: 'COD',
  VNPAY: 'VNPAY'
};

const orderIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid order ID')
    .toInt(),
];

const checkoutValidation = [
  body('address_id')
    .isInt({ min: 1 })
    .withMessage('Address ID is required and must be a positive integer')
    .toInt(),
  body('coupon_code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Coupon code must not exceed 50 characters'),
  body('payment_method')
    .notEmpty()
    .isIn(['COD', 'VNPAY'])
    .withMessage('Payment method must be COD or VNPAY'),
];

const listOrdersQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['Pending', 'Confirmed', 'Shipping', 'Delivered', 'Cancelled'])
    .withMessage('Invalid order status'),
];

const ORDER_STATUS_VALUES = ['Pending', 'Confirmed', 'Shipping', 'Delivered', 'Cancelled'];
const PAYMENT_STATUS_VALUES = ['Pending', 'Paid', 'Failed', 'Refunded'];
const PAYMENT_METHOD_VALUES = ['COD', 'VNPAY'];

const adminListOrdersQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('order_code')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Order code cannot be empty'),
  query('order_status')
    .optional()
    .isIn(ORDER_STATUS_VALUES)
    .withMessage('Invalid order status'),
  query('payment_status')
    .optional()
    .isIn(PAYMENT_STATUS_VALUES)
    .withMessage('Invalid payment status'),
  query('payment_method')
    .optional()
    .isIn(PAYMENT_METHOD_VALUES)
    .withMessage('Invalid payment method'),
];

const updateOrderStatusValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid order ID')
    .toInt(),
  body('status')
    .notEmpty()
    .isIn(ORDER_STATUS_VALUES)
    .withMessage('Invalid order status provided'),
];

module.exports = {
  orderIdParamValidation,
  checkoutValidation,
  listOrdersQueryValidation,
  adminListOrdersQueryValidation,
  updateOrderStatusValidation,
};
