/**
 * Socket.IO connection lifecycle handler.
 *
 * Manages the full lifecycle of a socket connection:
 *   1. Track the user as online
 *   2. Join the user to their personal room based on role
 *   3. Register role-specific event handlers
 *   4. Emit a socket:connected acknowledgment
 *   5. On disconnect: clean up tracking and leave rooms
 */

const tracking = require('../tracking');
const rooms = require('../rooms');
const EVENTS = require('../events');
const { safeEmit } = require('../helpers');
const { registerCustomerHandlers } = require('./customer');
const { registerAdminHandlers } = require('./admin');

/**
 * Handle a new authenticated socket connection.
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket.IO socket instance
 */
function handleConnection(io, socket) {
  const { user_id, role_name } = socket.user;

  // ── Track the user ─────────────────────────────────────────────────────
  tracking.addUser(user_id, socket.id, role_name);

  // ── Join personal room based on role ───────────────────────────────────
  if (role_name === 'CUSTOMER') {
    rooms.joinCustomerRoom(socket, user_id);
  } else if (role_name === 'ADMIN' || role_name === 'STAFF') {
    rooms.joinStaffRoom(socket, user_id);
  }

  // ── Register role-specific event handlers ──────────────────────────────
  if (role_name === 'CUSTOMER') {
    registerCustomerHandlers(io, socket);
  } else if (role_name === 'ADMIN' || role_name === 'STAFF') {
    registerAdminHandlers(io, socket);
  }

  // ── Emit connection acknowledgment ─────────────────────────────────────
  safeEmit(socket, EVENTS.SOCKET_CONNECTED, {
    userId: user_id,
    role: role_name,
    socketId: socket.id,
    connectedAt: new Date().toISOString(),
  });

  console.log(
    `[Socket] Connected: user=${user_id} role=${role_name} socket=${socket.id}`
  );

  // ── Disconnect handler ─────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const fullyOffline = tracking.removeUser(user_id, socket.id);

    // Leave all rooms
    rooms.leaveAllRooms(socket);

    console.log(
      `[Socket] Disconnected: user=${user_id} socket=${socket.id} reason="${reason}"` +
        (fullyOffline ? ' (fully offline)' : ' (other tabs remain)')
    );
  });
}

module.exports = { handleConnection };