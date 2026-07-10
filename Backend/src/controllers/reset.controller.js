const mongoose = require('mongoose');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const RouteCollection = require('../models/RouteCollection');
const MilkRecord = require('../models/MilkRecord');
const Dispatch = require('../models/Dispatch');
const AdvanceTransaction = require('../models/AdvanceTransaction');
const AccountRecord = require('../models/AccountRecord');
const LabReport = require('../models/LabReport');
const PurchaseLedger = require('../models/PurchaseLedger');
const SaleLedger = require('../models/SaleLedger');
const AppSettings = require('../models/AppSettings');
const CustomerProfile = require('../models/CustomerProfile');
const SupplierProfile = require('../models/SupplierProfile');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/reset
 * Super Admin only — sab data delete karo, sirf Admin users bachao
 * Extra confirmation header required for safety
 */
const resetSystemData = asyncHandler(async (req, res) => {
  // ── Double-safety: must be Admin ──────────────────────────────────────────
  if (req.user.role !== 'Admin') {
    throw ApiError.forbidden('Only Admin can perform a system reset.');
  }

  // ── Confirmation header check ─────────────────────────────────────────────
  const confirmHeader = req.headers['x-reset-confirm'];
  if (confirmHeader !== 'RESET_CONFIRMED') {
    throw ApiError.badRequest(
      'Missing confirmation. Send header: x-reset-confirm: RESET_CONFIRMED'
    );
  }

  // ── Remember the current admin's ID so we never touch it ─────────────────
  const adminId = req.user._id;

  // ── Delete all collections except Admin users ─────────────────────────────
  await Promise.all([
    // Delete all non-Admin users (MilkTester, Accountant, Driver)
    User.deleteMany({ role: { $ne: 'Admin' } }),

    // All business data
    Vehicle.deleteMany({}),
    Route.deleteMany({}),
    RouteCollection.deleteMany({}),
    MilkRecord.deleteMany({}),
    Dispatch.deleteMany({}),
    AdvanceTransaction.deleteMany({}),
    AccountRecord.deleteMany({}),
    LabReport.deleteMany({}),
    PurchaseLedger.deleteMany({}),
    SaleLedger.deleteMany({}),
    CustomerProfile.deleteMany({}),
    SupplierProfile.deleteMany({}),

    // App settings (rates, flags, etc.) — reset to clean slate
    AppSettings.deleteMany({}),
  ]);

  return ApiResponse.ok(
    { resetBy: adminId, resetAt: new Date().toISOString() },
    'System reset complete. All data deleted except Admin accounts.'
  ).send(res);
});

module.exports = { resetSystemData };
