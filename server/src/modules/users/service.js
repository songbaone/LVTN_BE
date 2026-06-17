const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');

function parseUserId(userId) {
  const id = parseInt(userId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid user ID', 400);
  }

  return id;
}

function mapRoleInfo(record) {
  return {
    role_id: record.role_id,
    role_name: record.role_name,
    description: record.role_description ?? null,
  };
}

function mapUserListItem(record) {
  return {
    user_id: record.user_id,
    full_name: record.full_name,
    email: record.email,
    phone: record.phone ?? null,
    role: {
      role_id: record.role_id,
      role_name: record.role_name,
    },
    status: Boolean(record.status),
    created_at: record.created_at,
  };
}

function mapUserInfo(record) {
  return {
    user_id: record.user_id,
    full_name: record.full_name,
    email: record.email,
    phone: record.phone ?? null,
    gender: record.gender ?? null,
    birth_date: record.birth_date ?? null,
    avatar: record.avatar ?? null,
    status: Boolean(record.status),
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function applyUserFilters(query, filters) {
  if (filters.full_name) {
    query.where('Users.full_name', 'like', `%${filters.full_name}%`);
  }

  if (filters.email) {
    query.where('Users.email', 'like', `%${filters.email}%`);
  }

  if (filters.role_id) {
    query.where('Users.role_id', filters.role_id);
  }

  if (filters.status !== undefined && filters.status !== null) {
    query.where('Users.status', filters.status);
  }

  return query;
}

function buildUsersListQuery() {
  return db(TABLES.USERS)
    .join(TABLES.ROLES, 'Users.role_id', 'Roles.role_id')
    .select(
      'Users.user_id',
      'Users.full_name',
      'Users.email',
      'Users.phone',
      'Users.status',
      'Users.created_at',
      'Users.role_id',
      'Roles.role_name'
    );
}

async function getUsers(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);

  const filters = {
    full_name: queryParams.full_name?.trim() || null,
    email: queryParams.email?.trim() || null,
    role_id: queryParams.role_id ? parseInt(queryParams.role_id, 10) : null,
    status:
      queryParams.status !== undefined
        ? parseInt(queryParams.status, 10)
        : undefined,
  };

  let countQuery = db(TABLES.USERS).join(
    TABLES.ROLES,
    'Users.role_id',
    'Roles.role_id'
  );
  countQuery = applyUserFilters(countQuery, filters);
  const countResult = await countQuery.count({ total: 'Users.user_id' });
  const total = Number(countResult[0]?.total ?? 0);

  const usersQuery = applyUserFilters(buildUsersListQuery(), filters)
    .orderBy('Users.created_at', 'desc')
    .offset(offset)
    .limit(limit);

  const users = await usersQuery;

  return {
    users: users.map(mapUserListItem),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function findUserWithRole(userId) {
  return db(TABLES.USERS)
    .join(TABLES.ROLES, 'Users.role_id', 'Roles.role_id')
    .select(
      'Users.user_id',
      'Users.full_name',
      'Users.email',
      'Users.phone',
      'Users.gender',
      'Users.birth_date',
      'Users.avatar',
      'Users.status',
      'Users.created_at',
      'Users.updated_at',
      'Users.role_id',
      'Roles.role_name',
      'Roles.description as role_description'
    )
    .where('Users.user_id', userId)
    .first();
}

async function getUserCounts(userId) {
  const [addressResult, orderResult] = await Promise.all([
    db(TABLES.ADDRESSES).where({ user_id: userId }).count({ count: '*' }),
    db(TABLES.ORDERS).where({ user_id: userId }).count({ count: '*' }),
  ]);

  return {
    address_count: Number(addressResult[0]?.count ?? 0),
    order_count: Number(orderResult[0]?.count ?? 0),
  };
}

async function getUserById(userIdParam) {
  const userId = parseUserId(userIdParam);
  const user = await findUserWithRole(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const counts = await getUserCounts(userId);

  return {
    user: mapUserInfo(user),
    role: mapRoleInfo(user),
    address_count: counts.address_count,
    order_count: counts.order_count,
  };
}

async function ensureUserExists(userId) {
  const user = await db(TABLES.USERS).where({ user_id: userId }).first();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

async function ensureRoleExists(roleId) {
  const role = await db(TABLES.ROLES).where({ role_id: roleId }).first();

  if (!role) {
    throw new AppError('Role not found', 404);
  }

  return role;
}

async function updateUserRole(userIdParam, roleId) {
  const userId = parseUserId(userIdParam);
  const parsedRoleId = parseInt(roleId, 10);

  if (Number.isNaN(parsedRoleId) || parsedRoleId < 1) {
    throw new AppError('Invalid role ID', 400);
  }

  await ensureUserExists(userId);
  await ensureRoleExists(parsedRoleId);

  await db(TABLES.USERS).where({ user_id: userId }).update({
    role_id: parsedRoleId,
  });

  return getUserById(userId);
}

async function setUserStatus(userIdParam, status) {
  const userId = parseUserId(userIdParam);

  await ensureUserExists(userId);

  await db(TABLES.USERS).where({ user_id: userId }).update({ status });

  return getUserById(userId);
}

async function lockUser(userIdParam) {
  return setUserStatus(userIdParam, 0);
}

async function unlockUser(userIdParam) {
  return setUserStatus(userIdParam, 1);
}

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  lockUser,
  unlockUser,
};
