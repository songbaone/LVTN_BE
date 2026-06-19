const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { uploadCategoryImage } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  categoryIdParamValidation,
  listCategoriesQueryValidation,
  treeQueryValidation,
  createCategoryValidation,
  updateCategoryValidation,
} = require('./validation');

const router = express.Router();

router.get('/', listCategoriesQueryValidation, validate, controller.getCategories);
router.get('/tree', treeQueryValidation, validate, controller.getCategoryTree);
router.get(
  '/statistics',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  controller.getCategoryStatistics
);
router.get('/:id', categoryIdParamValidation, validate, controller.getCategoryById);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  uploadCategoryImage,
  createCategoryValidation,
  validate,
  controller.createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  uploadCategoryImage,
  updateCategoryValidation,
  validate,
  controller.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  categoryIdParamValidation,
  validate,
  controller.deleteCategory
);

module.exports = router;
