/**
 * Custom API Error Class
 * Sab errors is class se handle honge
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.message = message;
    this.errors = errors; // Validation errors array

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // 400 - Bad Request
  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(400, message, errors);
  }

  // 401 - Unauthorized (Login nahi kiya)
  static unauthorized(message = 'Unauthorized. Please login.') {
    return new ApiError(401, message);
  }

  // 403 - Forbidden (Role allowed nahi)
  static forbidden(message = 'Access denied. Insufficient permissions.') {
    return new ApiError(403, message);
  }

  // 404 - Not Found
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  // 409 - Conflict (duplicate entry)
  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }

  // 500 - Internal Server Error
  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
