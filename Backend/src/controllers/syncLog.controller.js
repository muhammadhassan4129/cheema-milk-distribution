const SyncLog = require('../models/SyncLog');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/sync-logs
 * @desc    Get user's sync logs (sorted by timestamp descending, limit to 200)
 * @access  Protected
 */
const getSyncLogs = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const logs = await SyncLog.find({ user: userId })
    .sort({ timestamp: -1 })
    .limit(200);

  return ApiResponse.ok(logs, 'Sync logs fetched').send(res);
});

/**
 * @route   POST /api/sync-logs
 * @desc    Create a new sync log
 * @access  Protected
 */
const createSyncLog = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { model, context, status, errorMessage, endpoint, retryCount, timestamp } = req.body;

  const log = await SyncLog.create({
    user: userId,
    model,
    context: context || '',
    status,
    errorMessage: errorMessage || null,
    endpoint: endpoint || '',
    retryCount: retryCount || 0,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  });

  return ApiResponse.created(log, 'Sync log added').send(res);
});

module.exports = { getSyncLogs, createSyncLog };
