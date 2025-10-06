// ============================================
// ERROR HANDLER MIDDLEWARE
// Centralized error handling for consistent responses
// ============================================

const { ApiError } = require('../utils/errors');
const { HTTP_STATUS } = require('../utils/constants');
const AuditMiddleware = require('./audit.middleware');

class ErrorHandler {
  /**
   * Global Error Handler
   */
  static handle(err, req, res, next) {
    // Log error
    console.error('Error:', err);

    // Default error
    let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message = err.message || 'Internal server error';
    let errorCode = err.errorCode || 'INTERNAL_ERROR';
    let details = err.details || null;

    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      message = 'Validation error';
      details = Object.values(err.errors).map((e) => e.message);
    }

    if (err.name === 'CastError') {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      message = 'Invalid ID format';
    }

    if (err.code === 11000) {
      statusCode = HTTP_STATUS.CONFLICT;
      message = 'Duplicate entry';
      const field = Object.keys(err.keyPattern)[0];
      details = `${field} already exists`;
    }

    if (err.name === 'JsonWebTokenError') {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
      message = 'Invalid token';
      errorCode = 'TOKEN_INVALID';
    }

    if (err.name === 'TokenExpiredError') {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
      message = 'Token expired';
      errorCode = 'TOKEN_EXPIRED';
    }

    // Audit critical errors
    if (statusCode >= 500 || err.severity === 'critical') {
      AuditMiddleware.auditSecurityEvent('error', req, {
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }

    // Send response
    res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      details,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 404 Not Found Handler
   */
  static notFound(req, res) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: `Route ${req.originalUrl} not found`,
      errorCode: 'ROUTE_NOT_FOUND',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Async Handler Wrapper
   * Catches async errors and passes to error handler
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = ErrorHandler;
