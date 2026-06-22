const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');

/**
 * Generate a batch reference code.
 *
 * Format: PREFIX-YYYYMMDD-SEQ
 *   PREFIX  = MANUAL | EXCEL | ADJUST | ROLLBACK
 *   DATE    = YYYYMMDD
 *   SEQ     = 3-digit sequential number (001, 002, ...)
 *
 * @param {'MANUAL_IMPORT'|'EXCEL_IMPORT'|'ADJUST'|'ROLLBACK'} actionType
 * @returns {Promise<string>}
 */
async function generateReferenceCode(actionType) {
  const prefixMap = {
    MANUAL_IMPORT: 'MANUAL',
    EXCEL_IMPORT: 'EXCEL',
    ADJUST: 'ADJUST',
    ROLLBACK: 'ROLLBACK',
  };

  const prefix = prefixMap[actionType];
  if (!prefix) {
    throw new Error(`Unknown action type: ${actionType}`);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const pattern = `${prefix}-${dateStr}-%`;

  // Find the highest existing sequence number for today
  const lastLog = await db(TABLES.STOCK_LOGS)
    .where('reference_code', 'like', pattern)
    .orderBy('reference_code', 'desc')
    .first();

  let nextSeq = 1;
  if (lastLog && lastLog.reference_code) {
    const parts = lastLog.reference_code.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  const seqStr = String(nextSeq).padStart(3, '0');
  return `${prefix}-${dateStr}-${seqStr}`;
}

module.exports = {
  generateReferenceCode,
};