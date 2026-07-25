const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken, sanitizeUser } = require('../utils/helpers');

router.post('/auth.php', async (req, res, next) => {
  try {
    const { action, email, password, name } = req.body;

    if (action === 'login') {
      if (!email || !password) {
        return res.json({ success: false, message: 'All fields are required.' });
      }
      const user = await User.scope(null).findOne({ where: { email } });
      if (!user) {
        return res.json({ success: false, message: 'Invalid email or password credentials.' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.json({ success: false, message: 'Invalid email or password credentials.' });
      }
      return res.json({ success: true, user: sanitizeUser(user) });
    }

    if (action === 'register') {
      if (!name || !email || !password) {
        return res.json({ success: false, message: 'All fields are required.' });
      }
      const hashed = await bcrypt.hash(password, 12);
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.json({ success: false, message: 'Email already exists or error occurred.' });
      }
      await User.create({ name, email, password: hashed, role: 'user', sms_balance: 0 });
      return res.json({ success: true, message: 'Registration successful! Please sign in.' });
    }

    return res.json({ success: false, message: 'Unknown auth action.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;