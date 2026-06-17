const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { uploadProductImages } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  productIdParamValidation,
  listProductsQueryValidation,
  createProductValidation,
  updateProductValidation,
} = require('./validation');

const router = express.Router();

router.get('/', listProductsQueryValidation, validate, controller.getProducts);
router.get('/:id', productIdParamValidation, validate, controller.getProductById);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  uploadProductImages,
  createProductValidation,
  validate,
  controller.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  uploadProductImages,
  updateProductValidation,
  validate,
  controller.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  productIdParamValidation,
  validate,
  controller.deleteProduct
);

module.exports = router;
