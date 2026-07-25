const express = require('express');
const router = express.Router();
const { PendingRegistration, User } = require('../models');
const emailService = require('../services/emailService');
const bcrypt = require('bcryptjs');

router.post('/register.php', async (req, res, next) => {
  try {
    const { action, name, email, password, otp } = req.body;

    if (action === 'submit_registration') {
      if (!name || !email || !password) {
        return res.json({ success: false, message: 'All registration fields are mandatory.' });
      }

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.json({ success: false, message: 'An active profile already uses this email address.' });
      }

      const hashed = await bcrypt.hash(password, 12);
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      await PendingRegistration.destroy({ where: { email } });
      await PendingRegistration.create({
        name, email, password: hashed, otp_code: otpCode, status: 'waiting_otp',
      });

      emailService.sendOtpEmail(email, name, otpCode);

      return res.json({ success: true, message: 'Verification OTP sent! Check your email inbox.' });
    }

    if (action === 'verify_otp') {
      if (!email || !otp) {
        return res.json({ success: false, message: 'Email and OTP are required.' });
      }

      const staged = await PendingRegistration.findOne({
        where: { email, status: 'waiting_otp' },
      });

      if (!staged || staged.otp_code !== otp) {
        return res.json({ success: false, message: 'Invalid or expired verification code.' });
      }

      await User.create({
        name: staged.name, email: staged.email, password: staged.password,
        role: 'user', sms_balance: 0,
      }, { hooks: false });

      await staged.destroy();

      return res.json({ success: true, message: 'Email verified! Your account is now active. Please sign in.' });
    }

    return res.json({ success: false, message: 'Unknown register action.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;