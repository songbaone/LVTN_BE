const express = require("express");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const validate = require("../../middleware/validate");

const { ROLES } = require("../../config/constants");

const controller = require("./controller");

const {
  orderIdParamValidation,
  adminListOrdersQueryValidation,
  updateOrderStatusValidation,
} = require("./validation");

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.STAFF));

router.get(
  "/",
  adminListOrdersQueryValidation,
  validate,
  controller.getAdminOrders,
);

router.get(
  "/dashboard",
  controller.getDashboardStatistics,
);

router.get(
  "/:id",
  orderIdParamValidation,
  validate,
  controller.getAdminOrderById,
);

router.patch(
  "/:id/status",
  updateOrderStatusValidation,
  validate,
  controller.updateOrderStatus,
);

module.exports = router;
