const Dispatch = require('../models/Dispatch');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/dispatches
 * @desc    Sab dispatches lo
 * @access  Admin, Accountant, MilkTester (apne)
 */
const getDispatches = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === 'MilkTester') {
    filter.driverId = req.user._id;
  }

  if (req.query.date) filter.date = req.query.date;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.vehicleNumber) filter.vehicleNumber = req.query.vehicleNumber;

  const dispatches = await Dispatch.find(filter)
    .populate('driverId', 'fullName username phone')
    .populate('vehicleId', 'vehicleNumber name')
    .sort({ date: -1, createdAt: -1 });

  return ApiResponse.ok(dispatches).send(res);
});

/**
 * @route   GET /api/dispatches/:id
 * @access  Protected
 */
const getDispatchById = asyncHandler(async (req, res) => {
  const dispatch = await Dispatch.findById(req.params.id)
    .populate('driverId', 'fullName username phone')
    .populate('vehicleId', 'vehicleNumber name');

  if (!dispatch) throw ApiError.notFound('Dispatch not found');
  return ApiResponse.ok(dispatch).send(res);
});

/**
 * @route   POST /api/dispatches
 * @desc    Naya dispatch banao
 * @access  Admin, Accountant
 */
const createDispatch = asyncHandler(async (req, res) => {
  const dispatch = await Dispatch.create({
    ...req.body,
    createdBy: req.user._id,
  });
  return ApiResponse.created(dispatch, 'Dispatch created').send(res);
});

/**
 * @route   PATCH /api/dispatches/:id/status
 * @desc    Dispatch status update karo
 * @access  Admin, Accountant, Driver
 */
const updateDispatchStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) throw ApiError.badRequest('Status is required');

  const dispatch = await Dispatch.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!dispatch) throw ApiError.notFound('Dispatch not found');
  return ApiResponse.ok(dispatch, `Status updated to ${status}`).send(res);
});

/**
 * @route   PATCH /api/dispatches/:id/mark-sold
 * @desc    Dispatch sold mark karo
 * @access  Admin, Accountant
 */
const markAsSold = asyncHandler(async (req, res) => {
  const { isSold, soldDate } = req.body;

  const dispatch = await Dispatch.findByIdAndUpdate(
    req.params.id,
    {
      isSold,
      soldDate: soldDate || new Date().toISOString().split('T')[0],
      status: 'Completed',
    },
    { new: true }
  );

  if (!dispatch) throw ApiError.notFound('Dispatch not found');
  return ApiResponse.ok(dispatch, 'Dispatch marked as sold').send(res);
});

/**
 * @route   POST /api/dispatches/:id/destination-entry
 * @desc    Destination par entry add karo
 * @access  Admin, Accountant
 */
const addDestinationEntry = asyncHandler(async (req, res) => {
  const dispatch = await Dispatch.findById(req.params.id);
  if (!dispatch) throw ApiError.notFound('Dispatch not found');

  dispatch.destinationEntries.push(req.body);
  await dispatch.save();

  return ApiResponse.ok(dispatch, 'Destination entry added').send(res);
});

/**
 * @route   PATCH /api/dispatches/:id/receive
 * @desc    Dispatch receive karo (driver ne deliver kiya)
 * @access  Admin, Accountant
 */
const receiveDispatch = asyncHandler(async (req, res) => {
  const { receivedEntries } = req.body;

  const dispatch = await Dispatch.findByIdAndUpdate(
    req.params.id,
    {
      status: 'Received',
      receivedEntries: receivedEntries || [],
    },
    { new: true }
  );

  if (!dispatch) throw ApiError.notFound('Dispatch not found');
  return ApiResponse.ok(dispatch, 'Dispatch received').send(res);
});

/**
 * @route   DELETE /api/dispatches/:id
 * @access  Admin
 */
const deleteDispatch = asyncHandler(async (req, res) => {
  const dispatch = await Dispatch.findByIdAndDelete(req.params.id);
  if (!dispatch) throw ApiError.notFound('Dispatch not found');
  return ApiResponse.ok({ id: req.params.id }, 'Dispatch deleted').send(res);
});

module.exports = {
  getDispatches,
  getDispatchById,
  createDispatch,
  updateDispatchStatus,
  markAsSold,
  addDestinationEntry,
  receiveDispatch,
  deleteDispatch,
};
