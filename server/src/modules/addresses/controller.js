const addressesService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getAddresses(req, res, next) {
  try {
    const result = await addressesService.getAddresses(req.user.user_id);

    return sendSuccess(res, 'Addresses retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getAddressById(req, res, next) {
  try {
    const address = await addressesService.getAddressById(
      req.user.user_id,
      req.params.id
    );

    return sendSuccess(res, 'Address retrieved successfully', address);
  } catch (error) {
    return next(error);
  }
}

async function createAddress(req, res, next) {
  try {
    const address = await addressesService.createAddress(
      req.user.user_id,
      req.body
    );

    return sendSuccess(res, 'Address created successfully', address, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateAddress(req, res, next) {
  try {
    const address = await addressesService.updateAddress(
      req.user.user_id,
      req.params.id,
      req.body
    );

    return sendSuccess(res, 'Address updated successfully', address);
  } catch (error) {
    return next(error);
  }
}

async function deleteAddress(req, res, next) {
  try {
    const result = await addressesService.deleteAddress(
      req.user.user_id,
      req.params.id
    );

    return sendSuccess(res, 'Address deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function setDefaultAddress(req, res, next) {
  try {
    const address = await addressesService.setDefaultAddress(
      req.user.user_id,
      req.params.id
    );

    return sendSuccess(res, 'Default address updated successfully', address);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
