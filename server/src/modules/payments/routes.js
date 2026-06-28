const express = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const controller = require('./controller');
const { confirmPaymentValidation } = require('./validation');

const router = express.Router();

router.use(authenticate);

router.post('/vnpay/confirm', confirmPaymentValidation, validate, controller.confirmPayment);

module.exports = router;