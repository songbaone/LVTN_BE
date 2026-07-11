const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { uploadChatAttachment } = require('../../middleware/upload');

const { ROLES } = require('../../config/constants');

const controller = require('./controller');

const {
  roomIdParamValidation,
  listMessagesQueryValidation,
  adminSendMessageValidation,
  assignStaffValidation,
  adminListRoomsQueryValidation,
  uploadAttachmentValidation,
} = require('./validation');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.STAFF));

router.get(
  '/',
  adminListRoomsQueryValidation,
  validate,
  controller.getAdminRooms,
);

router.get(
  '/:roomId',
  roomIdParamValidation,
  validate,
  controller.getAdminRoomById,
);

router.get(
  '/:roomId/messages',
  roomIdParamValidation,
  listMessagesQueryValidation,
  validate,
  controller.getAdminRoomMessages,
);

router.post(
  '/messages',
  adminSendMessageValidation,
  validate,
  controller.adminSendMessage,
);

router.post(
  '/messages/:messageId/attachments',
  uploadAttachmentValidation,
  validate,
  uploadChatAttachment,
  controller.adminUploadAttachment,
);

router.patch(
  '/:roomId/assign',
  roomIdParamValidation,
  assignStaffValidation,
  validate,
  controller.assignStaff,
);

router.patch(
  '/:roomId/read',
  roomIdParamValidation,
  validate,
  controller.markStaffRead,
);

router.patch(
  '/:roomId/close',
  roomIdParamValidation,
  validate,
  controller.closeRoom,
);

module.exports = router;
