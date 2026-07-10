const mongoose = require('mongoose');

/**
 * Customer Profile Model
 * Frontend: SaleLedger.tsx ke CustomerProfile interface ke barabar
 * cheema_saved_customers localStorage key ka data
 */
const customerProfileSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, default: '' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    driverName: { type: String, default: 'Direct' },
    location: { type: String, default: '' },
    openingBalance: { type: Number, default: 0 },
    whatsappName: { type: String, default: '' },
    cnicNumber: { type: String, default: '' },
    deliveryType: {
      type: String,
      enum: ['Direct Self', 'Driver Delivery', 'Other', null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);
