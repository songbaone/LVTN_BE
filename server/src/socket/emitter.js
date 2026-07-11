/**
 * Socket.IO event emitter.
 *
 * This module is the bridge between the REST API controllers and Socket.IO.
 * Controllers call these functions AFTER a successful database operation
 * to broadcast real-time events to connected clients.
 *
 * The REST API remains the source of truth — Socket.IO is only a
 * real-time notification layer on top.
 */

const EVENTS = require('./events');
const { emitToCustomer, emitToStaff, emitToChatRoom } = require('./helpers');

/**
 * Emit a new message event to the relevant rooms.
 *
 * Targets:
 *   - chat:{roomId} — all participants in the conversation
 *   - customer:{customerId} — the customer's personal room
 *   - staff:{staffId} — the assigned staff's personal room (if assigned)
 *
 * @param {object} io - Socket.IO server instance
 * @param {object} payload - { room, message }
 */
function emitNewMessage(io, payload) {
  const { room, message } = payload;
  const roomId = room.room_id;

  console.log("========== SOCKET EMIT ==========");
  console.log("Event:", EVENTS.CHAT_NEW_MESSAGE);
  console.log("Room:", roomId);
  console.log("Customer:", room.customer_id);
  console.log("Staff:", room.staff_id);
  console.log("Message:", message.message);
  console.log("===============================");

  emitToChatRoom(io, roomId, EVENTS.CHAT_NEW_MESSAGE, { room, message });

  console.log(`→ emit chat:${roomId}`);

  emitToCustomer(io, room.customer_id, EVENTS.CHAT_NEW_MESSAGE, { room, message });

  console.log(`→ emit customer:${room.customer_id}`);

  if (room.staff_id) {
    emitToStaff(io, room.staff_id, EVENTS.CHAT_NEW_MESSAGE, { room, message });

    console.log(`→ emit staff:${room.staff_id}`);
  }
}

/**
 * Emit a room-created event to all online staff members.
 *
 * Targets:
 *   - staff:{staffId} for each online staff member
 *
 * @param {object} io - Socket.IO server instance
 * @param {object} payload - { room }
 */
function emitRoomCreated(io, payload) {
  const { room } = payload;

  // Emit to each online staff member's personal room
  const tracking = require('./tracking');
  const onlineUsers = tracking.getOnlineUsers();

  for (const [userId] of onlineUsers) {
    const userSockets = tracking.getUserSockets(userId);
    if (userSockets.length > 0) {
      const role = userSockets[0].role;
      if (role === 'ADMIN' || role === 'STAFF') {
        emitToStaff(io, userId, EVENTS.CHAT_ROOM_CREATED, { room });
      }
    }
  }
}

/**
 * Emit a room-assigned event to the customer and the assigned staff member.
 *
 * Targets:
 *   - customer:{customerId}
 *   - staff:{staffId}
 *
 * @param {object} io - Socket.IO server instance
 * @param {object} payload - { room }
 */
function emitRoomAssigned(io, payload) {
  const { room } = payload;

  emitToCustomer(io, room.customer_id, EVENTS.CHAT_ROOM_ASSIGNED, { room });

  if (room.staff_id) {
    emitToStaff(io, room.staff_id, EVENTS.CHAT_ROOM_ASSIGNED, { room });
  }
}

/**
 * Emit a room-closed event to the customer and the assigned staff member.
 *
 * Targets:
 *   - customer:{customerId}
 *   - staff:{staffId}
 *
 * @param {object} io - Socket.IO server instance
 * @param {object} payload - { room }
 */
function emitRoomClosed(io, payload) {
  const { room } = payload;

  emitToCustomer(io, room.customer_id, EVENTS.CHAT_ROOM_CLOSED, { room });

  if (room.staff_id) {
    emitToStaff(io, room.staff_id, EVENTS.CHAT_ROOM_CLOSED, { room });
  }
}

module.exports = {
  emitNewMessage,
  emitRoomCreated,
  emitRoomAssigned,
  emitRoomClosed,
};