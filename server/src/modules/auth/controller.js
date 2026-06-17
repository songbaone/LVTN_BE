const authService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);

    return sendSuccess(res, 'Registration successful', result, 201);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);

    return sendSuccess(res, 'Login successful', result);
  } catch (error) {
    return next(error);
  }
}

async function adminLogin(req, res, next) {
  try {
    const result = await authService.adminLogin(req.body);

    return sendSuccess(
      res,
      'Admin login successful',
      result
    );
  } catch (error) {
    return next(error);
  }
}

async function googleLogin(req, res, next) {
  try {
    const result = await authService.googleLogin(req.body);

    return sendSuccess(res, 'Google login successful', result);
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    authService.logout(req.token);

    return sendSuccess(res, 'Logout successful', {});
  } catch (error) {
    return next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const profile = await authService.getProfile(req.user.user_id);

    return sendSuccess(res, 'Profile retrieved successfully', profile);
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const profile = await authService.updateProfile(req.user.user_id, req.body);

    return sendSuccess(res, 'Profile updated successfully', profile);
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword(req.user.user_id, req.body);

    return sendSuccess(res, 'Password changed successfully', {});
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  adminLogin,
  googleLogin,
  logout,
  getProfile,
  updateProfile,
  changePassword,
};
