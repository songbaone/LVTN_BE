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

module.exports = {
  userIdParamValidation,
  listUsersQueryValidation,
  updateRoleValidation,
  lockUserValidation,
  unlockUserValidation,
};
