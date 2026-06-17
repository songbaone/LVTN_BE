const { validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

function validate(req, res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const errors = result.array().map((err) => ({
      field: err.path,
      message: err.msg,
      location: err.location,
    }));

    return sendError(res, 'Validation failed', errors, 422);
  }

  return next();
}

module.exports = validate;
