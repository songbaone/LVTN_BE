const { body, param, query } = require('express-validator');

const staffIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid staff ID')
    .toInt(),
];

const createStaffValidation = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name must not exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('phone')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 15 })
    .withMessage('Phone must not exceed 15 characters'),
  body('gender')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 10 })
    .withMessage('Gender must not exceed 10 characters'),
  body('birth_date')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Birth date must be a valid date'),
];

const updateStaffValidation = [
  ...staffIdParamValidation,
  body('full_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Full name must not exceed 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 15 })
    .withMessage('Phone must not exceed 15 characters'),
  body('gender')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 10 })
    .withMessage('Gender must not exceed 10 characters'),
  body('birth_date')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Birth date must be a valid date'),
  body('avatar')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Avatar URL must not exceed 255 characters'),
  body().custom((_, { req }) => {
    const { full_name, email, phone, gender, birth_date, avatar } = req.body;
    if (
      full_name === undefined &&
      email === undefined &&
      phone === undefined &&
      gender === undefined &&
      birth_date === undefined &&
      avatar === undefined
    ) {
      throw new Error('At least one field must be provided to update');
    }
    return true;
  }),
];

const listStaffQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('full_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name search must not exceed 100 characters'),
  query('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email for search'),
  query('status')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Status must be 0 (locked) or 1 (active)'),
];

module.exports = {
  staffIdParamValidation,
  createStaffValidation,
  updateStaffValidation,
  listStaffQueryValidation,
};