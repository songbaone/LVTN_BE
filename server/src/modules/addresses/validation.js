const { body, param } = require('express-validator');

const addressIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid address ID')
    .toInt(),
];

const addressFieldsValidation = [
  body('recipient_name')
    .trim()
    .notEmpty()
    .withMessage('Recipient name is required')
    .isLength({ max: 100 })
    .withMessage('Recipient name must not exceed 100 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .isLength({ max: 15 })
    .withMessage('Phone must not exceed 15 characters'),
  body('address_line')
    .trim()
    .notEmpty()
    .withMessage('Address line is required')
    .isLength({ max: 255 })
    .withMessage('Address line must not exceed 255 characters'),
  body('province')
    .trim()
    .notEmpty()
    .withMessage('Province is required')
    .isLength({ max: 100 })
    .withMessage('Province must not exceed 100 characters'),
  body('ward')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Ward must not exceed 100 characters'),
  body('is_default')
    .optional()
    .isIn([true, false, 0, 1, '0', '1', 'true', 'false'])
    .withMessage('is_default must be a boolean value'),
  body('district')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('District must not exceed 100 characters'),
];

const createAddressValidation = [...addressFieldsValidation];

const updateAddressValidation = [
  ...addressIdParamValidation,
  body('recipient_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Recipient name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Recipient name must not exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone cannot be empty')
    .isLength({ max: 15 })
    .withMessage('Phone must not exceed 15 characters'),
  body('address_line')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address line cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Address line must not exceed 255 characters'),
  body('province')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Province cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Province must not exceed 100 characters'),
  body('ward')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Ward must not exceed 100 characters'),
  body('is_default')
    .optional()
    .isIn([true, false, 0, 1, '0', '1', 'true', 'false'])
    .withMessage('is_default must be a boolean value'),
  body().custom((_, { req }) => {
    const fields = [
      'recipient_name',
      'phone',
      'address_line',
      'province',
      'ward',
      'is_default',
    ];

    const hasField = fields.some((field) => req.body[field] !== undefined);

    if (!hasField) {
      throw new Error('At least one field must be provided to update');
    }

    return true;
  }),
];

module.exports = {
  addressIdParamValidation,
  createAddressValidation,
  updateAddressValidation,
};
