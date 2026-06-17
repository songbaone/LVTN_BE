const { sendError } = require('../utils/apiResponse');

function notFound(req, res) {
  return sendError(res, `Route ${req.method} ${req.originalUrl} not found`, [], 404);
}

module.exports = notFound;
