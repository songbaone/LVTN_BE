const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { db } = require('../../database/connection');
const { env, getEnv } = require('../../config/env');
const { TABLES, ROLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { hashPassword, comparePassword } = require('../../utils/password');
const tokenBlacklist = require('../../utils/tokenBlacklist');

const USER_PUBLIC_COLUMNS = [
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
  'Roles.description as role_description',
];

function sanitizeUser(record) {
  if (!record) {
    return null;
  }

  const {
    password_hash: _passwordHash,
    salt: _salt,
    role_name,
    role_description,
    ...user
  } = record;

  return {
    ...user,
    role: {
      role_id: user.role_id,
      role_name,
      description: role_description ?? null,
    },
  };
}

function buildAuthPayload(user) {
  return {
    user_id: user.user_id,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
  };
}

function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

async function getRoleByName(roleName) {
  const role = await db(TABLES.ROLES).where({ role_name: roleName }).first();

  if (!role) {
    throw new AppError(`Role ${roleName} is not configured`, 500);
  }

  return role;
}

async function findUserByEmail(email) {
  return db(TABLES.USERS)
    .select(`${TABLES.USERS}.*`, `${TABLES.ROLES}.role_name`)
    .join(TABLES.ROLES, `${TABLES.USERS}.role_id`, `${TABLES.ROLES}.role_id`)
    .where(`${TABLES.USERS}.email`, email)
    .first();
}

async function findUserById(userId) {
  return db(TABLES.USERS)
    .select(...USER_PUBLIC_COLUMNS)
    .join(TABLES.ROLES, `${TABLES.USERS}.role_id`, `${TABLES.ROLES}.role_id`)
    .where(`${TABLES.USERS}.user_id`, userId)
    .first();
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

function assertActiveAccount(user) {
  if (!user.status) {
    throw new AppError('Your account has been locked. Please contact support', 403);
  }
}

function buildAuthResponse(user) {
  const payload = buildAuthPayload(user);
  const access_token = generateAccessToken(payload);

  return {
    access_token,
    user: sanitizeUser(user),
  };
}

async function register({ full_name, email, password }) {
  await ensureEmailAvailable(email);

  const customerRole = await getRoleByName(ROLES.CUSTOMER);
  const { password_hash, salt } = await hashPassword(password);

  await db.transaction(async (trx) => {
    await trx(TABLES.USERS).insert({
      full_name,
      email,
      password_hash,
      salt,
      role_id: customerRole.role_id,
      status: 1,
    });

    const user = await trx(TABLES.USERS)
      .where({ email })
      .first();

    await trx(TABLES.CART).insert({
      user_id: user.user_id,
    });
  });

  const user = await findUserByEmail(email);
  return buildAuthResponse(user);
}

async function login({ email, password }) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  assertActiveAccount(user);

  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  return buildAuthResponse(user);
}


async function adminLogin({ email, password }) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  assertActiveAccount(user);

  const isPasswordValid = await comparePassword(
    password,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const allowedRoles = [
    ROLES.ADMIN,
    ROLES.STAFF,
  ];

  if (!allowedRoles.includes(user.role_name)) {
    throw new AppError(
      'Only admin and staff can login here',
      403
    );
  }

  return buildAuthResponse(user);
}

async function verifyGoogleToken(idToken) {
  const googleClientId = getEnv('GOOGLE_CLIENT_ID', '');

  if (!googleClientId) {
    throw new AppError('Google login is not configured', 500);
  }

  const client = new OAuth2Client(googleClientId);

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new AppError('Unable to retrieve email from Google account', 400);
    }

    if (!payload.email_verified) {
      throw new AppError('Google email is not verified', 400);
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid Google token', 401);
  }
}

async function googleLogin({ id_token: idToken }) {
  const googleProfile = await verifyGoogleToken(idToken);
  const email = googleProfile.email.toLowerCase();

  let user = await findUserByEmail(email);

  if (!user) {
    const customerRole = await getRoleByName(ROLES.CUSTOMER);
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const { password_hash, salt } = await hashPassword(randomPassword);

    await db(TABLES.USERS).insert({
      full_name: googleProfile.name || email.split('@')[0],
      email,
      password_hash,
      salt,
      avatar: googleProfile.picture || null,
      role_id: customerRole.role_id,
      status: 1,
    });

    user = await findUserByEmail(email);
  } else {
    assertActiveAccount(user);
  }

  return buildAuthResponse(user);
}

function logout(token) {
  tokenBlacklist.add(token);
}

async function getProfile(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return sanitizeUser(user);
}

async function updateProfile(userId, { full_name, phone, avatar }) {
  const user = await db(TABLES.USERS).where({ user_id: userId }).first();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (phone !== undefined && phone !== null && phone !== '') {
    await ensurePhoneAvailable(phone, userId);
  }

  const updateData = {};

  if (full_name !== undefined) {
    updateData.full_name = full_name;
  }

  if (phone !== undefined) {
    updateData.phone = phone || null;
  }

  if (avatar !== undefined) {
    updateData.avatar = avatar || null;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  await db(TABLES.USERS).where({ user_id: userId }).update(updateData);

  return getProfile(userId);
}

async function changePassword(userId, { current_password, new_password }) {
  const user = await db(TABLES.USERS).where({ user_id: userId }).first();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isCurrentPasswordValid = await comparePassword(
    current_password,
    user.password_hash
  );

  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  const { password_hash, salt } = await hashPassword(new_password);

  await db(TABLES.USERS).where({ user_id: userId }).update({
    password_hash,
    salt,
  });
}

module.exports = {
  register,
  login,
  adminLogin,
  googleLogin,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  ensureEmailAvailable,
};
