const reviewsService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function createReview(req, res, next) {
  try {
    const review = await reviewsService.createReview(req.user.user_id, req.body);

    return sendSuccess(res, 'Review created successfully', review, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateReview(req, res, next) {
  try {
    const review = await reviewsService.updateReview(
      req.user.user_id,
      req.params.reviewId,
      req.body,
    );

    return sendSuccess(res, 'Review updated successfully', review);
  } catch (error) {
    return next(error);
  }
}

async function deleteReview(req, res, next) {
  try {
    const result = await reviewsService.deleteReview(
      req.user.user_id,
      req.params.reviewId,
    );

    return sendSuccess(res, 'Review deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getMyReviews(req, res, next) {
  try {
    const result = await reviewsService.getMyReviews(req.user.user_id, req.query);

    return sendSuccess(res, 'My reviews retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getProductReviews(req, res, next) {
  try {
    const result = await reviewsService.getProductReviews(
      req.params.productId,
      req.query,
    );

    return sendSuccess(res, 'Product reviews retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getProductReviewSummary(req, res, next) {
  try {
    const result = await reviewsService.getProductReviewSummary(
      req.params.productId,
    );

    return sendSuccess(res, 'Product review summary retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getAdminReviews(req, res, next) {
  try {
    const result = await reviewsService.getAdminReviews(req.query);

    return sendSuccess(res, 'Admin reviews retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getAdminReviewById(req, res, next) {
  try {
    const result = await reviewsService.getAdminReviewById(req.params.reviewId);

    return sendSuccess(res, 'Admin review retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function deleteAdminReview(req, res, next) {
  try {
    const result = await reviewsService.deleteAdminReview(req.params.reviewId);

    return sendSuccess(res, 'Admin review deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getReviewStatistics(req, res, next) {
  try {
    const result = await reviewsService.getReviewStatistics();

    return sendSuccess(res, 'Review statistics retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getTopRatedProducts(req, res, next) {
  try {
    const result = await reviewsService.getTopRatedProducts();

    return sendSuccess(res, 'Top rated products retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
  getProductReviews,
  getProductReviewSummary,
  getAdminReviews,
  getAdminReviewById,
  deleteAdminReview,
  getReviewStatistics,
  getTopRatedProducts,
};