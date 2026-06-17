const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  itemIdParamValidation,
  addItemValidation,
  updateItemValidation,
} = require('./validation');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.CUSTOMER));

router.get('/', controller.getCart);
router.post('/items', addItemValidation, validate, controller.addItem);
router.put('/items/:itemId', updateItemValidation, validate, controller.updateItem);
router.delete('/items/:itemId', itemIdParamValidation, validate, controller.deleteItem);
router.delete('/clear', controller.clearCart);

module.exports = router;
