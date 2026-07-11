const { db } = require('../../database/connection');
const { TABLES, CHAT_ROOM_STATUS, MESSAGE_TYPE } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { getCursorPagination, buildCursorMeta } = require('../../utils/cursorPagination');

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseId(value, label) {
  const id = parseInt(value, 10);
  if (Number.isNaN(id) || id < 1) {
    throw new AppError(`Invalid ${label}`, 400);
  }
  return id;
}

async function ensureRoomExists(roomId, trx = db) {
  const room = await trx(TABLES.CHAT_ROOMS)
    .where({ room_id: roomId })
    .first();
  if (!room) {
    throw new AppError('Room not found', 404);
  }
  return room;
}

async function ensureCustomerRoom(customerId, trx = db) {
  const room = await trx(TABLES.CHAT_ROOMS)
    .where({ customer_id: customerId })
    .first();
  return room || null;
}

async function ensureRoomAccessible(roomId, customerId, trx = db) {
  const room = await ensureRoomExists(roomId, trx);
  if (room.customer_id !== customerId) {
    throw new AppError('Access denied', 403);
  }
  return room;
}

async function ensureMessageExists(messageId, trx = db) {
  const message = await trx(TABLES.CHAT_MESSAGES)
    .where({ message_id: messageId })
    .first();
  if (!message) {
    throw new AppError('Message not found', 404);
  }
  return message;
}

async function ensureStaffExists(staffId, trx = db) {
  const staff = await trx(TABLES.USERS)
    .where({ user_id: staffId })
    .first();
  if (!staff) {
    throw new AppError('Staff not found', 404);
  }
  return staff;
}

async function ensureRoomNotClosed(room, trx = db) {
  if (room.status === CHAT_ROOM_STATUS.CLOSED) {
    throw new AppError('Room already closed', 409);
  }
}

async function createRoomIfNotExists(customerId, trx = db) {
  const existing = await ensureCustomerRoom(customerId, trx);
  if (existing) {
    return existing;
  }

  const [room] = await trx(TABLES.CHAT_ROOMS)
    .insert({
      customer_id: customerId,
      status: CHAT_ROOM_STATUS.OPEN,
      unread_customer_count: 0,
      unread_staff_count: 0,
    })
    .returning("*");

  return room;

}

// ── Shared Message DTO Builder ──────────────────────────────────────────────

/**
 * Build a complete message DTO from a message_id.
 *
 * Returns the unified message format used by both REST API and Socket.IO:
 * {
 *   message_id,
 *   room_id,
 *   sender: { user_id, full_name, avatar } | null,
 *   sender_id,
 *   message_type,
 *   message,
 *   is_read,
 *   created_at,
 *   attachments: [...]
 * }
 *
 * @param {number} messageId
 * @param {object} [trx=db] - optional transaction/knex instance
 * @returns {Promise<object>}
 */
async function buildMessageDTO(messageId, trx = db) {
  const message = await trx(TABLES.CHAT_MESSAGES)
    .where({ message_id: messageId })
    .first();

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  const sender = await trx(TABLES.USERS)
    .select('user_id', 'full_name', 'avatar')
    .where({ user_id: message.sender_id })
    .first();

  const attachments = await loadAttachments(messageId, trx);

  return {
    message_id: message.message_id,
    room_id: message.room_id,
    sender: sender
      ? {
          user_id: sender.user_id,
          full_name: sender.full_name,
          avatar: sender.avatar,
        }
      : null,
    sender_id: message.sender_id,
    message_type: message.message_type,
    message: message.message,
    is_read: Boolean(message.is_read),
    created_at: message.created_at,
    attachments,
  };
}

/**
 * Load messages for a room using cursor-based pagination.
 *
 * Initial load (no cursor): returns the newest messages (DESC).
 * Scroll up (direction=before): returns messages older than cursor (DESC).
 * Polling (direction=after): returns messages newer than cursor (ASC).
 *
 * Messages are always returned in ASC order (oldest → newest) for the client.
 */
async function loadRoomMessages(roomId, queryParams, trx = db) {
  const { cursor, limit, direction } = getCursorPagination(queryParams);

  let query = trx(TABLES.CHAT_MESSAGES)
    .where({ room_id: roomId });

  if (cursor) {
    if (direction === 'before') {
      // Load older messages (message_id < cursor)
      query = query
        .andWhere('message_id', '<', cursor)
        .orderBy('message_id', 'desc')
        .limit(limit);
    } else {
      // Load newer messages (message_id > cursor) — for polling
      query = query
        .andWhere('message_id', '>', cursor)
        .orderBy('message_id', 'asc')
        .limit(limit);
    }
  } else {
    // Initial load: newest messages first
    query = query
      .orderBy('message_id', 'desc')
      .limit(limit);
  }

  let messages = await query;

  // Always return in ASC order (oldest → newest) for the client
  messages = messages.reverse();

  const messagesWithDetails = await Promise.all(
    messages.map((msg) => buildMessageDTO(msg.message_id, trx))
  );

  const { nextCursor, hasMore } = buildCursorMeta(messages, limit, direction);

  return {
    messages: messagesWithDetails,
    cursor: nextCursor,
    hasMore,
  };
}

async function loadAttachments(messageId, trx = db) {
  const attachments = await trx(TABLES.CHAT_ATTACHMENTS)
    .where({ message_id: messageId })
    .orderBy('attachment_id', 'asc');

  return attachments.map((att) => ({
    attachment_id: att.attachment_id,
    file_name: att.file_name,
    file_url: att.file_url,
    file_size: att.file_size,
    mime_type: att.mime_type,
    created_at: att.created_at,
  }));
}

async function updateUnreadCounter(roomId, column, trx = db) {
  await trx(TABLES.CHAT_ROOMS)
    .where({ room_id: roomId })
    .increment(column, 1);
}

async function resetUnreadCounter(roomId, column, trx = db) {
  await trx(TABLES.CHAT_ROOMS)
    .where({ room_id: roomId })
    .update({ [column]: 0 });
}

// ── Customer API ────────────────────────────────────────────────────────────

async function createRoom(customerId) {
  return await db.transaction(async (trx) => {
    const room = await createRoomIfNotExists(customerId, trx);
    return room;
  });
}

async function getCustomerRoom(customerId) {
  return await db.transaction(async (trx) => {
    return await createRoomIfNotExists(customerId, trx);
  });
}

async function getCustomerMessages(customerId, queryParams) {
  const room = await db.transaction(async (trx) => {
    return await createRoomIfNotExists(customerId, trx);
  });

  return await loadRoomMessages(room.room_id, queryParams);
}

async function sendCustomerMessage(customerId, message, messageType) {
  return await db.transaction(async (trx) => {
    const room = await createRoomIfNotExists(customerId, trx);

    await ensureRoomNotClosed(room, trx);

    // Insert message
    await trx(TABLES.CHAT_MESSAGES).insert({
      room_id: room.room_id,
      sender_id: customerId,
      message_type: messageType,
      message,
      is_read: false,
    });

    // Update room
    await trx(TABLES.CHAT_ROOMS)
      .where({ room_id: room.room_id })
      .update({
        last_message_at: db.fn.now(),
      });

    await updateUnreadCounter(room.room_id, "unread_staff_count", trx);

    // SQL Server không trả về ID sau insert nên lấy bản ghi mới nhất
    const createdMessage = await trx(TABLES.CHAT_MESSAGES)
      .where({ room_id: room.room_id })
      .orderBy("message_id", "desc")
      .first();

    return await buildMessageDTO(createdMessage.message_id, trx);
  });
}

// ── Shared Attachment Logic ─────────────────────────────────────────────────

async function saveAttachment(messageId, file, trx) {
  if (!file) {
    throw new AppError('File is required', 400);
  }

  const file_url = `/uploads/chat/${file.filename}`;

  await trx(TABLES.CHAT_ATTACHMENTS).insert({
    message_id: messageId,
    file_name: file.originalname,
    file_url,
    file_size: file.size,
    mime_type: file.mimetype,
  });

  const attachment = await trx(TABLES.CHAT_ATTACHMENTS)
    .where({ message_id: messageId, file_url })
    .first();

  return {
    attachment_id: attachment.attachment_id,
    message_id: attachment.message_id,
    file_name: attachment.file_name,
    file_url: attachment.file_url,
    file_size: attachment.file_size,
    mime_type: attachment.mime_type,
    created_at: attachment.created_at,
  };
}

async function uploadAttachment(messageId, customerId, file) {
  return await db.transaction(async (trx) => {
    const message = await ensureMessageExists(messageId, trx);

    // Verify the message belongs to a room owned by this customer
    const room = await trx(TABLES.CHAT_ROOMS)
      .where({ room_id: message.room_id })
      .first();
    if (!room || room.customer_id !== customerId) {
      throw new AppError('Access denied', 403);
    }

    return await saveAttachment(messageId, file, trx);
  });
}

/**
 * Save an attachment and reload the full message DTO.
 * Used when the attachment completes an IMAGE message — the caller
 * emits chat:new-message with the fully hydrated DTO.
 */
async function uploadAttachmentAndReload(messageId, customerId, file) {
  return await db.transaction(async (trx) => {
    const message = await ensureMessageExists(messageId, trx);

    // Verify the message belongs to a room owned by this customer
    const room = await trx(TABLES.CHAT_ROOMS)
      .where({ room_id: message.room_id })
      .first();
    if (!room || room.customer_id !== customerId) {
      throw new AppError('Access denied', 403);
    }

    await saveAttachment(messageId, file, trx);

    // Reload the full message DTO (now includes the attachment)
    return await buildMessageDTO(messageId, trx);
  });
}

async function adminUploadAttachment(messageId, file) {
  return await db.transaction(async (trx) => {
    const message = await ensureMessageExists(messageId, trx);

    // Admin/staff can upload to any message — no ownership check needed
    return await saveAttachment(messageId, file, trx);
  });
}

/**
 * Save an attachment and reload the full message DTO (admin/staff version).
 * Used when the attachment completes an IMAGE message — the caller
 * emits chat:new-message with the fully hydrated DTO.
 */
async function adminUploadAttachmentAndReload(messageId, file) {
  return await db.transaction(async (trx) => {
    const message = await ensureMessageExists(messageId, trx);

    // Admin/staff can upload to any message — no ownership check needed
    await saveAttachment(messageId, file, trx);

    // Reload the full message DTO (now includes the attachment)
    return await buildMessageDTO(messageId, trx);
  });
}

async function markCustomerRead(customerId) {
  return await db.transaction(async (trx) => {
    const room = await createRoomIfNotExists(customerId, trx);

    // Mark all unread messages from staff as read
    await trx(TABLES.CHAT_MESSAGES)
      .where({
        room_id: room.room_id,
        is_read: false,
      })
      .whereRaw('sender_id != ?', [customerId])
      .update({ is_read: true });

    await resetUnreadCounter(room.room_id, 'unread_customer_count', trx);

    return { message: 'Room marked as read' };
  });
}

// ── Admin / Staff API ───────────────────────────────────────────────────────

async function getAdminRooms(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);

  const filters = {
    search: queryParams.search,
    status: queryParams.status,
    staff_id: queryParams.staff_id,
  };

  let countQuery = db(`${TABLES.CHAT_ROOMS} as cr`)
    .leftJoin(`${TABLES.USERS} as cu`, 'cr.customer_id', 'cu.user_id')
    .leftJoin(`${TABLES.USERS} as su`, 'cr.staff_id', 'su.user_id');

  if (filters.search) {
    countQuery = countQuery.where(function () {
      this.whereRaw('cu.full_name LIKE ?', [`%${filters.search}%`])
        .orWhereRaw('cu.email LIKE ?', [`%${filters.search}%`]);
    });
  }
  if (filters.status) {
    countQuery = countQuery.where('cr.status', filters.status);
  }
  if (filters.staff_id) {
    countQuery = countQuery.where('cr.staff_id', filters.staff_id);
  }

  const countResult = await countQuery.count({ total: 'cr.room_id' });
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(`${TABLES.CHAT_ROOMS} as cr`)
    .leftJoin(`${TABLES.USERS} as cu`, 'cr.customer_id', 'cu.user_id')
    .leftJoin(`${TABLES.USERS} as su`, 'cr.staff_id', 'su.user_id')
    .select(
      'cr.room_id',
      'cr.customer_id',
      'cu.full_name as customer_name',
      'cu.avatar as customer_avatar',
      'cr.staff_id',
      'su.full_name as staff_name',
      'cr.status',
      'cr.last_message_at',
      'cr.unread_staff_count',
      'cr.created_at',
      'cr.updated_at'
    );

  if (filters.search) {
    listQuery = listQuery.where(function () {
      this.whereRaw('cu.full_name LIKE ?', [`%${filters.search}%`])
        .orWhereRaw('cu.email LIKE ?', [`%${filters.search}%`]);
    });
  }
  if (filters.status) {
    listQuery = listQuery.where('cr.status', filters.status);
  }
  if (filters.staff_id) {
    listQuery = listQuery.where('cr.staff_id', filters.staff_id);
  }

  const rooms = await listQuery
    .orderBy('cr.last_message_at', 'desc')
    .orderBy('cr.created_at', 'desc')
    .offset(offset)
    .limit(limit);

  // Enrich rooms with last message info
  const enrichedRooms = await Promise.all(
    rooms.map(async (room) => {
      const lastMessage = await db(TABLES.CHAT_MESSAGES)
        .where({ room_id: room.room_id })
        .orderBy('created_at', 'desc')
        .first();

      return {
        room_id: room.room_id,
        customer_id: room.customer_id,
        customer_name: room.customer_name || null,
        customer_avatar: room.customer_avatar || null,
        staff_id: room.staff_id || null,
        staff_name: room.staff_name || null,
        status: room.status,
        last_message: lastMessage ? lastMessage.message : null,
        last_message_type: lastMessage ? lastMessage.message_type : null,
        last_message_at: room.last_message_at || null,
        unread_staff_count: room.unread_staff_count || 0,
        created_at: room.created_at,
        updated_at: room.updated_at,
      };
    })
  );

  return {
    rooms: enrichedRooms,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getAdminRoomById(roomIdParam) {
  const roomId = parseId(roomIdParam, 'room ID');
  const room = await ensureRoomExists(roomId);

  const customer = await db(TABLES.USERS)
    .select('user_id', 'full_name', 'email', 'phone', 'avatar')
    .where({ user_id: room.customer_id })
    .first();

  let staff = null;
  if (room.staff_id) {
    staff = await db(TABLES.USERS)
      .select('user_id', 'full_name', 'email')
      .where({ user_id: room.staff_id })
      .first();
  }

  return {
    room_id: room.room_id,
    customer_id: room.customer_id,
    customer: customer
      ? {
        user_id: customer.user_id,
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone,
        avatar: customer.avatar,
      }
      : null,
    staff_id: room.staff_id || null,
    staff: staff
      ? {
        user_id: staff.user_id,
        full_name: staff.full_name,
        email: staff.email,
      }
      : null,
    status: room.status,
    unread_customer_count: room.unread_customer_count || 0,
    unread_staff_count: room.unread_staff_count || 0,
    last_message_at: room.last_message_at,
    created_at: room.created_at,
    updated_at: room.updated_at,
  };
}

async function getAdminRoomMessages(roomIdParam, queryParams) {
  const roomId = parseId(roomIdParam, 'room ID');
  await ensureRoomExists(roomId);

  const { cursor, limit, direction } = getCursorPagination(queryParams);

  let query = db(TABLES.CHAT_MESSAGES)
    .where({ room_id: roomId });

  if (cursor) {
    if (direction === 'before') {
      // Load older messages (message_id < cursor)
      query = query
        .andWhere('message_id', '<', cursor)
        .orderBy('message_id', 'desc')
        .limit(limit);
    } else {
      // Load newer messages (message_id > cursor) — for polling
      query = query
        .andWhere('message_id', '>', cursor)
        .orderBy('message_id', 'asc')
        .limit(limit);
    }
  } else {
    // Initial load: newest messages first
    query = query
      .orderBy('message_id', 'desc')
      .limit(limit);
  }

  let messages = await query;

  // Return in ASC order (oldest → newest) for the client
  messages = messages.reverse();

  const messagesWithDetails = await Promise.all(
    messages.map((msg) => buildMessageDTO(msg.message_id))
  );

  const { nextCursor, hasMore } = buildCursorMeta(messages, limit, direction);

  return {
    messages: messagesWithDetails,
    cursor: nextCursor,
    hasMore,
  };
}

async function adminSendMessage(staffId, roomIdParam, message, messageType) {
  const roomId = parseId(roomIdParam, "room ID");

  return await db.transaction(async (trx) => {
    const room = await ensureRoomExists(roomId, trx);
    await ensureRoomNotClosed(room, trx);

    // Insert message
    await trx(TABLES.CHAT_MESSAGES).insert({
      room_id: roomId,
      sender_id: staffId,
      message_type: messageType,
      message,
      is_read: false,
    });

    // Update room
    await trx(TABLES.CHAT_ROOMS)
      .where({ room_id: roomId })
      .update({
        last_message_at: db.fn.now(),
      });

    await updateUnreadCounter(roomId, "unread_customer_count", trx);

    // Lấy message vừa insert
    const createdMessage = await trx(TABLES.CHAT_MESSAGES)
      .where({
        room_id: roomId,
        sender_id: staffId,
      })
      .orderBy("message_id", "desc")
      .first();

    return await buildMessageDTO(createdMessage.message_id, trx);
  });
}

async function assignStaff(roomIdParam, staffId) {
  const roomId = parseId(roomIdParam, 'room ID');

  return await db.transaction(async (trx) => {
    const room = await ensureRoomExists(roomId, trx);
    await ensureRoomNotClosed(room, trx);
    await ensureStaffExists(staffId, trx);

    await trx(TABLES.CHAT_ROOMS)
      .where({ room_id: roomId })
      .update({ staff_id: staffId });

    const updatedRoom = await trx(TABLES.CHAT_ROOMS)
      .where({ room_id: roomId })
      .first();

    return updatedRoom;
  });
}

async function markStaffRead(roomIdParam) {
  const roomId = parseId(roomIdParam, 'room ID');

  return await db.transaction(async (trx) => {
    const room = await ensureRoomExists(roomId, trx);

    // Mark all unread customer messages as read
    await trx(TABLES.CHAT_MESSAGES)
      .where({
        room_id: roomId,
        is_read: false,
      })
      .whereRaw('sender_id = ?', [room.customer_id])
      .update({ is_read: true });

    await resetUnreadCounter(roomId, 'unread_staff_count', trx);

    return { message: 'Room marked as read' };
  });
}

async function closeRoom(roomIdParam) {
  const roomId = parseId(roomIdParam, 'room ID');

  return await db.transaction(async (trx) => {
    const room = await ensureRoomExists(roomId, trx);
    await ensureRoomNotClosed(room, trx);

    await trx(TABLES.CHAT_ROOMS)
      .where({ room_id: roomId })
      .update({ status: CHAT_ROOM_STATUS.CLOSED });

    const updatedRoom = await trx(TABLES.CHAT_ROOMS)
      .where({ room_id: roomId })
      .first();

    return updatedRoom;
  });
}

module.exports = {
  createRoom,
  getCustomerRoom,
  getCustomerMessages,
  sendCustomerMessage,
  uploadAttachment,
  uploadAttachmentAndReload,
  adminUploadAttachment,
  adminUploadAttachmentAndReload,
  markCustomerRead,
  getAdminRooms,
  getAdminRoomById,
  getAdminRoomMessages,
  adminSendMessage,
  assignStaff,
  markStaffRead,
  closeRoom,
};
