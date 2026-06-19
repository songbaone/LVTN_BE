const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { uploadBrandLogo } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  brandIdParamValidation,
  listBrandsQueryValidation,
  createBrandValidation,
  updateBrandValidation,
} = require('./validation');

const router = express.Router();

router.get('/', listBrandsQueryValidation, validate, controller.getBrands);
router.get('/:id', brandIdParamValidation, validate, controller.getBrandById);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  createBrandValidation,
  validate,
  controller.createBrand
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  updateBrandValidation,
  validate,
  controller.updateBrand
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  brandIdParamValidation,
  validate,
  controller.deleteBrand
);

router.post(
  '/:id/logo',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  brandIdParamValidation,
  validate,
  uploadBrandLogo,
  controller.uploadLogo
);

router.post(
  '/upload-logo',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  uploadBrandLogo,
  controller.uploadLogoStandalone
);

module.exports = router;
