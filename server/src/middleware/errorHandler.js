const { env } = require('../config/env');
const { sendError } = require('../utils/apiResponse');

class AppError extends Error {
  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return sendError(res, err.message, err.errors, err.statusCode);
  }

  if (err.name === 'UnauthorizedError') {
    return sendError(res, 'Unauthorized', [], 401);
  }

  if (err.code === 'EREQUEST' || err.code === 'ELOGIN') {
  const message =
    env.NODE_ENV === 'production'
      ? 'Database operation failed'
      : err.message;

  return sendError(res, message, [], 500);
}

  if (env.NODE_ENV !== 'production') {
    console.error(err);
  }

  const message =
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return sendError(res, message, [], 500);
}

module.exports = {
  AppError,
  errorHandler,
};
