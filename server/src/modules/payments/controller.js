const paymentsService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getPayments(req, res, next) {
  try {
    const result = await paymentsService.getPayments(req.query);

    return sendSuccess(res, 'Payments retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getPaymentById(req, res, next) {
  try {
    const payment = await paymentsService.getPaymentById(req.params.id);

    return sendSuccess(res, 'Payment retrieved successfully', payment);
  } catch (error) {
    return next(error);
  }
}

async function updatePaymentStatus(req, res, next) {
  try {
    const payment = await paymentsService.updatePaymentStatus(
      req.params.id,
      req.body.payment_status
    );

    return sendSuccess(res, 'Payment status updated successfully', payment);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPayments,
  getPaymentById,
  updatePaymentStatus,
};
