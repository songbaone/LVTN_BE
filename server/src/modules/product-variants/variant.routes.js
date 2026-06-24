const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  variantIdParamValidation,
  updateVariantValidation,
  listVariantsQueryValidation
} = require('./validation');

const router = express.Router();

router.get(
  '/',
  listVariantsQueryValidation,
  validate,
  controller.getAllVariants
)

// Routes under /variants
router.get(
  '/:variantId',
  variantIdParamValidation,
  validate,
  controller.getVariantById
);

router.put(
  '/:variantId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  updateVariantValidation,
  validate,
  controller.updateVariant
);

router.delete(
  '/soft-delete/:variantId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  variantIdParamValidation,
  validate,
  controller.softDeleteVariant
);

router.delete(
  '/:variantId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  variantIdParamValidation,
  validate,
  controller.deleteVariant
);

module.exports = router;