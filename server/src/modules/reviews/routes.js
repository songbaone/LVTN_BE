const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
    reviewIdParamValidation,
    productIdParamValidation,
    createReviewValidation,
    updateReviewValidation,
    listReviewsQueryValidation,
} = require('./validation');

const router = express.Router();

// Public routes
router.get(
    '/:productId/reviews',
    productIdParamValidation,
    listReviewsQueryValidation,
    validate,
    controller.getProductReviews,
);

router.get(
    '/:productId/reviews/summary',
    productIdParamValidation,
    validate,
    controller.getProductReviewSummary,
);

// Customer routes
router.post(
    '/',
    authenticate,
    authorize(ROLES.CUSTOMER),
    createReviewValidation,
    validate,
    controller.createReview,
);

router.put(
    '/:reviewId',
    authenticate,
    authorize(ROLES.CUSTOMER),
    updateReviewValidation,
    validate,
    controller.updateReview,
);

router.delete(
    '/:reviewId',
    authenticate,
    authorize(ROLES.CUSTOMER),
    reviewIdParamValidation,
    validate,
    controller.deleteReview,
);

router.get(
    '/my',
    authenticate,
    authorize(ROLES.CUSTOMER),
    listReviewsQueryValidation,
    validate,
    controller.getMyReviews,
);

module.exports = router;