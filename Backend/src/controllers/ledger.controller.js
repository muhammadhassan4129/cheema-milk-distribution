const PurchaseLedger = require('../models/PurchaseLedger');
const SaleLedger = require('../models/SaleLedger');
const SupplierProfile = require('../models/SupplierProfile');
const CustomerProfile = require('../models/CustomerProfile');
const MilkRecord = require('../models/MilkRecord');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// ─── PURCHASE LEDGER ─────────────────────────────────────────────────────────

/**
 * GET /api/ledger/purchase
 * Query: date, supplierName, supplierProfileId, startDate, endDate, driverId
 * Frontend: PurchaseLedger.tsx - har date ke saare entries fetch karna
 */
const getPurchaseLedger = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.date) filter.date = req.query.date;
  if (req.query.supplierName) filter.supplierName = new RegExp(req.query.supplierName, 'i');
  if (req.query.supplierProfileId) filter.supplierProfileId = req.query.supplierProfileId;
  if (req.query.driverId) filter.driverId = req.query.driverId;
  if (req.query.startDate && req.query.endDate) {
    filter.date = { $gte: req.query.startDate, $lte: req.query.endDate };
  }

  const entries = await PurchaseLedger.find(filter)
    .populate('supplierProfileId', 'supplierName phoneNumber location openingBalance')
    .sort({ date: -1, createdAt: -1 });

  // Sirf completely empty entries hide karo (koi bhi transaction nahi)
  // advance-only ya cash-only entries bhi valid hain — milkLiter=0 pe filter mat karo
  const filtered = entries.filter(e =>
    (e.totalAmount || 0) > 0 ||
    (e.advanceAmount || 0) > 0 ||
    (e.paymentReceived || 0) > 0 ||
    (e.discountAmount || 0) > 0
  );

  // NOTE: Dedupe yahan NAHI karni — same party se same rate pe genuinely 2 baar
  // milk purchase ho sakti hai. Duplicate prevention frontend ki ID se hoti hai.

  return ApiResponse.ok(filtered).send(res);
});

/**
 * GET /api/ledger/purchase/by-supplier/:supplierProfileId
 * Ek supplier ki poori history - running balance ke liye
 */
const getPurchaseLedgerBySupplier = asyncHandler(async (req, res) => {
  const entries = await PurchaseLedger.find({ supplierProfileId: req.params.supplierProfileId })
    .sort({ date: 1, createdAt: 1 });
  return ApiResponse.ok(entries).send(res);
});

/**
 * POST /api/ledger/purchase
 * Frontend: PurchaseLedger.tsx mein "Save Entry" button
 */
const createPurchaseLedgerEntry = asyncHandler(async (req, res) => {
  if (req.body.driverId === 'DIRECT' || req.body.driverId === '') {
    req.body.driverId = null;
  }

  // Duplicate check: sirf same MongoDB _id wali entry block karo
  // Same values wali 2 alag entries ALLOWED hain — genuinely 2 baar purchase ho sakti hai
  if (req.body.id && /^[a-f\d]{24}$/i.test(String(req.body.id))) {
    const existing = await PurchaseLedger.findById(req.body.id);
    if (existing) {
      return ApiResponse.ok(existing, 'Entry already exists').send(res);
    }
  }

  const entry = await PurchaseLedger.create({
    ...req.body,
    createdBy: req.user._id,
  });
  return ApiResponse.created(entry, 'Purchase ledger entry added').send(res);
});

/**
 * POST /api/ledger/purchase/bulk
 * Bulk insert - MilkPurchases.tsx "Save All" button ke baad
 * Pehle us date+routeId ke entries delete karo phir naye add karo
 */
const bulkCreatePurchaseLedger = asyncHandler(async (req, res) => {
  const { date, routeId, entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw ApiError.badRequest('Entries array required');
  }

  // Same date + routeId ke existing entries delete karo (overwrite behavior)
  if (routeId && routeId !== 'all') {
    await PurchaseLedger.deleteMany({ date, routeId, isManual: false });
  } else if (routeId === 'all') {
    await PurchaseLedger.deleteMany({ date, isManual: false });
  }

  const created = await PurchaseLedger.insertMany(
    entries.map(e => ({ ...e, date: date || e.date, createdBy: req.user._id }))
  );
  return ApiResponse.created(created, `${created.length} entries saved`).send(res);
});

/**
 * PUT /api/ledger/purchase/:id
 * Frontend: PurchaseLedger.tsx mein inline edit
 */
const updatePurchaseLedgerEntry = asyncHandler(async (req, res) => {
  if (req.body.driverId === 'DIRECT' || req.body.driverId === '') {
    req.body.driverId = null;
  }
  const entry = await PurchaseLedger.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!entry) throw ApiError.notFound('Purchase ledger entry not found');
  return ApiResponse.ok(entry, 'Entry updated').send(res);
});

/**
 * DELETE /api/ledger/purchase/:id
 */
const deletePurchaseLedgerEntry = asyncHandler(async (req, res) => {
  const entry = await PurchaseLedger.findByIdAndDelete(req.params.id);
  if (!entry) throw ApiError.notFound('Purchase ledger entry not found');
  // Linked milk record bhi delete karo agar hai
  if (entry.milkRecordId) {
    await MilkRecord.findByIdAndDelete(entry.milkRecordId);
  }
  return ApiResponse.ok({ id: req.params.id }, 'Entry deleted').send(res);
});

/**
 * GET /api/ledger/purchase/summary
 * AdminDashboard - today's purchases total, monthly total
 * Net = gross minus spoiled (milkLiter - spoiledLiters, totalAmount - spoiledAmount)
 */
const getPurchaseSummary = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const [todayResult, monthResult, allTime] = await Promise.all([
    PurchaseLedger.aggregate([
      { $match: { date: today } },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$spoiledAmount', 0] }] } },
          liters: { $sum: { $subtract: ['$milkLiter', { $ifNull: ['$spoiledLiters', 0] }] } },
          count: { $sum: 1 },
        },
      },
    ]),
    PurchaseLedger.aggregate([
      { $match: { date: { $gte: firstOfMonth } } },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$spoiledAmount', 0] }] } },
          liters: { $sum: { $subtract: ['$milkLiter', { $ifNull: ['$spoiledLiters', 0] }] } },
        },
      },
    ]),
    PurchaseLedger.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$spoiledAmount', 0] }] } },
          liters: { $sum: { $subtract: ['$milkLiter', { $ifNull: ['$spoiledLiters', 0] }] } },
        },
      },
    ]),
  ]);

  return ApiResponse.ok({
    today: todayResult[0] || { total: 0, liters: 0, count: 0 },
    thisMonth: monthResult[0] || { total: 0, liters: 0 },
    allTime: allTime[0] || { total: 0, liters: 0 },
  }).send(res);
});

// ─── SALE LEDGER ─────────────────────────────────────────────────────────────

/**
 * GET /api/ledger/sale
 */
const getSaleLedger = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.date) filter.date = req.query.date;
  if (req.query.customerName) filter.customerName = new RegExp(req.query.customerName, 'i');
  if (req.query.customerProfileId) filter.customerProfileId = req.query.customerProfileId;
  if (req.query.startDate && req.query.endDate) {
    filter.date = { $gte: req.query.startDate, $lte: req.query.endDate };
  }

  const entries = await SaleLedger.find(filter)
    .populate('customerProfileId', 'customerName phoneNumber location openingBalance')
    .sort({ date: -1, createdAt: -1 });

  // Sirf completely empty entries hide karo
  // advance-only ya cash-only entries bhi valid hain
  const filtered = entries.filter(e =>
    (e.totalAmount || 0) > 0 ||
    (e.advanceAmount || 0) > 0 ||
    (e.paymentReceived || 0) > 0 ||
    (e.discountAmount || 0) > 0
  );

  // NOTE: Dedupe yahan NAHI karni — same customer ko same rate pe genuinely 2 baar
  // sale ho sakti hai. Duplicate prevention frontend ki ID se hoti hai.

  return ApiResponse.ok(filtered).send(res);
});

/**
 * GET /api/ledger/sale/by-customer/:customerProfileId
 */
const getSaleLedgerByCustomer = asyncHandler(async (req, res) => {
  const entries = await SaleLedger.find({ customerProfileId: req.params.customerProfileId })
    .sort({ date: 1, createdAt: 1 });
  return ApiResponse.ok(entries).send(res);
});

/**
 * POST /api/ledger/sale
 */
const createSaleLedgerEntry = asyncHandler(async (req, res) => {
  if (req.body.driverId === 'DIRECT' || req.body.driverId === '') {
    req.body.driverId = null;
  }

  // Duplicate check: sirf same MongoDB _id wali entry block karo
  // Same values wali 2 alag entries ALLOWED hain — genuinely 2 baar sale ho sakti hai
  if (req.body.id && /^[a-f\d]{24}$/i.test(String(req.body.id))) {
    const existing = await SaleLedger.findById(req.body.id);
    if (existing) {
      return ApiResponse.ok(existing, 'Entry already exists').send(res);
    }
  }

  const entry = await SaleLedger.create({ ...req.body, createdBy: req.user._id });
  return ApiResponse.created(entry, 'Sale ledger entry added').send(res);
});

/**
 * POST /api/ledger/sale/bulk
 */
const bulkCreateSaleLedger = asyncHandler(async (req, res) => {
  const { date, entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw ApiError.badRequest('Entries array required');
  }
  const incomingIds = entries.filter(e => e.id).map(e => e.id);
  if (incomingIds.length > 0) {
    await SaleLedger.deleteMany({ date, isManual: false });
  }
  const created = await SaleLedger.insertMany(
    entries.map(e => ({ ...e, date: date || e.date, createdBy: req.user._id }))
  );
  return ApiResponse.created(created, `${created.length} sale entries saved`).send(res);
});

/**
 * PUT /api/ledger/sale/:id
 */
const updateSaleLedgerEntry = asyncHandler(async (req, res) => {
  if (req.body.driverId === 'DIRECT' || req.body.driverId === '') {
    req.body.driverId = null;
  }
  const entry = await SaleLedger.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!entry) throw ApiError.notFound('Sale ledger entry not found');
  return ApiResponse.ok(entry, 'Entry updated').send(res);
});

/**
 * DELETE /api/ledger/sale/:id
 */
const deleteSaleLedgerEntry = asyncHandler(async (req, res) => {
  const entry = await SaleLedger.findByIdAndDelete(req.params.id);
  if (!entry) throw ApiError.notFound('Sale ledger entry not found');
  if (entry.milkRecordId) {
    await MilkRecord.findByIdAndDelete(entry.milkRecordId);
  }
  return ApiResponse.ok({ id: req.params.id }, 'Entry deleted').send(res);
});

/**
 * GET /api/ledger/sale/summary
 * Net = gross minus spoiled
 */
const getSaleSummary = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const [todayResult, monthResult] = await Promise.all([
    SaleLedger.aggregate([
      { $match: { date: today } },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$spoiledAmount', 0] }] } },
          liters: { $sum: { $subtract: ['$milkLiter', { $ifNull: ['$spoiledLiters', 0] }] } },
          count: { $sum: 1 },
        },
      },
    ]),
    SaleLedger.aggregate([
      { $match: { date: { $gte: firstOfMonth } } },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$spoiledAmount', 0] }] } },
          liters: { $sum: { $subtract: ['$milkLiter', { $ifNull: ['$spoiledLiters', 0] }] } },
        },
      },
    ]),
  ]);

  return ApiResponse.ok({
    today: todayResult[0] || { total: 0, liters: 0, count: 0 },
    thisMonth: monthResult[0] || { total: 0, liters: 0 },
  }).send(res);
});

// ─── SUPPLIER PROFILES ───────────────────────────────────────────────────────

/**
 * GET /api/ledger/suppliers
 * Frontend: cheema_saved_suppliers localStorage
 */
const getSupplierProfiles = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    filter.supplierName = new RegExp(req.query.search, 'i');
  }
  const profiles = await SupplierProfile.find(filter)
    .populate('driverId', 'fullName username')
    .sort({ supplierName: 1 });
  return ApiResponse.ok(profiles).send(res);
});

const createSupplierProfile = asyncHandler(async (req, res) => {
  if (req.body.driverId === 'DIRECT' || req.body.driverId === '') {
    req.body.driverId = null;
  }
  // Duplicate name check
  const exists = await SupplierProfile.findOne({
    supplierName: { $regex: new RegExp(`^${req.body.supplierName}$`, 'i') }
  });
  if (exists) {
    // Return existing instead of error - same behavior as localStorage
    return ApiResponse.ok(exists, 'Supplier already exists').send(res);
  }
  const profile = await SupplierProfile.create(req.body);
  return ApiResponse.created(profile, 'Supplier profile created').send(res);
});

const updateSupplierProfile = asyncHandler(async (req, res) => {
  if (req.body.driverId === 'DIRECT' || req.body.driverId === '') {
    req.body.driverId = null;
  }
  const profile = await SupplierProfile.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!profile) throw ApiError.notFound('Supplier profile not found');
  return ApiResponse.ok(profile, 'Supplier updated').send(res);
});

const deleteSupplierProfile = asyncHandler(async (req, res) => {
  const profile = await SupplierProfile.findByIdAndDelete(req.params.id);
  if (!profile) throw ApiError.notFound('Supplier profile not found');
  return ApiResponse.ok({ id: req.params.id }, 'Supplier deleted').send(res);
});

// ─── CUSTOMER PROFILES ───────────────────────────────────────────────────────

/**
 * GET /api/ledger/customers
 * Frontend: cheema_saved_customers localStorage
 */
const getCustomerProfiles = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    filter.customerName = new RegExp(req.query.search, 'i');
  }
  const profiles = await CustomerProfile.find(filter)
    .populate('driverId', 'fullName username')
    .sort({ customerName: 1 });
  return ApiResponse.ok(profiles).send(res);
});

const createCustomerProfile = asyncHandler(async (req, res) => {
  if (req.body.driverId === 'DIRECT' || req.body.driverId === '') {
    req.body.driverId = null;
  }
  const exists = await CustomerProfile.findOne({
    customerName: { $regex: new RegExp(`^${req.body.customerName}$`, 'i') }
  });
  if (exists) {
    return ApiResponse.ok(exists, 'Customer already exists').send(res);
  }
  const profile = await CustomerProfile.create(req.body);
  return ApiResponse.created(profile, 'Customer profile created').send(res);
});

const updateCustomerProfile = asyncHandler(async (req, res) => {
  if (req.body.driverId === 'DIRECT' || req.body.driverId === '') {
    req.body.driverId = null;
  }
  const profile = await CustomerProfile.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!profile) throw ApiError.notFound('Customer profile not found');
  return ApiResponse.ok(profile, 'Customer updated').send(res);
});

const deleteCustomerProfile = asyncHandler(async (req, res) => {
  const profile = await CustomerProfile.findByIdAndDelete(req.params.id);
  if (!profile) throw ApiError.notFound('Customer profile not found');
  return ApiResponse.ok({ id: req.params.id }, 'Customer deleted').send(res);
});

// ─── RUNNING BALANCE CALCULATION ─────────────────────────────────────────────

/**
 * GET /api/ledger/purchase/balance/:supplierProfileId
 * Frontend ke running balance engine ka backend version
 * Formula: runningBalance = openingBalance + totalMilk - totalAdvance - totalPayment + totalDiscount - spoiledAmount
 */
const getSupplierRunningBalance = asyncHandler(async (req, res) => {
  const supplier = await SupplierProfile.findById(req.params.supplierProfileId);
  if (!supplier) throw ApiError.notFound('Supplier not found');

  const entries = await PurchaseLedger.find({ supplierProfileId: req.params.supplierProfileId })
    .sort({ date: 1, createdAt: 1 });

  let runningBalance = supplier.openingBalance || 0;
  const ledgerWithBalance = entries.map(entry => {
    const e = entry.toObject();
    runningBalance = runningBalance + e.totalAmount - e.advanceAmount - e.paymentReceived;
    if (e.discountAmount) runningBalance -= e.discountAmount;
    if (e.isSpoiled && e.spoiledAmount) runningBalance -= e.spoiledAmount;
    return { ...e, runningBalance };
  });

  return ApiResponse.ok({
    supplier,
    entries: ledgerWithBalance,
    finalBalance: runningBalance,
  }).send(res);
});

/**
 * GET /api/ledger/sale/balance/:customerProfileId
 */
const getCustomerRunningBalance = asyncHandler(async (req, res) => {
  const customer = await CustomerProfile.findById(req.params.customerProfileId);
  if (!customer) throw ApiError.notFound('Customer not found');

  const entries = await SaleLedger.find({ customerProfileId: req.params.customerProfileId })
    .sort({ date: 1, createdAt: 1 });

  let runningBalance = customer.openingBalance || 0;
  const ledgerWithBalance = entries.map(entry => {
    const e = entry.toObject();
    // Sale ledger: balance increases by sale, decreases by payment received
    runningBalance = runningBalance + e.totalAmount - e.paymentReceived - e.advanceAmount;
    if (e.discountAmount) runningBalance -= e.discountAmount;
    return { ...e, runningBalance };
  });

  return ApiResponse.ok({
    customer,
    entries: ledgerWithBalance,
    finalBalance: runningBalance,
  }).send(res);
});

// ─── RESET ALL DATA ──────────────────────────────────────────────────────────

/**
 * POST /api/ledger/reset-all
 * Frontend: window.resetAllEntries() ka backend equivalent
 * Admin only - sab operational data clear karo
 */
const resetAllData = asyncHandler(async (req, res) => {
  const MilkRecord = require('../models/MilkRecord');
  const Dispatch = require('../models/Dispatch');
  const AccountRecord = require('../models/AccountRecord');
  const AdvanceTransaction = require('../models/AdvanceTransaction');
  const RouteCollection = require('../models/RouteCollection');
  const LabReport = require('../models/LabReport');

  await Promise.all([
    MilkRecord.deleteMany({}),
    Dispatch.deleteMany({}),
    AccountRecord.deleteMany({}),
    AdvanceTransaction.deleteMany({}),
    RouteCollection.deleteMany({}),
    LabReport.deleteMany({}),
    PurchaseLedger.deleteMany({}),
    SaleLedger.deleteMany({}),
  ]);

  // Reset opening balances on all profiles
  await Promise.all([
    SupplierProfile.updateMany({}, { $set: { openingBalance: 0 } }),
    CustomerProfile.updateMany({}, { $set: { openingBalance: 0 } }),
  ]);

  return ApiResponse.ok(null, 'All operational data has been reset').send(res);
});

module.exports = {
  // Purchase Ledger
  getPurchaseLedger, getPurchaseLedgerBySupplier,
  createPurchaseLedgerEntry, bulkCreatePurchaseLedger,
  updatePurchaseLedgerEntry, deletePurchaseLedgerEntry,
  getPurchaseSummary, getSupplierRunningBalance,
  // Sale Ledger
  getSaleLedger, getSaleLedgerByCustomer,
  createSaleLedgerEntry, bulkCreateSaleLedger,
  updateSaleLedgerEntry, deleteSaleLedgerEntry,
  getSaleSummary, getCustomerRunningBalance,
  // Supplier Profiles
  getSupplierProfiles, createSupplierProfile, updateSupplierProfile, deleteSupplierProfile,
  // Customer Profiles
  getCustomerProfiles, createCustomerProfile, updateCustomerProfile, deleteCustomerProfile,
  // Reset
  resetAllData,
};
