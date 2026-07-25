const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { submitRegistration, verifyOtp } = require('../controllers/registerController');
const { loginValidation, registerValidation } = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/register', authLimiter, registerValidation, validate, submitRegistration);
router.post('/verify-otp', verifyOtp);

module.exports = router;