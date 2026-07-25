const authenticate = (req, res, next) => {
  const adminId = req.body.admin_id || req.query.admin_id;
  if (!adminId) {
    return res.status(401).json({ success: false, message: 'Admin ID required.' });
  }
  req.adminId = parseInt(adminId, 10);
  next();
};

const requireAdmin = async (req, res, next) => {
  try {
    const { User } = require('../models');
    const user = await User.findByPk(req.adminId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access Denied. Admins only.' });
    }
    req.admin = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Authorization check failed.' });
  }
};

module.exports = { authenticate: authenticate, requireAdmin };