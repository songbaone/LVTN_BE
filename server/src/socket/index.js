/**
 * Socket.IO initialization and bootstrap.
 *
 * This module is the single entry point for all Socket.IO logic.
 * It is called from server.js with the Socket.IO server instance.
 *
 * Flow:
 *   1. Register JWT authentication middleware
 *   2. On authenticated connection → handleConnection()
 */

const authenticateSocket = require('./auth');
const { handleConnection } = require('./handlers/connection');

/**
 * Initialize Socket.IO with authentication and connection handling.
 * @param {object} io - Socket.IO server instance
 * @returns {object} the io instance
 */
function bootstrapSocket(io) {
  // ── Register JWT authentication middleware ─────────────────────────────
  io.use(authenticateSocket);

  // ── Handle new connections ─────────────────────────────────────────────
  io.on('connection', (socket) => {
    handleConnection(io, socket);
  });

  console.log('[Socket] Socket.IO initialized with JWT authentication');
  return io;
}

module.exports = { bootstrapSocket };