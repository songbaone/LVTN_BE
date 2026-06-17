const express = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const controller = require('./controller');
const {
  registerValidation,
  loginValidation,
  googleLoginValidation,
  updateProfileValidation,
  changePasswordValidation,
} = require('./validation');

const router = express.Router();

router.post('/register', registerValidation, validate, controller.register);
router.post(
  '/admin-login',
  loginValidation,
  validate,
  controller.adminLogin
);
router.post('/login', loginValidation, validate, controller.login);
router.post('/google', googleLoginValidation, validate, controller.googleLogin);
router.post('/logout', authenticate, controller.logout);
router.get('/profile', authenticate, controller.getProfile);
router.put('/profile', authenticate, updateProfileValidation, validate, controller.updateProfile);
router.put(
  '/change-password',
  authenticate,
  changePasswordValidation,
  validate,
  controller.changePassword
);

module.exports = router;
