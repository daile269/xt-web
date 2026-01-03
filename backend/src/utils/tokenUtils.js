const jwt = require('jsonwebtoken');

/**
 * Generate access token (short-lived: 15 minutes)
 */
const generateAccessToken = (userId, username) => {
  return jwt.sign(
    { id: userId, username },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // 15 minutes
  );
};

/**
 * Generate refresh token (long-lived: 7 days)
 */
const generateRefreshToken = (userId, username) => {
  return jwt.sign(
    { id: userId, username },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' } // 7 days
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
};
