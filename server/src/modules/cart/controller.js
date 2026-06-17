const cartService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getCart(req, res, next) {
  try {
    const result = await cartService.getCart(req.user.user_id);

    return sendSuccess(res, 'Cart retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function addItem(req, res, next) {
  try {
    console.log('Adding item to cart', req.body);
    const result = await cartService.addItem(
      req.user.user_id,
      req.body.variant_id,
      req.body.quantity
    );


    return sendSuccess(res, 'Item added to cart successfully', result, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const result = await cartService.updateItem(
      req.user.user_id,
      req.params.itemId,
      req.body.quantity
    );

    return sendSuccess(res, 'Cart item updated successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function deleteItem(req, res, next) {
  try {
    const result = await cartService.deleteItem(req.user.user_id, req.params.itemId);

    return sendSuccess(res, 'Cart item deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function clearCart(req, res, next) {
  try {
    const result = await cartService.clearCart(req.user.user_id);

    return sendSuccess(res, 'Cart cleared successfully', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  deleteItem,
  clearCart,
};
