/**
 * Socket.IO room management helpers.
 *
 * Room naming convention:
 *   customer:{customerId}  — personal notification channel for a customer
 *   staff:{staffId}        — personal notification channel for a staff member
 *   chat:{roomId}          — real-time chat room for a specific conversation
 */

/**
 * Join a customer to their personal notification room.
 * @param {object} socket - Socket.IO socket instance
 * @param {number} customerId
 */
function joinCustomerRoom(socket, customerId) {
  const roomName = `customer:${customerId}`;
  socket.join(roomName);
  return roomName;
}

/**
 * Join a staff member to their personal notification room.
 * @param {object} socket - Socket.IO socket instance
 * @param {number} staffId
 */
function joinStaffRoom(socket, staffId) {
  const roomName = `staff:${staffId}`;
  socket.join(roomName);
  return roomName;
}

/**
 * Join a socket to a specific chat room for real-time messaging.
 * @param {object} socket - Socket.IO socket instance
 * @param {number} roomId - chat room ID
 */
function joinChatRoom(socket, roomId) {
  const roomName = `chat:${roomId}`;
  socket.join(roomName);
  return roomName;
}

/**
 * Leave a specific chat room.
 * @param {object} socket - Socket.IO socket instance
 * @param {number} roomId - chat room ID
 */
function leaveChatRoom(socket, roomId) {
  const roomName = `chat:${roomId}`;
  socket.leave(roomName);
  return roomName;
}

/**
 * Leave all rooms the socket is currently in.
 * @param {object} socket - Socket.IO socket instance
 */
function leaveAllRooms(socket) {
  for (const room of socket.rooms) {
    if (room !== socket.id) {
      socket.leave(room);
    }
  }
}

module.exports = {
  joinCustomerRoom,
  joinStaffRoom,
  joinChatRoom,
  leaveChatRoom,
  leaveAllRooms,
};