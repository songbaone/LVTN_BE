/**
 * Shared Socket.IO emit helpers.
 *
 * These functions provide a clean API for emitting events to specific
 * rooms without hardcoding room name strings throughout the codebase.
 */

/**
 * Emit an event to a specific customer's personal room.
 * @param {object} io - Socket.IO server instance
 * @param {number} customerId
 * @param {string} event
 * @param {*} data
 */
function emitToCustomer(io, customerId, event, data) {
  io.to(`customer:${customerId}`).emit(event, data);
}

/**
 * Emit an event to a specific staff member's personal room.
 * @param {object} io - Socket.IO server instance
 * @param {number} staffId
 * @param {string} event
 * @param {*} data
 */
function emitToStaff(io, staffId, event, data) {
  io.to(`staff:${staffId}`).emit(event, data);
}

/**
 * Emit an event to all participants in a specific chat room.
 * @param {object} io - Socket.IO server instance
 * @param {number} roomId - chat room ID
 * @param {string} event
 * @param {*} data
 */
function emitToChatRoom(io, roomId, event, data) {
  io.to(`chat:${roomId}`).emit(event, data);
}

/**
 * Safely emit an event to a socket, catching any errors.
 * @param {object} socket - Socket.IO socket instance
 * @param {string} event
 * @param {*} data
 */
function safeEmit(socket, event, data) {
  try {
    socket.emit(event, data);
  } catch (error) {
    console.error(`[Socket] Error emitting "${event}":`, error.message);
  }
}

module.exports = {
  emitToCustomer,
  emitToStaff,
  emitToChatRoom,
  safeEmit,
};