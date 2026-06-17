const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');

function mapRole(record) {
  if (!record) {
    return null;
  }

  return {
    role_id: record.role_id,
    role_name: record.role_name,
    description: record.description ?? null,
  };
}

function parseRoleId(roleId) {
  const id = parseInt(roleId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid role ID', 400);
  }

  return id;
}

async function getAllRoles() {
  const roles = await db(TABLES.ROLES)
    .select('role_id', 'role_name', 'description')
    .orderBy('role_id', 'asc');

  return roles.map(mapRole);
}

async function getRoleById(roleId) {
  const id = parseRoleId(roleId);

  const role = await db(TABLES.ROLES)
    .select('role_id', 'role_name', 'description')
    .where({ role_id: id })
    .first();

  if (!role) {
    throw new AppError('Role not found', 404);
  }

  return mapRole(role);
}

module.exports = {
  getAllRoles,
  getRoleById,
};
