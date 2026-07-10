const Vehicle = require('../models/Vehicle');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/vehicles
 * @access  Admin, Accountant
 */
const getVehicles = asyncHandler(async (req, res) => {
  // populate fail hone pe bhi vehicles return hon
  const vehicles = await Vehicle.find()
    .populate({ path: 'driverId', select: 'fullName username phone', strictPopulate: false })
    .sort({ createdAt: -1 });
  return ApiResponse.ok(vehicles).send(res);
});

/**
 * @route   POST /api/vehicles
 * @access  Admin
 */
const createVehicle = asyncHandler(async (req, res) => {
  const { vehicleNumber } = req.body;

  const exists = await Vehicle.findOne({ vehicleNumber });
  if (exists) throw ApiError.conflict(`Vehicle ${vehicleNumber} already exists`);

  // driverId empty string ya invalid ho toh null karo — CastError se bacho
  const data = { ...req.body };
  if (!data.driverId || data.driverId === '' || data.driverId === 'undefined') {
    data.driverId = null;
  }

  const vehicle = await Vehicle.create(data);
  return ApiResponse.created(vehicle, 'Vehicle added').send(res);
});

/**
 * @route   PUT /api/vehicles/:id
 * @access  Admin
 */
const updateVehicle = asyncHandler(async (req, res) => {
  // driverId empty string ya invalid ho toh null karo — CastError se bacho
  const data = { ...req.body };
  if (!data.driverId || data.driverId === '' || data.driverId === 'undefined') {
    data.driverId = null;
  }

  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  return ApiResponse.ok(vehicle, 'Vehicle updated').send(res);
});

/**
 * @route   DELETE /api/vehicles/:id
 * @access  Admin
 */
const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  return ApiResponse.ok({ id: req.params.id }, 'Vehicle deleted').send(res);
});

module.exports = { getVehicles, createVehicle, updateVehicle, deleteVehicle };
