const AppSettings = require('../models/AppSettings');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/settings
 * Sab settings ya specific key
 * Frontend: dairy_fixed_purchase_rate, dairy_fixed_sales_rate, dairy_has_been_reset
 */
const getSettings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.key) filter.key = req.query.key;
  const settings = await AppSettings.find(filter);
  // Object format mein return karo - frontend ke liye easy
  const result = {};
  settings.forEach(s => { result[s.key] = s.value; });
  return ApiResponse.ok(result).send(res);
});

/**
 * GET /api/settings/:key
 */
const getSetting = asyncHandler(async (req, res) => {
  const setting = await AppSettings.findOne({ key: req.params.key });
  if (!setting) return ApiResponse.ok(null, 'Setting not found').send(res);
  return ApiResponse.ok({ key: setting.key, value: setting.value }).send(res);
});

/**
 * PUT /api/settings/:key
 * Upsert - agar nahi hai to create karo, agar hai to update karo
 * Frontend: localStorage.setItem(key, value) ka equivalent
 */
const upsertSetting = asyncHandler(async (req, res) => {
  const { value, description } = req.body;
  const setting = await AppSettings.findOneAndUpdate(
    { key: req.params.key },
    { value, description, updatedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );
  return ApiResponse.ok(setting, 'Setting saved').send(res);
});

/**
 * POST /api/settings/bulk
 * Multiple settings ek saath save karo
 */
const bulkUpsertSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body; // { key: value, key2: value2 }
  if (!settings || typeof settings !== 'object') {
    throw ApiError.badRequest('Settings object required');
  }

  const ops = Object.entries(settings).map(([key, value]) => ({
    updateOne: {
      filter: { key },
      update: { $set: { key, value, updatedBy: req.user._id } },
      upsert: true,
    }
  }));

  await AppSettings.bulkWrite(ops);
  return ApiResponse.ok(settings, 'Settings saved').send(res);
});

/**
 * DELETE /api/settings/:key
 */
const deleteSetting = asyncHandler(async (req, res) => {
  await AppSettings.findOneAndDelete({ key: req.params.key });
  return ApiResponse.ok({ key: req.params.key }, 'Setting deleted').send(res);
});

module.exports = { getSettings, getSetting, upsertSetting, bulkUpsertSettings, deleteSetting };
