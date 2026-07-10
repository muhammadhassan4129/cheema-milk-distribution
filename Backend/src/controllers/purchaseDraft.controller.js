const PurchaseDraft = require('../models/PurchaseDraft');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/ledger/purchase-drafts/:date
 * @desc    Get all purchase drafts for a specific date for the logged-in user
 * @access  Protected (Admin, Accountant)
 */
const getDraftsForDate = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const userId = req.user._id;

  const drafts = await PurchaseDraft.find({ user: userId, date });
  return ApiResponse.ok(drafts, 'Drafts fetched').send(res);
});

/**
 * @route   GET /api/ledger/purchase-drafts/:date/:supplierId
 * @desc    Get purchase draft for a specific date and supplier for the logged-in user
 * @access  Protected (Admin, Accountant)
 */
const getDraft = asyncHandler(async (req, res) => {
  const { date, supplierId } = req.params;
  const userId = req.user._id;

  const draft = await PurchaseDraft.findOne({ user: userId, date, supplierId });
  if (!draft) {
    return ApiResponse.ok(null, 'No draft found').send(res);
  }

  return ApiResponse.ok(draft, 'Draft fetched').send(res);
});

/**
 * @route   POST /api/ledger/purchase-drafts
 * @desc    Save/update purchase draft
 * @access  Protected (Admin, Accountant)
 */
const saveDraft = asyncHandler(async (req, res) => {
  const { date, supplierId, draftData } = req.body;
  const userId = req.user._id;

  if (!date || !supplierId) {
    throw ApiError.badRequest('date and supplierId are required');
  }

  const draft = await PurchaseDraft.findOneAndUpdate(
    { user: userId, date, supplierId },
    { draftData },
    { new: true, upsert: true, runValidators: true }
  );

  return ApiResponse.ok(draft, 'Draft saved successfully').send(res);
});

/**
 * @route   DELETE /api/ledger/purchase-drafts/:date/:supplierId
 * @desc    Delete purchase draft
 * @access  Protected (Admin, Accountant)
 */
const deleteDraft = asyncHandler(async (req, res) => {
  const { date, supplierId } = req.params;
  const userId = req.user._id;

  const result = await PurchaseDraft.findOneAndDelete({ user: userId, date, supplierId });
  if (!result) {
    return ApiResponse.ok({ deleted: false }, 'No draft to delete').send(res);
  }

  return ApiResponse.ok({ deleted: true }, 'Draft deleted successfully').send(res);
});

module.exports = { getDraftsForDate, getDraft, saveDraft, deleteDraft };
