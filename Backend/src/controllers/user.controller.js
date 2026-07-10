const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/users
 * @desc    Sab users lo (Admin only)
 * @access  Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return ApiResponse.ok(users, 'Users fetched').send(res);
});

/**
 * @route   GET /api/users/:id
 * @desc    Single user
 * @access  Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  return ApiResponse.ok(user).send(res);
});

/**
 * @route   POST /api/users
 * @desc    Naya user banao (Admin only)
 * @access  Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const { fullName, username, password, phone, role, status, cnic, openingBalance } = req.body;

  // Username duplicate check
  const exists = await User.findOne({ username: username.toLowerCase() });
  if (exists) throw ApiError.conflict(`Username '${username}' already taken`);

  // Driver role ke liye password optional — auto-generate karo (woh login nahi karta)
  const finalPassword = password || (role === 'Driver' ? `driver_${Date.now()}` : null);
  if (!finalPassword) throw ApiError.badRequest('Password is required');

  const user = await User.create({
    fullName,
    username,
    password: finalPassword,
    phone: phone || '',
    role,
    status: status || 'Active',
    cnic: cnic || '',
    openingBalance: openingBalance || 0,
  });

  return ApiResponse.created(user, 'User created successfully').send(res);
});

/**
 * @route   PUT /api/users/:id
 * @desc    User update karo (Admin only)
 * @access  Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const { password, ...updateData } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  // Agar password change karna ho
  if (password && password.trim().length >= 6) {
    user.password = password;
  }

  // Baki fields update karo
  Object.assign(user, updateData);
  await user.save();

  return ApiResponse.ok(user, 'User updated').send(res);
});

/**
 * @route   DELETE /api/users/:id
 * @desc    User delete karo (Admin only)
 * @access  Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  return ApiResponse.ok({ id: req.params.id }, 'User deleted').send(res);
});

/**
 * @route   PATCH /api/users/:id/toggle-status
 * @desc    User Active/Inactive toggle (Admin only)
 * @access  Admin
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  user.status = user.status === 'Active' ? 'Inactive' : 'Active';
  await user.save();

  return ApiResponse.ok(user, `User status changed to ${user.status}`).send(res);
});

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser, toggleUserStatus };
