const rolesService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getAllRoles(req, res, next) {
  try {
    const roles = await rolesService.getAllRoles();

    return sendSuccess(res, 'Roles retrieved successfully', { roles });
  } catch (error) {
    return next(error);
  }
}

async function getRoleById(req, res, next) {
  try {
    const role = await rolesService.getRoleById(req.params.id);

    return sendSuccess(res, 'Role retrieved successfully', role);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAllRoles,
  getRoleById,
};
