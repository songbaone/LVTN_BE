/**
 * Socket.IO JWT authentication middleware.
 *
 * Extracts the JWT from:
 *   1. socket.handshake.auth.token (preferred — cleaner for Socket.IO clients)
 *   2. socket.handshake.query.token (fallback)
 *
 * Verifies the token using the same JWT_SECRET and blacklist as the Express middleware.
 * On success, attaches the decoded payload to socket.user.
 * On failure, emits an error and disconnects the socket.
 */

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const tokenBlacklist = require('../utils/tokenBlacklist');
const EVENTS = require('./events');

/**
 * Socket.IO authentication middleware.
 * @param {object} socket - Socket.IO socket instance
 * @param {function} next - Callback to proceed or pass an error
 */
function authenticateSocket(socket, next) {
  try {
    // Extract token from handshake auth or query
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      const err = new Error('Authentication required');
      err.data = { code: 'AUTH_REQUIRED' };
      return next(err);
    }

    // Strip "Bearer " prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();

    if (!cleanToken) {
      const err = new Error('Authentication required');
      err.data = { code: 'AUTH_REQUIRED' };
      return next(err);
    }

    // Check blacklist
    if (tokenBlacklist.has(cleanToken)) {
      const err = new Error('Token has been revoked');
      err.data = { code: 'TOKEN_REVOKED' };
      return next(err);
    }

    // Verify JWT
    const decoded = jwt.verify(cleanToken, env.JWT_SECRET);

    // Attach user info to socket
    socket.user = {
      user_id: decoded.user_id,
      role_name: decoded.role_name,
      email: decoded.email,
    };

    // Store the raw token for potential blacklist checks on disconnect
    socket.authToken = cleanToken;

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Access token has expired');
      err.data = { code: 'TOKEN_EXPIRED' };
      return next(err);
    }

    if (error.name === 'JsonWebTokenError') {
      const err = new Error('Invalid access token');
      err.data = { code: 'TOKEN_INVALID' };
      return next(err);
    }

    return next(error);
  }
}

module.exports = authenticateSocket;