const { db } = require("../../database/connection");
const { TABLES, ORDER_STATUS } = require("../../config/constants");

async function getDashboardOverview() {
  const totalOrders = await db(TABLES.ORDERS)
    .count("order_id as count")
    .first();
  const totalCustomers = await db(TABLES.USERS)
    .count("user_id as count")
    .first();
  const totalProducts = await db(TABLES.PRODUCTS)
    .count("product_id as count")
    .first();

  const totalRevenueResult = await db(TABLES.ORDERS)
    .where("order_status", ORDER_STATUS.DELIVERED)
    .sum("final_amount as totalRevenue")
    .first();
  const totalRevenue = parseFloat(totalRevenueResult?.totalRevenue || 0);

  const pendingOrders = await db(TABLES.ORDERS)
    .where("order_status", ORDER_STATUS.PENDING)
    .count("order_id as count")
    .first();
  const confirmedOrders = await db(TABLES.ORDERS)
    .where("order_status", ORDER_STATUS.CONFIRMED)
    .count("order_id as count")
    .first();
  const shippingOrders = await db(TABLES.ORDERS)
    .where("order_status", ORDER_STATUS.SHIPPING)
    .count("order_id as count")
    .first();
  const deliveredOrders = await db(TABLES.ORDERS)
    .where("order_status", ORDER_STATUS.DELIVERED)
    .count("order_id as count")
    .first();
  const cancelledOrders = await db(TABLES.ORDERS)
    .where("order_status", ORDER_STATUS.CANCELLED)
    .count("order_id as count")
    .first();

  const paidOrders = await db(TABLES.ORDERS)
    .where("payment_status", "Paid")
    .count("order_id as count")
    .first();
  const unpaidOrders = await db(TABLES.ORDERS)
    .where("payment_status", "Pending")
    .count("order_id as count")
    .first();

  return {
    total_orders: Number(totalOrders.count || 0),
    total_revenue: parseFloat(totalRevenue),
    total_customers: parseInt(totalCustomers.count),
    total_products: parseInt(totalProducts.count),
    pending_orders: parseInt(pendingOrders.count),
    confirmed_orders: parseInt(confirmedOrders.count),
    shipping_orders: parseInt(shippingOrders.count),
    delivered_orders: parseInt(deliveredOrders.count),
    cancelled_orders: parseInt(cancelledOrders.count),
    paid_orders: parseInt(paidOrders.count),
    unpaid_orders: parseInt(unpaidOrders.count),
  };
}

async function getDashboardRevenue(from_date, to_date) {
  const revenueData = await db(TABLES.ORDERS)
    .select(
      db.raw("CAST(created_at AS DATE) as date"),
      db.raw("SUM(final_amount) as revenue"),
      db.raw("COUNT(order_id) as orders"),
    )
    .where("order_status", ORDER_STATUS.DELIVERED)
    .whereBetween("created_at", [
      `${from_date} 00:00:00`,
      `${to_date} 23:59:59`,
    ])
    .groupBy(db.raw("CAST(created_at AS DATE)"))
    .orderBy(db.raw("CAST(created_at AS DATE)"));

  return revenueData.map((row) => ({
    date: row.date,
    revenue: parseFloat(row.revenue),
    orders: parseInt(row.orders),
  }));
}

async function getTopProducts() {
  const topProducts = await db(TABLES.ORDER_DETAILS)
    .join(
      TABLES.ORDERS,
      `${TABLES.ORDER_DETAILS}.order_id`,
      `${TABLES.ORDERS}.order_id`,
    )
    .join(
      TABLES.PRODUCT_VARIANTS,
      "OrderDetails.variant_id",
      "ProductVariants.variant_id",
    )
    .join(TABLES.PRODUCTS, "ProductVariants.product_id", "Products.product_id")
    .select(
      "Products.product_id",
      "Products.product_name",
      db.raw("SUM(OrderDetails.quantity) as quantity_sold"),
      db.raw("SUM(OrderDetails.quantity * OrderDetails.unit_price) as revenue"),
    )
    .where("Orders.order_status", ORDER_STATUS.DELIVERED)
    .groupBy("Products.product_id", "Products.product_name")
    .orderBy("revenue", "desc")
    .limit(10);

  return topProducts.map((product) => ({
    product_id: product.product_id,
    product_name: product.product_name,
    quantity_sold: parseInt(product.quantity_sold),
    revenue: parseFloat(product.revenue),
  }));
}

async function getRecentOrders() {
  const recentOrders = await db(TABLES.ORDERS)
    .join(TABLES.USERS, "Orders.user_id", "Users.user_id")
    .select(
      "Orders.order_id",
      "Orders.order_code",
      "Users.full_name as customer_name",
      "Orders.final_amount",
      "Orders.payment_method",
      "Orders.payment_status",
      "Orders.order_status",
      "Orders.created_at",
    )
    .orderBy("Orders.created_at", "desc")
    .limit(10);

  return recentOrders.map((order) => ({
    order_id: order.order_id,
    order_code: order.order_code,
    customer_name: order.customer_name,
    final_amount: parseFloat(order.final_amount),
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    order_status: order.order_status,
    created_at: order.created_at,
  }));
}

module.exports = {
  getDashboardOverview,
  getDashboardRevenue,
  getTopProducts,
  getRecentOrders,
};
