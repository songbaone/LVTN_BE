const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { uploadUserAvatar } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  staffIdParamValidation,
  createStaffValidation,
  updateStaffValidation,
  listStaffQueryValidation,
} = require('./validation');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/', listStaffQueryValidation, validate, controller.getStaffList);
router.get('/statistics', controller.getStaffStatistics);
router.post('/', createStaffValidation, validate, controller.createStaff);
router.get('/:id', staffIdParamValidation, validate, controller.getStaffById);
router.put('/:id', uploadUserAvatar, updateStaffValidation, validate, controller.updateStaff);
router.put('/:id/lock', staffIdParamValidation, validate, controller.lockStaff);
router.put('/:id/unlock', staffIdParamValidation, validate, controller.unlockStaff);

module.exports = router;
