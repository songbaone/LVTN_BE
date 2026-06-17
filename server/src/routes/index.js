const express = require("express");
const authRoutes = require("../modules/auth/routes");
const rolesRoutes = require("../modules/roles/routes");
const usersRoutes = require("../modules/users/routes");
const categoriesRoutes = require("../modules/categories/routes");
const brandsRoutes = require("../modules/brands/routes");
const productsRoutes = require("../modules/products/routes");
const productImagesRoutes = require("../modules/product-images/routes");
const addressesRoutes = require("../modules/addresses/routes");
const cartRoutes = require("../modules/cart/routes");
const couponsRoutes = require("../modules/coupons/routes");
const ordersRoutes = require("../modules/orders/routes");
const paymentsRoutes = require("../modules/payments/routes");
const adminOrderRoutes = require("../modules/orders/admin.routes");
const dashboardRoutes = require("../modules/dashboard/routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/roles", rolesRoutes);
router.use("/users", usersRoutes);
router.use("/categories", categoriesRoutes);
router.use("/brands", brandsRoutes);
router.use("/products", productImagesRoutes);
router.use("/products", productsRoutes);
router.use("/addresses", addressesRoutes);
router.use("/cart", cartRoutes);
router.use("/coupons", couponsRoutes);
router.use("/orders", ordersRoutes);
router.use("/payments", paymentsRoutes);

router.use("/admin/orders", adminOrderRoutes);
router.use("/admin/dashboard", dashboardRoutes);

module.exports = router;
