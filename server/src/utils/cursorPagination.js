/**
 * Cursor-based pagination helper for chat messages.
 *
 * Uses `message_id` (monotonic PK) as the cursor for efficient
 * clustered-index seeks. No OFFSET, no COUNT(*).
 *
 * Direction:
 *   - 'before': Load older messages (cursor = oldest loaded ID)
 *   - 'after':  Load newer messages (cursor = newest loaded ID)
 *
 * When no cursor is provided, returns the newest messages (initial load).
 */

/**
 * Parse cursor pagination params from a query object.
 *
 * @param {object} query - Express req.query
 * @returns {{ cursor: number|null, limit: number, direction: 'before'|'after' }}
 */
function getCursorPagination(query = {}) {
  let cursor = parseInt(query.cursor, 10);
  if (Number.isNaN(cursor) || cursor < 1) {
    cursor = null;
  }

  let limit = parseInt(query.limit, 10);
  if (Number.isNaN(limit) || limit < 1) {
    limit = 20;
  }
  if (limit > 100) {
    limit = 100;
  }

  const direction = query.direction === 'after' ? 'after' : 'before';

  return { cursor, limit, direction };
}

/**
 * Build cursor pagination response metadata.
 *
 * @param {Array} messages - The loaded messages (already with attachments)
 * @param {number} limit - The requested limit
 * @param {'before'|'after'} direction - The requested direction
 * @returns {{ nextCursor: number|null, hasMore: boolean }}
 */
function buildCursorMeta(messages, limit, direction) {
  if (messages.length === 0) {
    return { nextCursor: null, hasMore: false };
  }

  // For 'before' (loading older), the cursor is the oldest message_id in the batch
  // For 'after' (loading newer), we don't need to expose a cursor to the user,
  // but we can use the newest message_id for polling continuation
  let nextCursor;
  if (direction === 'before') {
    // Oldest message in this batch = last element (sorted DESC)
    nextCursor = messages[messages.length - 1].message_id;
  } else {
    // Newest message in this batch = first element (sorted DESC for after)
    nextCursor = messages[0]?.message_id ?? null;
  }

  return {
    nextCursor,
    hasMore: messages.length >= limit,
  };
}

module.exports = {
  getCursorPagination,
  buildCursorMeta,
};