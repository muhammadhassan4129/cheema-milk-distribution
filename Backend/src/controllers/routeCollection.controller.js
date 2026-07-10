const RouteCollection = require('../models/RouteCollection');
const MilkRecord = require('../models/MilkRecord');
const PurchaseLedger = require('../models/PurchaseLedger');
const SupplierProfile = require('../models/SupplierProfile');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/route-collections
 * @desc    Sab collections lo (filter by date, status, driver)
 * @access  Admin, Accountant, MilkTester (apne wale)
 */
const getCollections = asyncHandler(async (req, res) => {
  const filter = {};

  // MilkTester sirf apne collections dekhega (driverId match)
  if (req.user.role === 'MilkTester') {
    filter.driverId = req.user._id;
  }

  if (req.query.date) filter.date = req.query.date;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.routeId) filter.routeId = req.query.routeId;

  const collections = await RouteCollection.find(filter)
    .populate('routeId', 'name stops')
    .populate('driverId', 'fullName username')
    .sort({ date: -1, createdAt: -1 });

  return ApiResponse.ok(collections).send(res);
});

/**
 * @route   GET /api/route-collections/:id
 * @access  Protected
 */
const getCollectionById = asyncHandler(async (req, res) => {
  const collection = await RouteCollection.findById(req.params.id)
    .populate('routeId', 'name stops')
    .populate('driverId', 'fullName username');

  if (!collection) throw ApiError.notFound('Route collection not found');
  return ApiResponse.ok(collection).send(res);
});

/**
 * @route   POST /api/route-collections
 * @desc    Naya collection banao (MilkTester)
 * @access  MilkTester, Admin
 */
const createCollection = asyncHandler(async (req, res) => {
  // driverId hamesha logged-in user ka ID use karo
  // Frontend se bhi aata hai lekin override karo security ke liye
  const collection = await RouteCollection.create({
    ...req.body,
    driverId: req.user._id, // always override — security
  });

  return ApiResponse.created(collection, 'Route collection created').send(res);
});

/**
 * @route   PUT /api/route-collections/:id
 * @desc    Collection update karo
 * @access  MilkTester (apna), Admin
 */
const updateCollection = asyncHandler(async (req, res) => {
  const collection = await RouteCollection.findById(req.params.id);
  if (!collection) throw ApiError.notFound('Collection not found');

  // MilkTester sirf apna update kar sakta hai
  if (req.user.role === 'MilkTester' && collection.driverId?.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only update your own collections');
  }

  Object.assign(collection, req.body);
  await collection.save();

  return ApiResponse.ok(collection, 'Collection updated').send(res);
});

/**
 * @route   PATCH /api/route-collections/:id/submit
 * @desc    Collection submit karo (Draft -> Submitted)
 * @access  MilkTester
 * 
 * Jab driver submit karta hai, milk records aur purchase ledger bhi update hote hain
 */
const submitCollection = asyncHandler(async (req, res) => {
  const collection = await RouteCollection.findById(req.params.id);
  if (!collection) throw ApiError.notFound('Collection not found');

  if (collection.status !== 'Draft') {
    throw ApiError.badRequest('Only Draft collections can be submitted');
  }

  collection.status = 'Submitted';
  await collection.save();

  // Milk purchase records create karo har stop ke liye
  await _createMilkRecordsFromCollection(collection, req.user._id);

  return ApiResponse.ok(collection, 'Collection submitted successfully').send(res);
});

/**
 * @route   PATCH /api/route-collections/:id/receive
 * @desc    Plant par milk receive karo (Admin/Accountant)
 * @access  Admin, Accountant
 */
const receiveCollection = asyncHandler(async (req, res) => {
  const collection = await RouteCollection.findById(req.params.id);
  if (!collection) throw ApiError.notFound('Collection not found');

  collection.status = 'Received';
  collection.receiving = req.body.receiving;
  await collection.save();

  return ApiResponse.ok(collection, 'Collection received').send(res);
});

/**
 * @route   DELETE /api/route-collections/:id
 * @access  Admin
 */
const deleteCollection = asyncHandler(async (req, res) => {
  const collection = await RouteCollection.findByIdAndDelete(req.params.id);
  if (!collection) throw ApiError.notFound('Collection not found');
  return ApiResponse.ok({ id: req.params.id }, 'Collection deleted').send(res);
});

/**
 * Helper: Collection se milk records aur purchase ledger entries banao
 * Frontend ke MilkTransactionContext.setPurchaseRecordsForDate jesa kaam
 */
const _createMilkRecordsFromCollection = async (collection, userId) => {
  const bulkMilkOps = [];
  const bulkLedgerOps = [];

  for (const stop of collection.stops) {
    if (!stop.milkLiter || stop.milkLiter <= 0) continue;

    // Supplier profile dhundo ya banao
    let supplier = await SupplierProfile.findOne({
      supplierName: { $regex: new RegExp(`^${stop.locationName}$`, 'i') },
    });

    if (!supplier) {
      supplier = await SupplierProfile.create({
        supplierName: stop.locationName,
        driverId: collection.driverId,
        driverName: collection.mtName || '',
      });
    }

    const rate = stop.price || 0;
    const amount = stop.totalPayable || stop.milkLiter * rate;

    // MilkRecord
    bulkMilkOps.push({
      date: collection.date,
      type: 'Purchase',
      partyName: stop.locationName,
      vol: stop.milkLiter,
      fat: stop.fat,
      lr: stop.lr,
      snf: stop.snf,
      totalTs: stop.totalSolids,
      rate,
      amount,
      routeId: collection.routeId,
      routeName: collection.routeName,
      createdBy: userId,
    });

    // Purchase Ledger
    bulkLedgerOps.push({
      date: collection.date,
      supplierProfileId: supplier._id,
      supplierName: supplier.supplierName,
      milkLiter: stop.milkLiter,
      fat: stop.fat,
      lr: stop.lr,
      snf: stop.snf,
      totalTs: stop.totalSolids,
      rate,
      totalAmount: amount,
      isManual: false,
      driverId: collection.driverId,
      routeId: collection.routeId,
      routeName: collection.routeName,
      createdBy: userId,
    });
  }

  if (bulkMilkOps.length > 0) {
    await MilkRecord.insertMany(bulkMilkOps);
  }
  if (bulkLedgerOps.length > 0) {
    await PurchaseLedger.insertMany(bulkLedgerOps);
  }
};

module.exports = {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  submitCollection,
  receiveCollection,
  deleteCollection,
};
