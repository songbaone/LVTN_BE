const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  productIdParamValidation,
  variantIdParamValidation,
  createVariantValidation,
  updateVariantValidation,
} = require('./validation');

const router = express.Router();

// Routes under /products/:productId/variants
router.get(
  '/:productId/variants',
  productIdParamValidation,
  validate,
  controller.getProductVariants
);

router.post(
  '/:productId/variants',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  createVariantValidation,
  validate,
  controller.createVariant
);

module.exports = router;