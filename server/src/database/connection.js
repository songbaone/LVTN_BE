const db = require('../config/knex');

async function testConnection() {
  await db.raw('SELECT 1 AS ok');
}

async function closeConnection() {
  await db.destroy();
}

//aaaaaa

module.exports = {
  db,
  testConnection,
  closeConnection,
};
