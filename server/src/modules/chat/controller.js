const chatService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');
const socketEmitter = require('../../socket/emitter');

// ── Customer API ────────────────────────────────────────────────────────────

async function createRoom(req, res, next) {
  try {
    const room = await chatService.createRoom(req.user.user_id);

    // Emit room-created event to all online staff
    const io = req.app.get('io');
    if (io) {
      socketEmitter.emitRoomCreated(io, { room });
    }

    return sendSuccess(res, 'Room created successfully', room, 201);
  } catch (error) {
    return next(error);
  }
}

async function getCustomerRoom(req, res, next) {
  try {
    const room = await chatService.getCustomerRoom(req.user.user_id);
    return sendSuccess(res, 'Room retrieved successfully', room);
  } catch (error) {
    return next(error);
  }
}

async function getCustomerMessages(req, res, next) {
  try {
    const result = await chatService.getCustomerMessages(req.user.user_id, req.query);
    return sendSuccess(res, 'Messages retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { message, message_type } = req.body;
    const result = await chatService.sendCustomerMessage(
      req.user.user_id,
      message,
      message_type,
    );

    // Emit new-message event only if the message has no attachment to follow
    // (text messages are complete immediately)
    const io = req.app.get('io');
    if (io && message_type !== 'IMAGE') {
      // Fetch the room to get customer_id and staff_id for targeting
      const room = await chatService.getCustomerRoom(req.user.user_id);
      socketEmitter.emitNewMessage(io, { room, message: result });
    }

    return sendSuccess(res, 'Message sent successfully', result, 201);
  } catch (error) {
    return next(error);
  }
}

async function uploadAttachment(req, res, next) {
  try {
    const { messageId } = req.params;
    const file = req.file;

    // Reload the full message DTO (includes sender + attachments)
    const message = await chatService.uploadAttachmentAndReload(
      messageId,
      req.user.user_id,
      file,
    );

    // Emit chat:new-message now that the message is complete with attachment
    const io = req.app.get('io');
    if (io) {
      const room = await chatService.getCustomerRoom(req.user.user_id);
      socketEmitter.emitNewMessage(io, { room, message });
    }

    return sendSuccess(res, 'Attachment uploaded successfully', message, 201);
  } catch (error) {
    return next(error);
  }
}

async function markCustomerRead(req, res, next) {
  try {
    const result = await chatService.markCustomerRead(req.user.user_id);
    return sendSuccess(res, 'Room marked as read', result);
  } catch (error) {
    return next(error);
  }
}

// ── Admin / Staff API ───────────────────────────────────────────────────────

async function getAdminRooms(req, res, next) {
  try {
    const result = await chatService.getAdminRooms(req.query);
    return sendSuccess(res, 'Rooms retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getAdminRoomById(req, res, next) {
  try {
    const room = await chatService.getAdminRoomById(req.params.roomId);
    return sendSuccess(res, 'Room retrieved successfully', room);
  } catch (error) {
    return next(error);
  }
}

async function getAdminRoomMessages(req, res, next) {
  try {
    const result = await chatService.getAdminRoomMessages(
      req.params.roomId,
      req.query,
    );
    return sendSuccess(res, 'Messages retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function adminSendMessage(req, res, next) {
  try {
    const { room_id, message, message_type } = req.body;
    const result = await chatService.adminSendMessage(
      req.user.user_id,
      room_id,
      message,
      message_type,
    );

    // Emit new-message event only if the message has no attachment to follow
    const io = req.app.get('io');
    if (io && message_type !== 'IMAGE') {
      // Fetch the room to get customer_id and staff_id for targeting
      const room = await chatService.getAdminRoomById(room_id);
      socketEmitter.emitNewMessage(io, { room, message: result });
    }

    return sendSuccess(res, 'Message sent successfully', result, 201);
  } catch (error) {
    return next(error);
  }
}

async function adminUploadAttachment(req, res, next) {
  try {
    const { messageId } = req.params;
    const file = req.file;

    // Reload the full message DTO (includes sender + attachments)
    const message = await chatService.adminUploadAttachmentAndReload(
      messageId,
      file,
    );

    // Emit chat:new-message now that the message is complete with attachment
    const io = req.app.get('io');
    if (io) {
      const room = await chatService.getAdminRoomById(message.room_id);
      socketEmitter.emitNewMessage(io, { room, message });
    }

    return sendSuccess(res, 'Attachment uploaded successfully', message, 201);
  } catch (error) {
    return next(error);
  }
}

async function assignStaff(req, res, next) {
  try {
    const { roomId } = req.params;
    const { staff_id } = req.body;
    const room = await chatService.assignStaff(roomId, staff_id);

    // Emit room-assigned event
    const io = req.app.get('io');
    if (io) {
      socketEmitter.emitRoomAssigned(io, { room });
    }

    return sendSuccess(res, 'Staff assigned successfully', room);
  } catch (error) {
    return next(error);
  }
}

async function markStaffRead(req, res, next) {
  try {
    const result = await chatService.markStaffRead(req.params.roomId);
    return sendSuccess(res, 'Room marked as read', result);
  } catch (error) {
    return next(error);
  }
}

async function closeRoom(req, res, next) {
  try {
    const room = await chatService.closeRoom(req.params.roomId);

    // Emit room-closed event
    const io = req.app.get('io');
    if (io) {
      socketEmitter.emitRoomClosed(io, { room });
    }

    return sendSuccess(res, 'Room closed successfully', room);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createRoom,
  getCustomerRoom,
  getCustomerMessages,
  sendMessage,
  uploadAttachment,
  markCustomerRead,
  getAdminRooms,
  getAdminRoomById,
  getAdminRoomMessages,
  adminSendMessage,
  adminUploadAttachment,
  assignStaff,
  markStaffRead,
  closeRoom,
};