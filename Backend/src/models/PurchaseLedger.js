const mongoose = require('mongoose');

/**
 * Purchase Ledger Entry Model
 * Frontend: localStorage 'cheema_purchase_ledger_YYYY-MM-DD' ke barabar
 * PurchaseLedger.tsx ke PurchaseEntry interface se match karta hai
 */
const purchaseLedgerSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    time: { type: String, default: '' },
    supplierProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplierProfile', default: null },
    supplierName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, default: '' },
    milkUnit: { type: String, enum: ['Liters', 'Kg', null], default: null },
    milkLiter: { type: Number, default: 0 },
    fat: { type: Number, default: null },
    lr: { type: Number, default: null },
    snf: { type: Number, default: null },
    totalTs: { type: Number, default: null },
    rate: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    paymentReceived: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    isManual: { type: Boolean, default: false },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    driverName: { type: String, default: '' },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    routeName: { type: String, default: '' },
    milkRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MilkRecord', default: null },
    // Payment fields
    paymentType: { type: String, default: '' },   // Cash, Bank Transfer, JazzCash, EasyPaisa
    bankName: { type: String, default: '' },        // Meezan, HBL, UBL, Alfalah
    discountAmount: { type: Number, default: 0 },
    // Spoiled milk
    isSpoiled: { type: Boolean, default: false },
    spoiledAmount: { type: Number, default: 0 },
    spoiledLiters: { type: Number, default: 0 },
    spoiledRate: { type: Number, default: 0 },
    spoiledFat: { type: Number, default: null },
    spoiledLr: { type: Number, default: null },
    spoiledSnf: { type: Number, default: null },
    spoiledTs: { type: Number, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Index for fast date-based queries
purchaseLedgerSchema.index({ date: 1, supplierProfileId: 1 });

module.exports = mongoose.model('PurchaseLedger', purchaseLedgerSchema);
