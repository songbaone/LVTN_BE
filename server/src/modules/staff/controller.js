const staffService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getStaffList(req, res, next) {
  try {
    const result = await staffService.getStaffList(req.query);

    return sendSuccess(res, 'Staff list retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getStaffById(req, res, next) {
  try {
    const result = await staffService.getStaffById(req.params.id);

    return sendSuccess(res, 'Staff retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function createStaff(req, res, next) {
  try {
    const result = await staffService.createStaff(req.body);

    return sendSuccess(res, 'Staff account created successfully', result, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateStaff(req, res, next) {
  try {
    const result = await staffService.updateStaff(req.params.id, req.body);

    return sendSuccess(res, 'Staff updated successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function lockStaff(req, res, next) {
  try {
    const result = await staffService.lockStaff(req.params.id);

    return sendSuccess(res, 'Staff locked successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function unlockStaff(req, res, next) {
  try {
    const result = await staffService.unlockStaff(req.params.id);

    return sendSuccess(res, 'Staff unlocked successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getStaffStatistics(req, res, next) {
  try {
    const statistics = await staffService.getStaffStatistics();

    return sendSuccess(res, 'Staff statistics retrieved successfully', statistics);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  lockStaff,
  unlockStaff,
  getStaffStatistics,
};