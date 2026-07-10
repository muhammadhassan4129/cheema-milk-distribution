const mongoose = require('mongoose');

/**
 * SyncLog Model
 * Frontend: offlineSync.ts ke SyncLog interface ke barabar
 */
const syncLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    model: {
      type: String,
      required: true,
    },
    context: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Success', 'Failed'],
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    endpoint: {
      type: String,
      default: '',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SyncLog', syncLogSchema);
