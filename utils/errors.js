// ============================================
// CUSTOM ERROR CLASSES
// ============================================

const { HTTP_STATUS, ERROR_CODES } = require('./constants');

// Base API Error
class ApiError extends Error {
  constructor(statusCode, message, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Used to distinguish from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication Error
class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed', details = null) {
    super(
      HTTP_STATUS.UNAUTHORIZED,
      message,
      ERROR_CODES.INVALID_CREDENTIALS,
      details
    );
  }
}

// Authorization Error
class AuthorizationError extends ApiError {
  constructor(message = 'Access denied', details = null) {
    super(
      HTTP_STATUS.FORBIDDEN,
      message,
      ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      details
    );
  }
}

// Validation Error
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = null) {
    super(
      HTTP_STATUS.BAD_REQUEST,
      message,
      ERROR_CODES.VALIDATION_ERROR,
      details
    );
  }
}

// Not Found Error
class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(HTTP_STATUS.NOT_FOUND, `${resource} not found`);
  }
}

// Conflict Error
class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(HTTP_STATUS.CONFLICT, message, ERROR_CODES.DUPLICATE_ENTRY);
  }
}

module.exports = {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
};
