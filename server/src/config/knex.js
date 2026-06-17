const knex = require('knex');
const { env } = require('./env');

const db = knex({
  client: 'mssql',
  connection: {
    server: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
      enableArithAbort: true,
    },
  },
  pool: {
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
  acquireConnectionTimeout: 30000,
});

module.exports = db;
