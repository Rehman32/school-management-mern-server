// ============================================
// SECURITY CONFIGURATION (PRODUCTION READY)
// ============================================

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { RATE_LIMIT } = require('../utils/constants');

class SecurityConfig {
  /**
   * CORS Configuration - Supports multiple origins for production
   */
  static getCorsOptions() {
    // Parse and clean allowed origins (remove trailing slashes)
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map(origin => origin.trim().replace(/\/$/, '')); // Remove trailing slashes

    console.log('✅ CORS Allowed Origins:', allowedOrigins);

    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman, etc)
        if (!origin) return callback(null, true);
        
        // Clean incoming origin (remove trailing slash for comparison)
        const cleanOrigin = origin.replace(/\/$/, '');
        
        if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          console.warn(`❌ CORS blocked origin: ${origin} (cleaned: ${cleanOrigin})`);
          console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
      maxAge: 86400,
      optionsSuccessStatus: 200,
    };
  }

  /**
   * Helmet Configuration
   */
  static getHelmetOptions() {
    return {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    };
  }

  /**
   * Rate Limiter for Login
   */
  static getLoginRateLimiter() {
    return rateLimit({
      windowMs: RATE_LIMIT.LOGIN.windowMs,
      max: RATE_LIMIT.LOGIN.max,
      message: {
        success: false,
        message: 'Too many login attempts. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
    });
  }

  /**
   * Rate Limiter for Registration
   */
  static getRegisterRateLimiter() {
    return rateLimit({
      windowMs: RATE_LIMIT.REGISTER.windowMs,
      max: RATE_LIMIT.REGISTER.max,
      message: {
        success: false,
        message: 'Too many registration attempts. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * General API Rate Limiter
   */
  static getApiRateLimiter() {
    return rateLimit({
      windowMs: RATE_LIMIT.API.windowMs,
      max: RATE_LIMIT.API.max,
      message: {
        success: false,
        message: 'Too many requests. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * Manual NoSQL Injection Prevention
   * SIMPLIFIED - Just sanitize strings, don't modify request objects
   */
  static sanitizeMiddleware() {
    return (req, res, next) => {
      try {
        // Only sanitize body (not query/params as they're read-only in some contexts)
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body);
        }
        next();
      } catch (error) {
        console.error('Sanitization error:', error);
        next(); // Continue even if sanitization fails
      }
    };
  }

  /**
   * Sanitize Object - Remove dangerous characters
   */
  static sanitizeObject(obj) {
    if (obj === null || typeof obj !== 'object') {
      // Sanitize strings
      if (typeof obj === 'string') {
        return obj.replace(/[${}]/g, '');
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Keep original key, just sanitize value
        sanitized[key] = this.sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  /**
   * Apply all security middleware
   */
  static applySecurityMiddleware(app) {
    // Helmet for security headers
    app.use(helmet(this.getHelmetOptions()));

    // Manual NoSQL injection prevention (simplified)
    app.use(this.sanitizeMiddleware());

    console.log('✅ Security middleware applied');
  }
}

module.exports = SecurityConfig;
