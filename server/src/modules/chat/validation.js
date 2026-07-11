const { body, param, query } = require('express-validator');

const { MESSAGE_TYPE, CHAT_ROOM_STATUS } = require('../../config/constants');

const roomIdParamValidation = [
  param('roomId')
    .isInt({ min: 1 })
    .withMessage('Invalid room ID')
    .toInt(),
];

const messageIdParamValidation = [
  param('messageId')
    .isInt({ min: 1 })
    .withMessage('Invalid message ID')
    .toInt(),
];

const listMessagesQueryValidation = [
  query('cursor')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cursor must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('direction')
    .optional()
    .isIn(['before', 'after'])
    .withMessage('Direction must be "before" or "after"'),
];

const sendMessageValidation = [
  body('message')
    .notEmpty()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message is required and must not exceed 5000 characters'),
  body('message_type')
    .notEmpty()
    .isIn(Object.values(MESSAGE_TYPE))
    .withMessage(`Message type must be one of: ${Object.values(MESSAGE_TYPE).join(', ')}`),
];

const adminSendMessageValidation = [
  body('room_id')
    .isInt({ min: 1 })
    .withMessage('Room ID is required and must be a positive integer')
    .toInt(),
  body('message')
    .notEmpty()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message is required and must not exceed 5000 characters'),
  body('message_type')
    .notEmpty()
    .isIn(Object.values(MESSAGE_TYPE))
    .withMessage(`Message type must be one of: ${Object.values(MESSAGE_TYPE).join(', ')}`),
];

const assignStaffValidation = [
  body('staff_id')
    .isInt({ min: 1 })
    .withMessage('Staff ID is required and must be a positive integer')
    .toInt(),
];

const adminListRoomsQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search cannot be empty'),
  query('status')
    .optional()
    .isIn(Object.values(CHAT_ROOM_STATUS))
    .withMessage(`Status must be one of: ${Object.values(CHAT_ROOM_STATUS).join(', ')}`),
  query('staff_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Staff ID must be a positive integer')
    .toInt(),
];

const uploadAttachmentValidation = [
  param('messageId')
    .isInt({ min: 1 })
    .withMessage('Invalid message ID')
    .toInt(),
];

module.exports = {
  roomIdParamValidation,
  messageIdParamValidation,
  listMessagesQueryValidation,
  sendMessageValidation,
  adminSendMessageValidation,
  assignStaffValidation,
  adminListRoomsQueryValidation,
  uploadAttachmentValidation,
};