const User = require('../models/User');

/**
 * Middleware to check if user is admin
 */
const isAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated (set by authenticate middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Please login first'
      });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - Admin access required'
      });
    }

    // User is admin, proceed
    req.adminUser = req.user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin authentication'
    });
  }
};

module.exports = { isAdmin };
