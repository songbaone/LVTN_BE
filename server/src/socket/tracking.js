/**
 * In-memory online user tracking.
 *
 * Uses a Map<userId, Set<socketEntry>> to support multiple tabs/sessions per user.
 * Each entry stores socketId, role, connectedAt, and currentRoomId.
 */

const onlineUsers = new Map();

/**
 * @typedef {Object} SocketEntry
 * @property {string} socketId
 * @property {number} userId
 * @property {string} role
 * @property {string} connectedAt - ISO timestamp
 * @property {number|null} currentRoomId - chat room ID the socket is currently viewing
 */

/**
 * Add a socket connection for a user.
 * @param {number} userId
 * @param {string} socketId
 * @param {string} role
 */
function addUser(userId, socketId, role) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Map());
  }

  const sockets = onlineUsers.get(userId);
  sockets.set(socketId, {
    socketId,
    userId,
    role,
    connectedAt: new Date().toISOString(),
    currentRoomId: null,
  });
}

/**
 * Remove a socket connection for a user.
 * @param {number} userId
 * @param {string} socketId
 * @returns {boolean} true if the user has no remaining sockets
 */
function removeUser(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return true;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true; // user fully offline
  }

  return false; // user still has other tabs open
}

/**
 * Get all socket entries for a user.
 * @param {number} userId
 * @returns {SocketEntry[]}
 */
function getUserSockets(userId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return [];
  return Array.from(sockets.values());
}

/**
 * Check if a user has at least one active socket.
 * @param {number} userId
 * @returns {boolean}
 */
function isUserOnline(userId) {
  const sockets = onlineUsers.get(userId);
  return !!sockets && sockets.size > 0;
}

/**
 * Get all currently online users with their socket entries.
 * @returns {Map<number, SocketEntry[]>}
 */
function getOnlineUsers() {
  const result = new Map();
  for (const [userId, sockets] of onlineUsers.entries()) {
    result.set(userId, Array.from(sockets.values()));
  }
  return result;
}

/**
 * Get the count of online staff members.
 * @returns {number}
 */
function getOnlineStaffCount() {
  let count = 0;
  for (const [, sockets] of onlineUsers.entries()) {
    for (const entry of sockets.values()) {
      if (entry.role === 'ADMIN' || entry.role === 'STAFF') {
        count++;
        break; // count each staff user once regardless of tabs
      }
    }
  }
  return count;
}

/**
 * Get all online user IDs.
 * @returns {number[]}
 */
function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

/**
 * Update the current chat room a socket is viewing.
 * @param {number} userId
 * @param {string} socketId
 * @param {number|null} roomId
 */
function setCurrentRoom(userId, socketId, roomId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;

  const entry = sockets.get(socketId);
  if (entry) {
    entry.currentRoomId = roomId;
  }
}

/**
 * Get the total number of unique online users.
 * @returns {number}
 */
function getOnlineCount() {
  return onlineUsers.size;
}

/**
 * Clear all tracking (useful for testing).
 */
function clear() {
  onlineUsers.clear();
}

module.exports = {
  addUser,
  removeUser,
  getUserSockets,
  isUserOnline,
  getOnlineUsers,
  getOnlineStaffCount,
  getOnlineUserIds,
  setCurrentRoom,
  getOnlineCount,
  clear,
};