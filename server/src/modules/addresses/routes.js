const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  addressIdParamValidation,
  createAddressValidation,
  updateAddressValidation,
} = require('./validation');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.CUSTOMER));

router.get('/', controller.getAddresses);
router.get('/:id', addressIdParamValidation, validate, controller.getAddressById);
router.post('/', createAddressValidation, validate, controller.createAddress);
router.put('/:id', updateAddressValidation, validate, controller.updateAddress);
router.delete('/:id', addressIdParamValidation, validate, controller.deleteAddress);
router.patch(
  '/:id/default',
  addressIdParamValidation,
  validate,
  controller.setDefaultAddress
);

module.exports = router;
