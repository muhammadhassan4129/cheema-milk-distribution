const ApiError = require('../utils/ApiError');

/**
 * Global Error Handler Middleware
 * Sab unhandled errors yahan aate hain
 * Express mein last middleware hona chahiye
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Agar ApiError nahi hai toh convert karo
  if (!(error instanceof ApiError)) {
    // Mongoose CastError (invalid ObjectId) — Frontend sync ka common issue
    if (err.name === 'CastError') {
      error = ApiError.notFound(
        `Cast to ObjectId failed for value "${err.value}" at path "${err.path}" — Invalid MongoDB ObjectId`
      );
    }
    // Mongoose Duplicate Key Error
    else if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const value = err.keyValue[field];
      error = ApiError.conflict(`${field} '${value}' already exists`);
    }
    // Mongoose Validation Error — schema mismatch
    else if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => ({
        field: val.path,
        message: val.message,
      }));
      error = ApiError.badRequest('Validation Error', messages);
    }
    else {
      error = ApiError.internal(err.message || 'Something went wrong');
    }
  }

  // Always log errors (stack only in development)
  console.error(`[ErrorHandler] ${req.method} ${req.originalUrl} → ${error.statusCode}: ${error.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    errors: error.errors || [],
    errorType: err.name || 'Error',  // CastError, ValidationError etc. frontend ke liye
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};


/**
 * 404 Not Found Handler
 * Koi route match nahi hua
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

module.exports = { errorHandler, notFoundHandler };
