// ============================================
// JWT CONFIGURATION
// ============================================

const { TOKEN_EXPIRY } = require('../utils/constants');

module.exports = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  
  accessToken: {
    expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN,
  },
  
  refreshToken: {
    expiresIn: TOKEN_EXPIRY.REFRESH_TOKEN,
  },
  
  cookieOptions: {
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};
