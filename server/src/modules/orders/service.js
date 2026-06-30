const { db } = require("../../database/connection");
const {
  TABLES,
  ORDER_STATUS,
  INVENTORY_TRANSACTION_TYPE,
} = require("../../config/constants");
const { AppError } = require("../../middleware/errorHandler");
const {
  getPagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const { generateUniqueOrderCode } = require("../../utils/orderCode");
const { buildVNPayUrl } = require("../../service/vnpay.service");
const { calculateSellingPrice } = require("../../utils/pricing");
const axios = require("axios");

function parseOrderId(orderId) {
  const id = parseInt(orderId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError("Invalid order ID", 400);
  }

  return id;
}

function parseAddressId(addressId) {
  const id = parseInt(addressId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError("Invalid address ID", 400);
  }

  return id;
}

async function ensureAddressBelongsToUser(userId, addressId, trx = db) {
  const address = await trx(TABLES.ADDRESSES)
    .where({ address_id: addressId, user_id: userId })
    .first();

  if (!address) {
    throw new AppError("Address not found", 404);
  }

  return address;
}

async function ensureOrderBelongsToUser(userId, orderId, trx = db) {
  const order = await trx(TABLES.ORDERS)
    .where({ order_id: orderId, user_id: userId })
    .first();

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
}

async function ensureOrderExists(orderId, trx = db) {
  const order = await trx(TABLES.ORDERS).where({ order_id: orderId }).first();

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
}

async function getOrCreateCart(userId, trx = db) {
  let cart = await trx(TABLES.CART).where({ user_id: userId }).first();

  if (!cart) {
    const [cartId] = await trx(TABLES.CART).insert({ user_id: userId });
    cart = await trx(TABLES.CART).where({ cart_id: cartId }).first();
  }

  return cart;
}

async function loadCartItems(cartId, trx = db) {
  const cartItems = await trx(TABLES.CART_ITEMS)
    .join(
      TABLES.PRODUCT_VARIANTS,
      `${TABLES.CART_ITEMS}.variant_id`,
      `${TABLES.PRODUCT_VARIANTS}.variant_id`,
    )
    .join(
      TABLES.PRODUCTS,
      `${TABLES.PRODUCT_VARIANTS}.product_id`,
      `${TABLES.PRODUCTS}.product_id`,
    )
    .select(
      `${TABLES.CART_ITEMS}.cart_item_id`,
      `${TABLES.CART_ITEMS}.variant_id`,
      `${TABLES.CART_ITEMS}.quantity`,
      `${TABLES.PRODUCT_VARIANTS}.stock_quantity`,
      `${TABLES.PRODUCT_VARIANTS}.sku`,
      `${TABLES.PRODUCT_VARIANTS}.size`,
      `${TABLES.PRODUCT_VARIANTS}.color`,
      `${TABLES.PRODUCT_VARIANTS}.material`,
      `${TABLES.PRODUCT_VARIANTS}.additional_price`,
      `${TABLES.PRODUCTS}.product_id`,
      `${TABLES.PRODUCTS}.product_name`,
      `${TABLES.PRODUCTS}.price`,
      `${TABLES.PRODUCTS}.discount_price`,
      `${TABLES.PRODUCTS}.weight`,
    )
    .where(`${TABLES.CART_ITEMS}.cart_id`, cartId);

  // Map effective_price onto each item
  return cartItems.map((item) => ({
    ...item,
    effective_price: calculateSellingPrice(
      item.price,
      item.discount_price,
      item.additional_price,
    ),
  }));
}

async function validateStockForCartItems(cartItems, trx = db) {
  for (const item of cartItems) {
    if (item.stock_quantity < item.quantity) {
      throw new AppError(
        `Insufficient stock for ${item.product_name}. Available: ${item.stock_quantity}, Required: ${item.quantity}`,
        400,
      );
    }
  }
}

function calculateSubtotal(cartItems) {
  return cartItems.reduce(
    (sum, item) => sum + item.effective_price * item.quantity,
    0,
  );
}

async function validateAndApplyCoupon(couponCode, orderAmount, trx = db) {
  if (!couponCode) {
    return { valid: false, discount_amount: 0, coupon: null };
  }

  const coupon = await trx(TABLES.COUPONS)
    .where({ coupon_code: couponCode })
    .first();

  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  if (!coupon.status) {
    throw new AppError("Coupon is inactive", 400);
  }

  const now = new Date();

  if (coupon.start_date && new Date(coupon.start_date) > now) {
    throw new AppError("Coupon is not yet valid", 400);
  }

  if (coupon.end_date && new Date(coupon.end_date) < now) {
    throw new AppError("Coupon has expired", 400);
  }

  if (coupon.quantity !== null && coupon.quantity <= 0) {
    throw new AppError("Coupon usage limit has been exceeded", 400);
  }

  if (coupon.min_order_value && orderAmount < coupon.min_order_value) {
    throw new AppError(
      `Minimum order value of ${coupon.min_order_value} is required to use this coupon`,
      400,
    );
  }

  const discountType = coupon.discount_type.toUpperCase();
  const discountValue = parseFloat(coupon.discount_value);

  let discountAmount;

  if (discountType === "PERCENT") {
    discountAmount = (orderAmount * discountValue) / 100;
  } else if (discountType === "FIXED") {
    discountAmount = discountValue;
  } else {
    throw new AppError("Invalid discount type", 400);
  }

  if (discountAmount > orderAmount) {
    discountAmount = orderAmount;
  }

  return { valid: true, discount_amount: discountAmount, coupon };
}

async function decreaseVariantStock(variantId, quantity, trx = db) {
  await trx(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id: variantId })
    .decrement("stock_quantity", quantity);
}

async function increaseVariantStock(variantId, quantity, trx = db) {
  await trx(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id: variantId })
    .increment("stock_quantity", quantity);
}

async function createInventoryTransaction(
  variantId,
  quantity,
  transactionType,
  note,
  trx = db,
) {
  await trx(TABLES.INVENTORY_TRANSACTIONS).insert({
    variant_id: variantId,
    quantity: quantity,
    transaction_type: transactionType,
    note: note,
  });
}

async function decreaseCouponQuantity(couponId, trx = db) {
  await trx(TABLES.COUPONS)
    .where({ coupon_id: couponId })
    .decrement("quantity", 1);
}

async function calculateOrderPreview(
  userId,
  addressIdParam,
  couponCode = null,
  trx = db,
) {
  const addressId = parseAddressId(addressIdParam);

  await ensureAddressBelongsToUser(userId, addressId, trx);
  const cart = await getOrCreateCart(userId, trx);
  const cartItems = await loadCartItems(cart.cart_id, trx);
  const address = await trx(TABLES.ADDRESSES)
    .where({ address_id: addressId })
    .first();

  if (cartItems.length === 0) {
    throw new AppError("Cart is empty", 400);
  }

  const totalWeight = cartItems.reduce(
    (sum, item) => sum + (item.weight || 0) * 1000 * item.quantity,
    0,
  );

  await validateStockForCartItems(cartItems, trx);
  const subtotal = calculateSubtotal(cartItems);

  const shippingFee = await calculateShippingFee({
    province: address.province,
    district: address.district,
    ward: address.ward,
    weight: totalWeight,
    value: subtotal,
  });

  let discountAmount = 0;
  let coupon = null;
  let couponId = null;

  if (couponCode) {
    const couponResult = await validateAndApplyCoupon(
      couponCode,
      subtotal,
      trx,
    );
    discountAmount = couponResult.discount_amount;
    coupon = couponResult.coupon;
    couponId = coupon.coupon_id;
  }

  const finalAmount = subtotal - discountAmount + shippingFee;

  return {
    addressId,
    cart,
    cartItems,
    address,
    subtotal,
    totalWeight,
    shippingFee,
    discountAmount,
    coupon,
    couponId,
    finalAmount,
  };
}

async function checkout(
  userId,
  addressIdParam,
  couponCode = null,
  paymentMethod = "COD",
  ipAddr = null,
) {
  const result = await db.transaction(async (trx) => {
    const preview = await calculateOrderPreview(
      userId,
      addressIdParam,
      couponCode,
      trx,
    );

    const {
      addressId,
      cart,
      cartItems,
      address,
      subtotal,
      shippingFee,
      discountAmount,
      coupon,
      couponId,
      finalAmount,
    } = preview;

    const orderCode = await generateUniqueOrderCode();

    console.log("ORDER CODE:", orderCode);
    console.log("TYPE:", typeof orderCode);

    await trx(TABLES.ORDERS).insert({
      order_code: orderCode,
      user_id: userId,
      address_id: addressId,
      receiver_name: address.receiver_name,
      receiver_phone: address.receiver_phone,
      province: address.province,
      ward: address.ward,
      address_detail: address.detail_address,
      coupon_id: couponId,
      total_amount: subtotal,
      discount_amount: discountAmount,
      shipping_fee: shippingFee,
      final_amount: finalAmount,
      payment_method: paymentMethod,
      payment_status: "Pending",
      order_status: ORDER_STATUS.PENDING,
      note: null,
    });

    const createdOrder = await trx(TABLES.ORDERS)
      .where({ order_code: orderCode })
      .first();

    if (!createdOrder) {
      throw new AppError("Failed to create order", 500);
    }

    const orderId = createdOrder.order_id;

    console.log("ORDER ID:", orderId);

    let paymentUrl = null;

    if (paymentMethod === "VNPAY") {
      paymentUrl = buildVNPayUrl({
        orderCode,
        amount: finalAmount,
        ipAddr,
      });
    }

    console.log(paymentUrl);

    for (const item of cartItems) {
      const unitPrice = item.effective_price;
      const totalPrice = unitPrice * item.quantity;

      await trx(TABLES.ORDER_DETAILS).insert({
        order_id: orderId,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });

      await decreaseVariantStock(item.variant_id, item.quantity, trx);
      await createInventoryTransaction(
        item.variant_id,
        item.quantity,
        INVENTORY_TRANSACTION_TYPE.EXPORT,
        `Order #${orderCode}`,
        trx,
      );
    }

    if (couponId) {
      await decreaseCouponQuantity(couponId, trx);
    }

    await trx(TABLES.CART_ITEMS).where({ cart_id: cart.cart_id }).del();

    await trx(TABLES.PAYMENTS).insert({
      order_id: orderId,
      payment_code: null,
      amount: finalAmount,
      payment_status: "Pending",
      paid_at: null,
    });

    const order = await trx(TABLES.ORDERS).where({ order_id: orderId }).first();

    return { order, cartItems, paymentUrl };
  });

  const orderResult = await getOrderById(userId, result.order.order_id);

  return {
    ...orderResult,
    payment: {
      method: paymentMethod,
      payment_url: result.paymentUrl,
    },
  };
}

async function getOrders(userId, queryParams) {
  const { page, limit, offset } = getPagination(queryParams);

  const filters = {
    status: queryParams.status,
  };

  let countQuery = db(TABLES.ORDERS).where({ user_id: userId });
  if (filters.status) {
    countQuery = countQuery.where({ order_status: filters.status });
  }
  const countResult = await countQuery.count({ total: "order_id" });
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(TABLES.ORDERS)
    .select(
      "order_id",
      "order_code",
      "total_amount",
      "discount_amount",
      "shipping_fee",
      "final_amount",
      "order_status",
      "created_at",
    )
    .where({ user_id: userId });

  if (filters.status) {
    listQuery = listQuery.where({ order_status: filters.status });
  }

  const orders = await listQuery
    .orderBy("created_at", "desc")
    .offset(offset)
    .limit(limit);

  return {
    orders: orders.map((order) => ({
      order_id: order.order_id,
      order_code: order.order_code,
      total_amount: parseFloat(order.total_amount),
      discount_amount: parseFloat(order.discount_amount),
      shipping_fee: parseFloat(order.shipping_fee),
      final_amount: parseFloat(order.final_amount),
      status: order.order_status,
      created_at: order.created_at,
    })),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getOrderById(userId, orderIdParam) {
  const orderId = parseOrderId(orderIdParam);
  const order = await ensureOrderBelongsToUser(userId, orderId);

  const address = await db(TABLES.ADDRESSES)
    .where({ address_id: order.address_id })
    .first();

  let coupon = null;
  if (order.coupon_id) {
    coupon = await db(TABLES.COUPONS)
      .where({ coupon_id: order.coupon_id })
      .first();
  }

  const orderDetails = await db(TABLES.ORDER_DETAILS)
    .join(
      TABLES.PRODUCT_VARIANTS,
      `${TABLES.ORDER_DETAILS}.variant_id`,
      `${TABLES.PRODUCT_VARIANTS}.variant_id`,
    )
    .join(
      TABLES.PRODUCTS,
      `${TABLES.PRODUCT_VARIANTS}.product_id`,
      `${TABLES.PRODUCTS}.product_id`,
    )
    .select(
      `${TABLES.ORDER_DETAILS}.order_detail_id`,
      `${TABLES.ORDER_DETAILS}.quantity`,
      `${TABLES.ORDER_DETAILS}.unit_price`,
      `${TABLES.ORDER_DETAILS}.total_price`,
      `${TABLES.PRODUCT_VARIANTS}.sku`,
      `${TABLES.PRODUCT_VARIANTS}.size`,
      `${TABLES.PRODUCT_VARIANTS}.color`,
      `${TABLES.PRODUCT_VARIANTS}.material`,
      `${TABLES.PRODUCTS}.product_name`,
      `${TABLES.PRODUCTS}.product_id`,
      `${TABLES.PRODUCTS}.thumbnail`,
    )
    .where(`${TABLES.ORDER_DETAILS}.order_id`, orderId);

  return {
    order: {
      order_id: order.order_id,
      order_code: order.order_code,
      total_amount: parseFloat(order.total_amount),
      discount_amount: parseFloat(order.discount_amount),
      shipping_fee: parseFloat(order.shipping_fee),
      final_amount: parseFloat(order.final_amount),
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      note: order.note,
      created_at: order.created_at,
    },
    address: address
      ? {
          address_id: address.address_id,
          receiver_name: address.receiver_name,
          receiver_phone: address.receiver_phone,
          province: address.province,
          ward: address.ward,
          detail_address: address.detail_address,
        }
      : null,
    coupon: coupon
      ? {
          coupon_id: coupon.coupon_id,
          coupon_code: coupon.coupon_code,
          coupon_name: coupon.coupon_name,
          discount_type: coupon.discount_type,
          discount_value: parseFloat(coupon.discount_value),
        }
      : null,
    order_details: orderDetails.map((detail) => ({
      order_detail_id: detail.order_detail_id,
      product_name: detail.product_name,
      product_id: detail.product_id,
      thumbnail: detail.thumbnail,
      sku: detail.sku,
      color: detail.color,
      size: detail.size,
      material: detail.material,
      quantity: detail.quantity,
      unit_price: parseFloat(detail.unit_price),
      subtotal: parseFloat(detail.total_price),
    })),
  };
}

async function getAdminOrders(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);

  const filters = {
    order_code: queryParams.order_code,
    order_status: queryParams.order_status,
    payment_status: queryParams.payment_status,
    payment_method: queryParams.payment_method,
  };

  let countQuery = db(`${TABLES.ORDERS} as o`).join(
    `${TABLES.USERS} as u`,
    "o.user_id",
    "u.user_id",
  );

  if (filters.order_code) {
    countQuery = countQuery.whereRaw("o.order_code LIKE ?", [
      `%${filters.order_code}%`,
    ]);
  }
  if (filters.order_status) {
    countQuery = countQuery.where("o.order_status", filters.order_status);
  }
  if (filters.payment_status) {
    countQuery = countQuery.where("o.payment_status", filters.payment_status);
  }
  if (filters.payment_method) {
    countQuery = countQuery.where("o.payment_method", filters.payment_method);
  }

  const countResult = await countQuery.count({ total: "o.order_id" });
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(`${TABLES.ORDERS} as o`)
    .join(`${TABLES.USERS} as u`, "o.user_id", "u.user_id")
    .select(
      "o.order_id",
      "o.order_code",
      "u.full_name as customer_name",
      "o.total_amount",
      "o.discount_amount",
      "o.shipping_fee",
      "o.final_amount",
      "o.payment_method",
      "o.payment_status",
      "o.order_status",
      "o.created_at",
    );

  if (filters.order_code) {
    listQuery = listQuery.where(
      "o.order_code",
      "like",
      `%${filters.order_code}%`,
    );
  }
  if (filters.order_status) {
    listQuery = listQuery.where("o.order_status", filters.order_status);
  }
  if (filters.payment_status) {
    listQuery = listQuery.where("o.payment_status", filters.payment_status);
  }
  if (filters.payment_method) {
    listQuery = listQuery.where("o.payment_method", filters.payment_method);
  }

  const orders = await listQuery
    .orderBy("o.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return {
    orders: orders.map((order) => ({
      order_id: order.order_id,
      order_code: order.order_code,
      customer_name: order.customer_name,
      total_amount: parseFloat(order.total_amount),
      discount_amount: parseFloat(order.discount_amount),
      shipping_fee: parseFloat(order.shipping_fee),
      final_amount: parseFloat(order.final_amount),
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      created_at: order.created_at,
    })),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getAdminOrderById(orderIdParam) {
  const orderId = parseOrderId(orderIdParam);
  const order = await ensureOrderExists(orderId);

  const customer = await db(TABLES.USERS)
    .select("user_id", "full_name", "email", "phone")
    .where({ user_id: order.user_id })
    .first();

  const address = await db(TABLES.ADDRESSES)
    .where({ address_id: order.address_id })
    .first();

  let coupon = null;
  if (order.coupon_id) {
    coupon = await db(TABLES.COUPONS)
      .where({ coupon_id: order.coupon_id })
      .first();
  }

  const payment = await db(TABLES.PAYMENTS)
    .where({ order_id: order.order_id })
    .first();

  const orderDetails = await db(TABLES.ORDER_DETAILS)
    .join(
      TABLES.PRODUCT_VARIANTS,
      `${TABLES.ORDER_DETAILS}.variant_id`,
      `${TABLES.PRODUCT_VARIANTS}.variant_id`,
    )
    .join(
      TABLES.PRODUCTS,
      `${TABLES.PRODUCT_VARIANTS}.product_id`,
      `${TABLES.PRODUCTS}.product_id`,
    )
    .select(
      `${TABLES.ORDER_DETAILS}.order_detail_id`,
      `${TABLES.ORDER_DETAILS}.quantity`,
      `${TABLES.ORDER_DETAILS}.unit_price`,
      `${TABLES.ORDER_DETAILS}.total_price`,
      `${TABLES.PRODUCT_VARIANTS}.sku`,
      `${TABLES.PRODUCT_VARIANTS}.size`,
      `${TABLES.PRODUCT_VARIANTS}.color`,
      `${TABLES.PRODUCT_VARIANTS}.material`,
      `${TABLES.PRODUCTS}.product_name`,
    )
    .where(`${TABLES.ORDER_DETAILS}.order_id`, orderId);

  return {
    order: {
      order_id: order.order_id,
      order_code: order.order_code,
      total_amount: parseFloat(order.total_amount),
      discount_amount: parseFloat(order.discount_amount),
      shipping_fee: parseFloat(order.shipping_fee),
      final_amount: parseFloat(order.final_amount),
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      note: order.note,
      created_at: order.created_at,
    },
    customer: customer
      ? {
          user_id: customer.user_id,
          full_name: customer.full_name,
          email: customer.email,
          phone: customer.phone,
        }
      : null,
    address: address
      ? {
          address_id: address.address_id,
          receiver_name: address.receiver_name,
          receiver_phone: address.receiver_phone,
          province: address.province,
          ward: address.ward,
          detail_address: address.detail_address,
        }
      : null,
    coupon: coupon
      ? {
          coupon_id: coupon.coupon_id,
          coupon_code: coupon.coupon_code,
          coupon_name: coupon.coupon_name,
          discount_type: coupon.discount_type,
          discount_value: parseFloat(coupon.discount_value),
        }
      : null,
    payment: payment
      ? {
          payment_id: payment.payment_id,
          payment_code: payment.payment_code,
          amount: parseFloat(payment.amount),
          payment_status: payment.payment_status,
          paid_at: payment.paid_at,
        }
      : null,
    order_details: orderDetails.map((detail) => ({
      order_detail_id: detail.order_detail_id,
      product_name: detail.product_name,
      sku: detail.sku,
      color: detail.color,
      size: detail.size,
      material: detail.material,
      quantity: detail.quantity,
      unit_price: parseFloat(detail.unit_price),
      subtotal: parseFloat(detail.total_price),
    })),
  };
}

async function updateOrderStatus(orderIdParam, newStatus) {
  const orderId = parseOrderId(orderIdParam);

  await db.transaction(async (trx) => {
    const order = await ensureOrderExists(orderId, trx);
    const oldStatus = order.order_status;

    if (oldStatus === newStatus) {
      return; // No change needed
    }

    // Validate status transitions
    const allowedTransitions = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED],
      [ORDER_STATUS.DELIVERED]: [], // Final state
      [ORDER_STATUS.CANCELLED]: [], // Final state
    };

    if (
      !allowedTransitions[oldStatus] ||
      !allowedTransitions[oldStatus].includes(newStatus)
    ) {
      throw new AppError(
        `Invalid status transition from ${oldStatus} to ${newStatus}`,
        400,
      );
    }

    // Update order status
    await trx(TABLES.ORDERS)
      .where({ order_id: orderId })
      .update({ order_status: newStatus });

    // Handle specific business rules based on new status
    if (
      newStatus === ORDER_STATUS.DELIVERED &&
      order.payment_method === "COD"
    ) {
      await trx(TABLES.ORDERS)
        .where({ order_id: orderId })
        .update({ payment_status: "Paid" });

      await trx(TABLES.PAYMENTS)
        .where({ order_id: orderId })
        .update({ payment_status: "Paid", paid_at: db.fn.now() });
    } else if (newStatus === ORDER_STATUS.CANCELLED) {
      const orderDetails = await trx(TABLES.ORDER_DETAILS)
        .where({ order_id: orderId })
        .select();

      for (const detail of orderDetails) {
        await increaseVariantStock(detail.variant_id, detail.quantity, trx);
        await createInventoryTransaction(
          detail.variant_id,
          detail.quantity,
          INVENTORY_TRANSACTION_TYPE.CANCEL,
          `Order #${order.order_code} cancelled by admin`,
          trx,
        );
      }
    }
  });

  return await getAdminOrderById(orderId);
}

async function cancelOrder(userId, orderIdParam) {
  const orderId = parseOrderId(orderIdParam);

  await db.transaction(async (trx) => {
    const order = await ensureOrderBelongsToUser(userId, orderId, trx);

    if (
      order.order_status === ORDER_STATUS.SHIPPING ||
      order.order_status === ORDER_STATUS.DELIVERED ||
      order.order_status === ORDER_STATUS.CANCELLED
    ) {
      throw new AppError(
        `Cannot cancel order with status ${order.order_status}`,
        400,
      );
    }

    const orderDetails = await trx(TABLES.ORDER_DETAILS)
      .where({ order_id: orderId })
      .select();

    for (const detail of orderDetails) {
      await increaseVariantStock(detail.variant_id, detail.quantity, trx);
      await createInventoryTransaction(
        detail.variant_id,
        detail.quantity,
        INVENTORY_TRANSACTION_TYPE.CANCEL,
        `Order #${order.order_code} cancelled`,
        trx,
      );
    }

    await trx(TABLES.ORDERS)
      .where({ order_id: orderId })
      .update({ order_status: ORDER_STATUS.CANCELLED });
  });

  return await getOrderById(userId, orderId);
}

async function calculateShippingFee({
  province,
  district,
  ward,
  weight,
  value,
}) {
  try {
    const response = await axios.get(
      "https://services.giaohangtietkiem.vn/services/shipment/fee",
      {
        params: {
          pick_province: process.env.STORE_PROVINCE,
          pick_district: process.env.STORE_DISTRICT,

          province,
          district,

          address: ward,

          weight,
          value,

          transport: "road",
        },
        headers: {
          Token: process.env.GHTK_TOKEN,
        },
      },
    );

    console.log("GHTK RESPONSE:", response.data);

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Unable to calculate shipping fee",
      );
    }

    return response.data.fee.fee;
  } catch (error) {
    console.error("GHTK ERROR:", error.response?.data || error.message);

    throw error;
  }
}

module.exports = {
  checkout,
  getOrders,
  getOrderById,
  cancelOrder,
  calculateShippingFee,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  calculateOrderPreview,
};
