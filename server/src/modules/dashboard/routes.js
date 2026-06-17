const express = require("express");

const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

const { ROLES } = require("../../config/constants");

const controller = require("./controller");

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.STAFF));

router.get("/overview", controller.getDashboardOverview);

router.get("/revenue", controller.getDashboardRevenue);

router.get("/top-products", controller.getTopProducts);

router.get("/recent-orders", controller.getRecentOrders);

module.exports = router;
