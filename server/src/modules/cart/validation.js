const { body, param } = require('express-validator');

const itemIdParamValidation = [
  param('itemId')
    .isInt({ min: 1 })
    .withMessage('Invalid cart item ID')
    .toInt(),
];

const addItemValidation = [
  body('variant_id')
    .isInt({ min: 1 })
    .withMessage('Variant ID is required and must be a positive integer')
    .toInt(),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity is required and must be at least 1')
    .toInt(),
];

const updateItemValidation = [
  ...itemIdParamValidation,
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity is required and must be at least 1')
    .toInt(),
];

module.exports = {
  itemIdParamValidation,
  addItemValidation,
  updateItemValidation,
};
