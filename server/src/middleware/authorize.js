const { sendError } = require('../utils/apiResponse');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', [], 401);
    }

    const roleName = req.user.role_name;

    if (!roleName || !allowedRoles.includes(roleName)) {
      return sendError(res, 'You do not have permission to perform this action', [], 403);
    }

    return next();
  };
}

module.exports = authorize;
