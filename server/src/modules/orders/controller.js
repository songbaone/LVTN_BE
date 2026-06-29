const ordersService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function checkout(req, res, next) {
  try {
    // const result = await ordersService.checkout(
    //   req.user.user_id,
    //   req.body.address_id,
    //   req.body.coupon_code,
    //   req.body.payment_method
    // );

    const result = await ordersService.checkout(
        req.user.user_id,
        req.body.address_id,
        req.body.coupon_code,
        req.body.payment_method || 'COD',

        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip
    );

    return sendSuccess(res, 'Order created successfully', result, 201);
  } catch (error) {
    return next(error);
  }
}

async function getOrders(req, res, next) {
  try {
    const result = await ordersService.getOrders(req.user.user_id, req.query);

    return sendSuccess(res, 'Orders retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getOrderById(req, res, next) {
  try {
    const order = await ordersService.getOrderById(req.user.user_id, req.params.id);

    return sendSuccess(res, 'Order retrieved successfully', order);
  } catch (error) {
    return next(error);
  }
}

async function previewOrder(req, res, next) {
  try {
    const result = await ordersService.calculateOrderPreview(
      req.user.user_id,
      req.body.address_id,
      req.body.coupon_code,
    );

    const response = {
      subtotal: parseFloat(result.subtotal),
      discount_amount: parseFloat(result.discountAmount),
      shipping_fee: parseFloat(result.shippingFee),
      final_amount: parseFloat(result.finalAmount),
      coupon: result.coupon
        ? {
            coupon_code: result.coupon.coupon_code,
            discount_amount: parseFloat(result.discountAmount),
          }
        : null,
    };

    return sendSuccess(res, 'Order preview retrieved successfully', response);
  } catch (error) {
    return next(error);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const order = await ordersService.cancelOrder(req.user.user_id, req.params.id);

    return sendSuccess(res, 'Order cancelled successfully', order);
  } catch (error) {
    return next(error);
  }
}

async function getAdminOrders(req, res, next) {
  try {
    const result = await ordersService.getAdminOrders(req.query);
    return sendSuccess(res, 'Admin orders retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getAdminOrderById(req, res, next) {
  try {
    const order = await ordersService.getAdminOrderById(req.params.id);
    return sendSuccess(res, 'Admin order retrieved successfully', order);
  } catch (error) {
    return next(error);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    const order = await ordersService.updateOrderStatus(req.params.id, status);
    return sendSuccess(res, 'Order status updated successfully', order);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  checkout,
  getOrders,
  getOrderById,
  cancelOrder,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  previewOrder,
};
