const express = require('express');
const router = express.Router();
const {
  sendSms, buyCredits, getProfile, getHistory, getPurchases,
} = require('../controllers/userController');
const { sendSmsValidation, buyCreditsValidation } = require('../validators/schemas');
const validate = require('../middleware/validate');
const { smsLimiter } = require('../middleware/rateLimiter');

router.get('/profile', getProfile);
router.get('/history', getHistory);
router.get('/purchases', getPurchases);
router.post('/send-sms', smsLimiter, sendSmsValidation, validate, sendSms);
router.post('/buy-credits', buyCreditsValidation, validate, buyCredits);

module.exports = router;