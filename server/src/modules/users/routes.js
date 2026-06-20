const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { uploadUserAvatar } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  listUsersQueryValidation,
  userIdParamValidation,
  updateRoleValidation,
  lockUserValidation,
  unlockUserValidation,
  updateProfileValidation,
} = require('./validation');

const router = express.Router();

router.use(authenticate);

router.put('/profile', uploadUserAvatar, updateProfileValidation, validate, controller.updateProfile);

router.use(authorize(ROLES.ADMIN));

router.get('/', listUsersQueryValidation, validate, controller.getUsers);
router.get('/statistics', controller.getUserStatistics);
router.get('/:id', userIdParamValidation, validate, controller.getUserById);
router.put('/:id/role', updateRoleValidation, validate, controller.updateUserRole);
router.put('/:id/lock', lockUserValidation, validate, controller.lockUser);
router.put('/:id/unlock', unlockUserValidation, validate, controller.unlockUser);

module.exports = router;