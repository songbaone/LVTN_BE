const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { sendError } = require('../utils/apiResponse');
const tokenBlacklist = require('../utils/tokenBlacklist');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access token is required', [], 401);
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return sendError(res, 'Access token is required', [], 401);
    }

    if (tokenBlacklist.has(token)) {
      return sendError(res, 'Token has been revoked', [], 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    req.token = token;

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Access token has expired', [], 401);
    }

    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid access token', [], 401);
    }

    return next(error);
  }
}

module.exports = authenticate;
