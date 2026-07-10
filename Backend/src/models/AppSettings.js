const mongoose = require('mongoose');

/**
 * App Settings Model
 * Frontend: localStorage 'dairy_fixed_purchase_rate', 'dairy_fixed_sales_rate' ke barabar
 * Aur koi bhi global settings jo persist honi chahiye
 */
const appSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppSettings', appSettingsSchema);
