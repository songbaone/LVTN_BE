const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  couponIdParamValidation,
  listCouponsQueryValidation,
  createCouponValidation,
  updateCouponValidation,
  validateCouponValidation,
  applyCouponValidation,
} = require('./validation');

const router = express.Router();

// CRUD routes - ADMIN, STAFF only
router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  listCouponsQueryValidation,
  validate,
  controller.getCoupons
);

router.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  couponIdParamValidation,
  validate,
  controller.getCouponById
);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  createCouponValidation,
  validate,
  controller.createCoupon
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  updateCouponValidation,
  validate,
  controller.updateCoupon
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  couponIdParamValidation,
  validate,
  controller.deleteCoupon
);

// Customer routes - validate and apply coupons
router.post(
  '/validate',
  authenticate,
  authorize(ROLES.CUSTOMER),
  validateCouponValidation,
  validate,
  controller.validateCoupon
);

router.post(
  '/apply',
  authenticate,
  authorize(ROLES.CUSTOMER),
  applyCouponValidation,
  validate,
  controller.applyCoupon
);

module.exports = router;
