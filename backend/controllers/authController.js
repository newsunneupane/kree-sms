const { User } = require('../models');
const { generateToken, sanitizeUser } = require('../utils/helpers');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.scope(null).findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
};