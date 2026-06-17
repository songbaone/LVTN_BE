const bcrypt = require('bcrypt');
const { env } = require('../config/env');

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const password_hash = await bcrypt.hash(plainPassword, salt);
  return { password_hash, salt };
}

async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
