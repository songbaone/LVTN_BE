/**
 * Admin/Staff-specific Socket.IO event handlers.
 *
 * Handles:
 *   - chat:join-room — join a specific chat room for real-time messaging
 *   - chat:leave-room — leave a specific chat room
 */

const EVENTS = require('../events');
const rooms = require('../rooms');
const tracking = require('../tracking');

/**
 * Register all admin/staff event handlers on a socket.
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket.IO socket instance
 */
function registerAdminHandlers(io, socket) {
  const { user_id } = socket.user;

  // ── Join a specific chat room ──────────────────────────────────────────
  socket.on(EVENTS.CLIENT_JOIN_ROOM, (data) => {
    if (!data || !data.roomId) {
      return;
    }

    const roomId = parseInt(data.roomId, 10);
    if (Number.isNaN(roomId) || roomId < 1) {
      return;
    }

    rooms.joinChatRoom(socket, roomId);
    tracking.setCurrentRoom(user_id, socket.id, roomId);
  });

  // ── Leave a specific chat room ─────────────────────────────────────────
  socket.on(EVENTS.CLIENT_LEAVE_ROOM, (data) => {
    if (!data || !data.roomId) {
      return;
    }

    const roomId = parseInt(data.roomId, 10);
    if (Number.isNaN(roomId) || roomId < 1) {
      return;
    }

    rooms.leaveChatRoom(socket, roomId);

    const current = tracking.getUserSockets(user_id);
    const entry = current.find((s) => s.socketId === socket.id);
    if (entry && entry.currentRoomId === roomId) {
      tracking.setCurrentRoom(user_id, socket.id, null);
    }
  });
}

module.exports = { registerAdminHandlers };