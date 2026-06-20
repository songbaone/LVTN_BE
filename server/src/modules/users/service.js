const fs = require('fs');
const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { hashPassword } = require('../../utils/password');

function removeUploadedFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}

const ALLOWED_SORT_FIELDS = ['created_at', 'full_name', 'email', 'status', 'user_id'];
const DEFAULT_SORT_FIELD = 'Users.created_at';
const DEFAULT_SORT_ORDER = 'desc';

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

  if (filters.phone) {
    query.where('Users.phone', 'like', `%${filters.phone}%`);
  }

  if (filters.role_id) {
    query.where('Users.role_id', filters.role_id);
  }

  if (filters.status !== undefined && filters.status !== null) {
    query.where('Users.status', filters.status);
  }

  if (filters.from_date) {
    query.where('Users.created_at', '>=', filters.from_date);
  }

  if (filters.to_date) {
    query.where('Users.created_at', '<=', filters.to_date);
  }

  return query;
}

function applySorting(query, filters) {
  const sortField = ALLOWED_SORT_FIELDS.includes(filters.sort_by)
    ? `Users.${filters.sort_by}`
    : DEFAULT_SORT_FIELD;

  const sortOrder = filters.sort_order === 'asc' ? 'asc' : DEFAULT_SORT_ORDER;

  return query.orderBy(sortField, sortOrder);
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
    phone: queryParams.phone?.trim() || null,
    role_id: queryParams.role_id ? parseInt(queryParams.role_id, 10) : null,
    status:
      queryParams.status !== undefined
        ? parseInt(queryParams.status, 10)
        : undefined,
    from_date: queryParams.from_date || null,
    to_date: queryParams.to_date || null,
    sort_by: queryParams.sort_by || null,
    sort_order: queryParams.sort_order || null,
  };

  let countQuery = db(TABLES.USERS).join(
    TABLES.ROLES,
    'Users.role_id',
    'Roles.role_id'
  );
  countQuery = applyUserFilters(countQuery, filters);
  const countResult = await countQuery.count({ total: 'Users.user_id' });
  const total = Number(countResult[0]?.total ?? 0);

  const usersQuery = applySorting(
    applyUserFilters(buildUsersListQuery(), filters),
    filters
  )
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

async function ensureEmailAvailable(email, excludeUserId = null) {
  const query = db(TABLES.USERS).where({ email });

  if (excludeUserId) {
    query.whereNot({ user_id: excludeUserId });
  }

  const existing = await query.first();

  if (existing) {
    throw new AppError('Email is already registered', 409);
  }
}

async function ensurePhoneAvailable(phone, excludeUserId = null) {
  if (!phone) {
    return;
  }

  const query = db(TABLES.USERS).where({ phone });

  if (excludeUserId) {
    query.whereNot({ user_id: excludeUserId });
  }

  const existing = await query.first();

  if (existing) {
    throw new AppError('Phone number is already in use', 409);
  }
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

async function createUser(data) {
  await ensureEmailAvailable(data.email);

  if (data.phone) {
    await ensurePhoneAvailable(data.phone);
  }

  if (data.role_id) {
    await ensureRoleExists(data.role_id);
  }

  const { password_hash, salt } = await hashPassword(data.password);

  const insertData = {
    full_name: data.full_name,
    email: data.email,
    password_hash,
    salt,
    role_id: data.role_id || 3, // default to CUSTOMER role if not specified
    phone: data.phone || null,
    gender: data.gender || null,
    birth_date: data.birth_date || null,
    avatar: data.avatar || null,
    status: 1,
  };

  const [newUserId] = await db(TABLES.USERS).insert(insertData);

  return getUserById(newUserId);
}

async function updateUser(userIdParam, data) {
  const userId = parseUserId(userIdParam);

  await ensureUserExists(userId);

  if (data.email) {
    await ensureEmailAvailable(data.email, userId);
  }

  if (data.phone !== undefined) {
    await ensurePhoneAvailable(data.phone, userId);
  }

  if (data.role_id) {
    await ensureRoleExists(data.role_id);
  }

  const updateData = {};

  if (data.full_name !== undefined) {
    updateData.full_name = data.full_name;
  }

  if (data.email !== undefined) {
    updateData.email = data.email;
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone || null;
  }

  if (data.gender !== undefined) {
    updateData.gender = data.gender || null;
  }

  if (data.birth_date !== undefined) {
    updateData.birth_date = data.birth_date || null;
  }

  if (data.avatar !== undefined) {
    updateData.avatar = data.avatar || null;
  }

  if (data.role_id !== undefined) {
    updateData.role_id = data.role_id;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  await db(TABLES.USERS).where({ user_id: userId }).update(updateData);

  return getUserById(userId);
}

async function getRoleDistribution() {
  const rows = await db(TABLES.USERS)
    .join(TABLES.ROLES, 'Users.role_id', 'Roles.role_id')
    .select('Roles.role_name')
    .count({ count: 'Users.user_id' })
    .groupBy('Roles.role_name');

  const distribution = {
    admin: 0,
    staff: 0,
    customer: 0,
  };

  for (const row of rows) {
    const key = row.role_name.toLowerCase();

    if (key in distribution) {
      distribution[key] = Number(row.count);
    }
  }

  return distribution;
}

async function getUserStatistics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalResult, activeResult, newThisMonthResult, roleDistribution] =
    await Promise.all([
      db(TABLES.USERS).count({ count: '*' }).first(),
      db(TABLES.USERS).where('status', 1).count({ count: '*' }).first(),
      db(TABLES.USERS)
        .where('created_at', '>=', startOfMonth)
        .count({ count: '*' })
        .first(),
      getRoleDistribution(),
    ]);

  return {
    total_users: Number(totalResult?.count ?? 0),
    active_users: Number(activeResult?.count ?? 0),
    new_users_this_month: Number(newThisMonthResult?.count ?? 0),
    role_distribution: roleDistribution,
  };
}

async function updateProfile(userId, data, file = null) {
  await ensureUserExists(userId);

  if (data.phone !== undefined) {
    await ensurePhoneAvailable(data.phone, userId);
  }

  const updateData = {};

  if (data.full_name !== undefined) {
    updateData.full_name = data.full_name;
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone || null;
  }

  if (data.gender !== undefined) {
    updateData.gender = data.gender || null;
  }

  if (data.birth_date !== undefined) {
    updateData.birth_date = data.birth_date || null;
  }

  if (file) {
    updateData.avatar = `/uploads/avatars/${file.filename}`;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  try {
    await db(TABLES.USERS).where({ user_id: userId }).update(updateData);

    return getUserById(userId);
  } catch (error) {
    removeUploadedFile(file);
    throw error;
  }
}

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  lockUser,
  unlockUser,
  createUser,
  updateUser,
  getUserStatistics,
  updateProfile,
};
