const { TABLES } = require('../config/constants');
const db = require('../config/knex');

function buildOrderCode() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

async function generateUniqueOrderCode() {
  let orderCode = buildOrderCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await db(TABLES.ORDERS)
      .where({ order_code: orderCode })
      .first();

    if (!existing) {
      return orderCode;
    }

    orderCode = buildOrderCode();
    attempts += 1;
  }

  throw new Error('Unable to generate a unique order code');
}

module.exports = {
  buildOrderCode,
  generateUniqueOrderCode,
};
