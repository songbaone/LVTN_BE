const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  reviewIdParamValidation,
  adminListReviewsQueryValidation,
} = require('./validation');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.STAFF));

router.get(
  '/',
  adminListReviewsQueryValidation,
  validate,
  controller.getAdminReviews,
);

router.get(
  '/statistics',
  controller.getReviewStatistics,
);

router.get(
  '/top-rated-products',
  controller.getTopRatedProducts,
);

router.get(
  '/:reviewId',
  reviewIdParamValidation,
  validate,
  controller.getAdminReviewById,
);

router.delete(
  '/:reviewId',
  reviewIdParamValidation,
  validate,
  controller.deleteAdminReview,
);

module.exports = router;