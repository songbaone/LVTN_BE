const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { ROLES } = require('../../config/constants');
const controller = require('./controller');
const {
  paymentIdParamValidation,
  listPaymentsQueryValidation,
  updatePaymentStatusValidation,
} = require('./validation');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.STAFF));

router.get('/', listPaymentsQueryValidation, validate, controller.getPayments);
router.get('/:id', paymentIdParamValidation, validate, controller.getPaymentById);
router.patch('/:id/status', updatePaymentStatusValidation, validate, controller.updatePaymentStatus);

module.exports = router;