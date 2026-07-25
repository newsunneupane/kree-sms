const { PendingRegistration, User } = require('../models');
const emailService = require('../services/emailService');
const bcrypt = require('bcryptjs');
const { generateToken, sanitizeUser } = require('../utils/helpers');

exports.submitRegistration = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    await PendingRegistration.destroy({ where: { email } });

    await PendingRegistration.create({
      name,
      email,
      password: hashedPassword,
      otp_code: otp,
      status: 'waiting_otp',
    });

    await emailService.sendOtpEmail(email, name, otp);

    res.json({ success: true, message: 'Verification OTP sent! Check your email inbox.', otp: process.env.NODE_ENV === 'development' ? otp : undefined });
  } catch (error) {
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const staged = await PendingRegistration.findOne({
      where: { email, status: 'waiting_otp' },
    });

    if (!staged || staged.otp_code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    await User.create({
      name: staged.name, email: staged.email, password: staged.password,
      role: 'user', sms_balance: 0,
    }, { hooks: false });

    await staged.destroy();

    res.json({ success: true, message: 'Email verified! Your account is now active. Please sign in.' });
  } catch (error) {
    next(error);
  }
};