const { body } = require('express-validator');
const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');

const registerValidation = [
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
    .normalizeEmail()
    .custom(async (email) => {
      const existing = await db(TABLES.USERS).where({ email }).first();

      if (existing) {
        throw new Error('Email is already registered');
      }

      return true;
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('confirm_password')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Confirm password does not match password');
      }
      return true;
    }),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const googleLoginValidation = [
  body('id_token')
    .notEmpty()
    .withMessage('Google ID token is required')
    .isString()
    .withMessage('Google ID token must be a string'),
];

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
  body('avatar')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Avatar URL must not exceed 255 characters'),
  body().custom((_, { req }) => {
    const { full_name, phone, avatar } = req.body;
    if (
      full_name === undefined &&
      phone === undefined &&
      avatar === undefined
    ) {
      throw new Error('At least one field must be provided to update');
    }
    return true;
  }),
];

const changePasswordValidation = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
  body('confirm_password')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Confirm password does not match new password');
      }
      return true;
    }),
];

module.exports = {
  registerValidation,
  loginValidation,
  googleLoginValidation,
  updateProfileValidation,
  changePasswordValidation,
};
