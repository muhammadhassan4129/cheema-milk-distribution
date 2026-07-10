const mongoose = require('mongoose');

/**
 * Supplier Profile Model
 * Frontend: PurchaseLedger.tsx ke SupplierProfile interface ke barabar
 * cheema_saved_suppliers localStorage key ka data
 */
const supplierProfileSchema = new mongoose.Schema(
  {
    supplierName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, default: '' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    driverName: { type: String, default: 'Direct' },
    location: { type: String, default: '' },
    openingBalance: { type: Number, default: 0 },
    cnicNumber: { type: String, default: '' },
    areaLocation: { type: String, default: '' },
    transportRelation: {
      type: String,
      enum: ['Direct Self', 'Empty Driver', null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupplierProfile', supplierProfileSchema);
