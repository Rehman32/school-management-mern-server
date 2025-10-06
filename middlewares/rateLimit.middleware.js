// ============================================
// RATE LIMIT MIDDLEWARE
// Protect against brute force and DDoS
// ============================================

const rateLimit = require('express-rate-limit');
const { RATE_LIMIT, HTTP_STATUS } = require('../utils/constants');

class RateLimitMiddleware {
  /**
   * Login Rate Limiter
   */
  static loginLimiter = rateLimit({
    windowMs: RATE_LIMIT.LOGIN.windowMs,
    max: RATE_LIMIT.LOGIN.max,
    message: {
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many login attempts from this IP. Please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(RATE_LIMIT.LOGIN.windowMs / 1000 / 60) + ' minutes',
      });
    },
  });

  /**
   * Registration Rate Limiter
   */
  static registerLimiter = rateLimit({
    windowMs: RATE_LIMIT.REGISTER.windowMs,
    max: RATE_LIMIT.REGISTER.max,
    message: {
      success: false,
      message: 'Too many registration attempts. Please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many registration attempts from this IP.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(RATE_LIMIT.REGISTER.windowMs / 1000 / 60) + ' minutes',
      });
    },
  });

  /**
   * General API Rate Limiter
   */
  static apiLimiter = rateLimit({
    windowMs: RATE_LIMIT.API.windowMs,
    max: RATE_LIMIT.API.max,
    message: {
      success: false,
      message: 'Too many requests. Please slow down.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for super admins
      return req.user && req.user.role === 'super_admin';
    },
  });

  /**
   * Strict Rate Limiter (for sensitive operations)
   */
  static strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Only 3 attempts per hour
    message: {
      success: false,
      message: 'Too many attempts. This action is rate-limited for security.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  /**
   * Password Reset Rate Limiter
   */
  static passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
      success: false,
      message: 'Too many password reset requests. Please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
  });

  /**
   * Email Verification Rate Limiter
   */
  static emailVerificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
      success: false,
      message: 'Too many email verification requests.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
  });
}

module.exports = RateLimitMiddleware;
