const { body, param, query } = require('express-validator');

const userIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID')
    .toInt(),
];

const listUsersQueryValidation = [
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
  query('role_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Role ID must be a positive integer'),
  query('status')
    .optional()
    .isIn(['0', '1'])
    .withMessage('Status must be 0 (locked) or 1 (active)'),
];

const updateRoleValidation = [
  ...userIdParamValidation,
  body('role_id')
    .isInt({ min: 1 })
    .withMessage('Role ID is required and must be a positive integer'),
];

const lockUserValidation = [...userIdParamValidation];
const unlockUserValidation = [...userIdParamValidation];

const updateProfileValidation = [
  body('full_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Full name must not exceed 100 characters'),
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
  body().custom((_, { req }) => {
    const { full_name, phone, gender, birth_date } = req.body;
    if (
      full_name === undefined &&
      phone === undefined &&
      gender === undefined &&
      birth_date === undefined &&
      !req.file
    ) {
      throw new Error('At least one field or avatar must be provided to update');
    }
    return true;
  }),
];

module.exports = {
  userIdParamValidation,
  listUsersQueryValidation,
  updateRoleValidation,
  lockUserValidation,
  unlockUserValidation,
  updateProfileValidation,
};
