const usersService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getUsers(req, res, next) {
  try {
    const result = await usersService.getUsers(req.query);

    return sendSuccess(res, 'Users retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);

    return sendSuccess(res, 'User retrieved successfully', user);
  } catch (error) {
    return next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const user = await usersService.updateUserRole(
      req.params.id,
      req.body.role_id
    );

    return sendSuccess(res, 'User role updated successfully', user);
  } catch (error) {
    return next(error);
  }
}

async function lockUser(req, res, next) {
  try {
    const user = await usersService.lockUser(req.params.id);

    return sendSuccess(res, 'User locked successfully', user);
  } catch (error) {
    return next(error);
  }
}

async function unlockUser(req, res, next) {
  try {
    const user = await usersService.unlockUser(req.params.id);

    return sendSuccess(res, 'User unlocked successfully', user);
  } catch (error) {
    return next(error);
  }
}

async function getUserStatistics(req, res, next) {
  try {
    const statistics = await usersService.getUserStatistics();

    return sendSuccess(res, 'User statistics retrieved successfully', statistics);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  lockUser,
  unlockUser,
  getUserStatistics,
};
