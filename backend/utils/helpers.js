const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  const u = user.toJSON ? user.toJSON() : { ...user };
  delete u.password;
  return u;
}

module.exports = { generateToken, sanitizeUser };