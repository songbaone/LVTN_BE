const express = require("express");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const validate = require("../../middleware/validate");
const { ROLES } = require("../../config/constants");
const controller = require("./controller");
const {
  orderIdParamValidation,
  checkoutValidation,
  listOrdersQueryValidation,
  adminListOrdersQueryValidation,
  updateOrderStatusValidation,
} = require("./validation");

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.CUSTOMER));

router.post("/checkout", checkoutValidation, validate, controller.checkout);
router.get("/", listOrdersQueryValidation, validate, controller.getOrders);
router.get("/:id", orderIdParamValidation, validate, controller.getOrderById);
router.patch(
  "/:id/cancel",
  orderIdParamValidation,
  validate,
  controller.cancelOrder,
);

module.exports = router;
