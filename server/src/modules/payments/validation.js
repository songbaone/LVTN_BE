const { body, param, query } = require('express-validator');

const paymentIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid payment ID')
    .toInt(),
];

const listPaymentsQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('payment_status')
    .optional()
    .isIn(['Pending', 'Paid', 'Failed', 'Refunded'])
    .withMessage('Invalid payment status'),
  query('order_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer')
    .toInt(),
];

const updatePaymentStatusValidation = [
  ...paymentIdParamValidation,
  body('payment_status')
    .trim()
    .notEmpty()
    .withMessage('Payment status is required')
    .isIn(['Pending', 'Paid', 'Failed', 'Refunded'])
    .withMessage('Payment status must be Pending, Paid, Failed, or Refunded'),
];

module.exports = {
  paymentIdParamValidation,
  listPaymentsQueryValidation,
  updatePaymentStatusValidation,
};
