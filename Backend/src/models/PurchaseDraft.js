const mongoose = require('mongoose');

/**
 * PurchaseDraft Model
 * Holds temporary modal input drafts for Purchase Ledgers
 */
const purchaseDraftSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    supplierId: {
      type: String,
      required: true,
    },
    draftData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so that each user has at most one draft per date + supplier combination
purchaseDraftSchema.index({ user: 1, date: 1, supplierId: 1 }, { unique: true });

module.exports = mongoose.model('PurchaseDraft', purchaseDraftSchema);
