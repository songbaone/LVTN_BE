const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { uploadChatAttachment } = require('../../middleware/upload');

const { ROLES } = require('../../config/constants');

const controller = require('./controller');

const {
  listMessagesQueryValidation,
  sendMessageValidation,
  uploadAttachmentValidation,
} = require('./validation');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.CUSTOMER));

router.post('/room', controller.createRoom);
router.get('/room', controller.getCustomerRoom);
router.get('/room/messages', listMessagesQueryValidation, validate, controller.getCustomerMessages);
router.post('/messages', sendMessageValidation, validate, controller.sendMessage);
router.post(
  '/messages/:messageId/attachments',
  uploadAttachmentValidation,
  validate,
  uploadChatAttachment,
  controller.uploadAttachment,
);
router.patch('/room/read', controller.markCustomerRead);

module.exports = router;