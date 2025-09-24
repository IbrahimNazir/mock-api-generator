const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authorize = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return false;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
        return false;
    }
    req.user = user;
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = authorize;