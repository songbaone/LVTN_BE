const couponsService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getCoupons(req, res, next) {
  try {
    const result = await couponsService.getCoupons(req.query);

    return sendSuccess(res, 'Coupons retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getCouponById(req, res, next) {
  try {
    const coupon = await couponsService.getCouponById(req.params.id);

    return sendSuccess(res, 'Coupon retrieved successfully', coupon);
  } catch (error) {
    return next(error);
  }
}

async function createCoupon(req, res, next) {
  try {
    const coupon = await couponsService.createCoupon(req.body);

    return sendSuccess(res, 'Coupon created successfully', coupon, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateCoupon(req, res, next) {
  try {
    const coupon = await couponsService.updateCoupon(req.params.id, req.body);

    return sendSuccess(res, 'Coupon updated successfully', coupon);
  } catch (error) {
    return next(error);
  }
}

async function deleteCoupon(req, res, next) {
  try {
    const coupon = await couponsService.deleteCoupon(req.params.id);

    return sendSuccess(res, 'Coupon deleted successfully', coupon);
  } catch (error) {
    return next(error);
  }
}

async function validateCoupon(req, res, next) {
  try {
    const result = await couponsService.validateCoupon(
      req.body.coupon_code,
      req.body.order_amount
    );

    return sendSuccess(res, 'Coupon validated successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function applyCoupon(req, res, next) {
  try {
    const result = await couponsService.applyCoupon(
      req.body.coupon_code,
      req.body.order_amount
    );

    return sendSuccess(res, 'Coupon applied successfully', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
};
