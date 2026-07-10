const Route = require('../models/Route');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/routes
 * @access  Protected (all roles)
 */
const getRoutes = asyncHandler(async (req, res) => {
  const routes = await Route.find()
    .populate('assignedMilkTesterIds', 'fullName username role')
    .sort({ createdAt: -1 });
  return ApiResponse.ok(routes).send(res);
});

/**
 * @route   GET /api/routes/my-routes
 * @desc    Milk tester ko sirf uske assigned routes milein
 * @access  Protected
 */
const getMyRoutes = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const userId = req.user._id;

  console.log('[getMyRoutes] user:', req.user.fullName, '| _id:', userId, '| role:', req.user.role);

  // String ya ObjectId dono handle karo
  const userIdStr = userId.toString();

  // Find routes where this user is in assignedMilkTesterIds
  // Support both ObjectId and string storage
  const allRoutes = await Route.find({
    assignedMilkTesterIds: { $exists: true, $ne: [] }
  }).populate('assignedMilkTesterIds', 'fullName username role');

  // Filter: match by string comparison to handle ObjectId/string mismatch
  const myRoutes = allRoutes.filter(route => {
    const ids = (route.assignedMilkTesterIds || []).map((t) =>
      typeof t === 'object' ? (t._id || t).toString() : t.toString()
    );
    return ids.includes(userIdStr);
  });

  // Also do a direct DB query as primary method
  const mongoose2 = require('mongoose');
  const directRoutes = await Route.find({
    assignedMilkTesterIds: mongoose2.Types.ObjectId.isValid(userIdStr)
      ? new mongoose2.Types.ObjectId(userIdStr)
      : userIdStr
  }).populate('assignedMilkTesterIds', 'fullName username role').sort({ createdAt: -1 });

  // Merge both results (direct query + string match), deduplicate by id
  const combined = [...directRoutes];
  myRoutes.forEach(r => {
    if (!combined.find(c => c._id.toString() === r._id.toString())) {
      combined.push(r);
    }
  });

  console.log('[getMyRoutes] found routes:', combined.map(r => r.name));

  return ApiResponse.ok(combined).send(res);
});

/**
 * @route   GET /api/routes/:id
 * @access  Protected
 */
const getRouteById = asyncHandler(async (req, res) => {
  const route = await Route.findById(req.params.id);
  if (!route) throw ApiError.notFound('Route not found');
  return ApiResponse.ok(route).send(res);
});

/**
 * @route   POST /api/routes
 * @access  Admin
 */
const createRoute = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const routeData = { ...req.body };

  if (Array.isArray(routeData.assignedMilkTesterIds)) {
    routeData.assignedMilkTesterIds = routeData.assignedMilkTesterIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id.toString()));
  }

  const route = await Route.create({
    ...routeData,
    createdBy: req.user._id,
  });
  return ApiResponse.created(route, 'Route created').send(res);
});

/**
 * @route   PATCH /api/routes/:id/assign-testers
 * @desc    Route ko milk testers assign karo (replace all)
 * @access  Admin
 */
const assignMilkTesters = asyncHandler(async (req, res) => {
  const { assignedMilkTesterIds } = req.body;

  if (!Array.isArray(assignedMilkTesterIds)) {
    throw ApiError.badRequest('assignedMilkTesterIds must be an array');
  }

  // Filter out invalid ObjectIds
  const mongoose = require('mongoose');
  const validIds = assignedMilkTesterIds.filter(id =>
    mongoose.Types.ObjectId.isValid(id)
  );

  console.log(`[assignMilkTesters] route: ${req.params.id}, received: ${assignedMilkTesterIds.length}, valid: ${validIds.length}, ids:`, validIds);

  const route = await Route.findByIdAndUpdate(
    req.params.id,
    { $set: { assignedMilkTesterIds: validIds } },
    { new: true, runValidators: true }
  ).populate('assignedMilkTesterIds', 'fullName username role');

  if (!route) throw ApiError.notFound('Route not found');

  console.log(`[assignMilkTesters] saved assignedMilkTesterIds:`, route.assignedMilkTesterIds);

  return ApiResponse.ok(route, 'Milk testers assigned successfully').send(res);
});

/**
 * @route   PUT /api/routes/:id
 * @access  Admin
 */
const updateRoute = asyncHandler(async (req, res) => {
  const updateData = { ...req.body };

  // assignedMilkTesterIds ko explicitly $set karo - array replacement ke liye
  const updateOp = {};
  if (updateData.assignedMilkTesterIds !== undefined) {
    const mongoose = require('mongoose');
    const validIds = (updateData.assignedMilkTesterIds || []).filter(id =>
      mongoose.Types.ObjectId.isValid(id)
    );
    updateOp.$set = { ...updateData, assignedMilkTesterIds: validIds };
    delete updateOp.$set.assignedMilkTesterIds; // alag handle
    updateOp.$set.assignedMilkTesterIds = validIds;
  } else {
    updateOp.$set = updateData;
  }

  const route = await Route.findByIdAndUpdate(req.params.id, updateOp, {
    new: true,
    runValidators: true,
  }).populate('assignedMilkTesterIds', 'fullName username role');

  if (!route) throw ApiError.notFound('Route not found');
  return ApiResponse.ok(route, 'Route updated').send(res);
});

/**
 * @route   DELETE /api/routes/:id
 * @access  Admin
 */
const deleteRoute = asyncHandler(async (req, res) => {
  const route = await Route.findByIdAndDelete(req.params.id);
  if (!route) throw ApiError.notFound('Route not found');
  return ApiResponse.ok({ id: req.params.id }, 'Route deleted').send(res);
});

module.exports = { getRoutes, getMyRoutes, getRouteById, createRoute, updateRoute, assignMilkTesters, deleteRoute };
