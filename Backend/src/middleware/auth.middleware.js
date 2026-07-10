const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication Middleware
 * Har protected route par pehle ye chalega
 * JWT token verify karega
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Token Authorization header se lo
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('No token provided. Please login.');
  }

  // Token verify karo
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired. Please login again.');
    }
    throw ApiError.unauthorized('Invalid token. Please login again.');
  }

  // User DB mein hai?
  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists.');
  }

  if (user.status === 'Inactive') {
    throw ApiError.forbidden('Your account has been deactivated. Contact admin.');
  }

  // Request mein user attach karo
  req.user = user;
  next();
});

module.exports = { protect };
