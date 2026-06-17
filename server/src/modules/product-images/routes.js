const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { uploadProductImage } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  productIdParamValidation,
  productImageParamsValidation,
} = require('./validation');

const router = express.Router();

router.get(
  '/:productId/images',
  productIdParamValidation,
  validate,
  controller.getProductImages
);

router.post(
  '/:productId/images',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  productIdParamValidation,
  validate,
  uploadProductImage,
  controller.uploadProductImage
);

router.delete(
  '/:productId/images/:imageId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  productImageParamsValidation,
  validate,
  controller.deleteProductImage
);

router.patch(
  '/:productId/images/:imageId/main',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  productImageParamsValidation,
  validate,
  controller.setMainImage
);

module.exports = router;
