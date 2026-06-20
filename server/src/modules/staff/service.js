const fs = require('fs');
const { db } = require('../../database/connection');
const { TABLES, ROLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { hashPassword } = require('../../utils/password');

function removeUploadedFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}

function parseStaffId(staffId) {
  const id = parseInt(staffId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid staff ID', 400);
  }

  return id;
}

function mapStaffListItem(record) {
  return {
    user_id: record.user_id,
    full_name: record.full_name,
    email: record.email,
    phone: record.phone ?? null,
    status: Boolean(record.status),
    created_at: record.created_at,
  };
}

function mapStaffDetail(record) {
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

async function getStaffRoleId() {
  const role = await db(TABLES.ROLES)
    .where({ role_name: ROLES.STAFF })
    .select('role_id')
    .first();

  if (!role) {
    throw new AppError('Staff role is not configured', 500);
  }

  return role.role_id;
}

function buildStaffListQuery(staffRoleId) {
  return db(TABLES.USERS)
    .select(
      'Users.user_id',
      'Users.full_name',
      'Users.email',
      'Users.phone',
      'Users.status',
      'Users.created_at'
    )
    .where('Users.role_id', staffRoleId);
}

function applyStaffFilters(query, filters) {
  if (filters.full_name) {
    query.where('Users.full_name', 'like', `%${filters.full_name}%`);
  }

  if (filters.email) {
    query.where('Users.email', 'like', `%${filters.email}%`);
  }

  if (filters.phone) {
    query.where('Users.phone', 'like', `%${filters.phone}%`);
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

async function getStaffList(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);
  const staffRoleId = await getStaffRoleId();

  const filters = {
    full_name: queryParams.full_name?.trim() || null,
    email: queryParams.email?.trim() || null,
    phone: queryParams.phone?.trim() || null,
    status:
      queryParams.status !== undefined
        ? parseInt(queryParams.status, 10)
        : undefined,
    from_date: queryParams.from_date || null,
    to_date: queryParams.to_date || null,
  };

  let countQuery = db(TABLES.USERS).where('role_id', staffRoleId);
  countQuery = applyStaffFilters(countQuery, filters);
  const countResult = await countQuery.count({ total: '*' });
  const total = Number(countResult[0]?.total ?? 0);

  const staffQuery = applyStaffFilters(
    buildStaffListQuery(staffRoleId),
    filters
  )
    .orderBy('Users.created_at', 'desc')
    .offset(offset)
    .limit(limit);

  const staff = await staffQuery;

  return {
    staff: staff.map(mapStaffListItem),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function findStaffById(staffIdParam) {
  const staffId = parseStaffId(staffIdParam);
  const staffRoleId = await getStaffRoleId();

  const record = await db(TABLES.USERS)
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
      'Users.updated_at'
    )
    .where('Users.user_id', staffId)
    .where('Users.role_id', staffRoleId)
    .first();

  return record;
}

async function getStaffById(staffIdParam) {
  const record = await findStaffById(staffIdParam);

  if (!record) {
    throw new AppError('Staff not found', 404);
  }

  return { staff: mapStaffDetail(record) };
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

async function ensureUserExists(userId) {
  const user = await db(TABLES.USERS).where({ user_id: userId }).first();

  if (!user) {
    throw new AppError('Staff not found', 404);
  }

  return user;
}

async function createStaff(data) {
  const staffRoleId = await getStaffRoleId();

  await ensureEmailAvailable(data.email);

  if (data.phone) {
    await ensurePhoneAvailable(data.phone);
  }

  const { password_hash, salt } = await hashPassword(data.password);

 const inserted = await db(TABLES.USERS)
  .insert({
    full_name: data.full_name,
    email: data.email,
    phone: data.phone || null,
    gender: data.gender || null,
    birth_date: data.birth_date || null,
    avatar: data.avatar || null,
    password_hash,
    salt,
    role_id: staffRoleId,
    status: 1,
  })
  .returning('user_id');

  return getStaffById(inserted[0].user_id);
}

async function updateStaff(staffIdParam, data, file = null) {
  const staffId = parseStaffId(staffIdParam);

  await ensureUserExists(staffId);

  if (data.email) {
    await ensureEmailAvailable(data.email, staffId);
  }

  if (data.phone !== undefined) {
    await ensurePhoneAvailable(data.phone, staffId);
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

  if (file) {
    updateData.avatar = `/uploads/avatars/${file.filename}`;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  try {
    await db(TABLES.USERS).where({ user_id: staffId }).update(updateData);

    return getStaffById(staffId);
  } catch (error) {
    removeUploadedFile(file);
    throw error;
  }
}

async function lockStaff(staffIdParam) {
  const staffId = parseStaffId(staffIdParam);
  const record = await findStaffById(staffId);

  if (!record) {
    throw new AppError('Staff not found', 404);
  }

  await db(TABLES.USERS).where({ user_id: staffId }).update({ status: 0 });

  return getStaffById(staffId);
}

async function unlockStaff(staffIdParam) {
  const staffId = parseStaffId(staffIdParam);
  const record = await findStaffById(staffId);

  if (!record) {
    throw new AppError('Staff not found', 404);
  }

  await db(TABLES.USERS).where({ user_id: staffId }).update({ status: 1 });

  return getStaffById(staffId);
}

async function getStaffStatistics() {
  const staffRoleId = await getStaffRoleId();

  const [totalResult, activeResult, lockedResult] = await Promise.all([
    db(TABLES.USERS).where('role_id', staffRoleId).count({ count: '*' }).first(),
    db(TABLES.USERS)
      .where('role_id', staffRoleId)
      .where('status', 1)
      .count({ count: '*' })
      .first(),
    db(TABLES.USERS)
      .where('role_id', staffRoleId)
      .where('status', 0)
      .count({ count: '*' })
      .first(),
  ]);

  return {
    total_staff: Number(totalResult?.count ?? 0),
    active_staff: Number(activeResult?.count ?? 0),
    locked_staff: Number(lockedResult?.count ?? 0),
  };
}

module.exports = {
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  lockStaff,
  unlockStaff,
  getStaffStatistics,
  findStaffById,
  getStaffRoleId,
};