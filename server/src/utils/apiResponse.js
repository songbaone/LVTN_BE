function sendSuccess(res, message = '', data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? {},
  });
}

function sendError(res, message = '', errors = [], statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [],
  });
}

module.exports = {
  sendSuccess,
  sendError,
};
