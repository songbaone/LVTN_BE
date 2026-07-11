/**
 * Socket.IO event name constants.
 * All event names use a namespaced convention to avoid collisions.
 */
const EVENTS = Object.freeze({
  // ── Chat events (server → client) ──────────────────────────────────────
  CHAT_NEW_MESSAGE: 'chat:new-message',
  CHAT_ROOM_CREATED: 'chat:room-created',
  CHAT_ROOM_ASSIGNED: 'chat:room-assigned',
  CHAT_ROOM_CLOSED: 'chat:room-closed',

  // ── System events ──────────────────────────────────────────────────────
  SOCKET_CONNECTED: 'socket:connected',
  SOCKET_ERROR: 'socket:error',

  // ── Incoming client events (client → server) ───────────────────────────
  CLIENT_JOIN_ROOM: 'chat:join-room',
  CLIENT_LEAVE_ROOM: 'chat:leave-room',
});

module.exports = EVENTS;