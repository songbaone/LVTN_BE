const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

function getEnv(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
}

function requireEnv(key) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
}

function parseNumber(value, defaultValue) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

const env = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: parseNumber(getEnv('PORT', '3000'), 3000),
  HOST: getEnv('HOST', '0.0.0.0'),

  DB_HOST: getEnv('DB_HOST', 'localhost'),
  DB_PORT: parseNumber(getEnv('DB_PORT', '1433'), 1433),
  DB_USER: getEnv('DB_USER', 'sa'),
  DB_PASSWORD: getEnv('DB_PASSWORD', ''),
  DB_NAME: getEnv('DB_NAME', 'LVTN_SB'),
  DB_ENCRYPT: parseBoolean(getEnv('DB_ENCRYPT', 'true'), true),
  DB_TRUST_SERVER_CERTIFICATE: parseBoolean(
    getEnv('DB_TRUST_SERVER_CERTIFICATE', 'true'),
    true
  ),
  DB_POOL_MIN: parseNumber(getEnv('DB_POOL_MIN', '2'), 2),
  DB_POOL_MAX: parseNumber(getEnv('DB_POOL_MAX', '10'), 10),

  JWT_SECRET: getEnv('JWT_SECRET', ''),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),

  CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:5173'),

  UPLOAD_MAX_FILE_SIZE: parseNumber(
    getEnv('UPLOAD_MAX_FILE_SIZE', '5242880'),
    5 * 1024 * 1024
  ),
  BCRYPT_SALT_ROUNDS: parseNumber(getEnv('BCRYPT_SALT_ROUNDS', '12'), 12),
};

function validateEnv() {
  requireEnv('JWT_SECRET');

  if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

validateEnv();

module.exports = {
  env,
  getEnv,
  requireEnv,
  parseBoolean,
  parseNumber,
};
