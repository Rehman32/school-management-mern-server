// ============================================
// STANDARDIZED API RESPONSES
// ============================================

const { HTTP_STATUS } = require('./constants');

class ApiResponse {
  /**
   * Success response
   */
  static success(res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Created response
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  /**
   * Error response
   */
  static error(res, message = 'An error occurred', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode = null, details = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Validation error response
   */
  static validationError(res, errors) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Pagination response
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = ApiResponse;
