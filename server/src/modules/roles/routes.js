const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.STAFF));

router.get('/', controller.getAllRoles);
router.get('/:id', controller.getRoleById);

module.exports = router;
