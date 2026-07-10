const mongoose = require('mongoose');

/**
 * Advance Transaction Model
 * Frontend: AdvanceContext.tsx ke AdvanceTransaction interface ke barabar
 * Types: ADVANCE | EXPENSE | TRIP_INCOME | CASH_RETURN
 */
const advanceTransactionSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver ID is required'],
    },
    driverName: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['ADVANCE', 'EXPENSE', 'TRIP_INCOME', 'CASH_RETURN'],
      required: [true, 'Transaction type is required'],
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    category: {
      type: String,
      enum: [
        'Fuel',
        'Repair',
        'Toll Plaza',
        'Other',
        'Food',
        'Miscellaneous',
        'Trip Income',
        'Advance Received',
        'Cash Return',
        'Office Return',
        null,
      ],
      default: null,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Mobile Wallet', null],
      default: null,
    },
    bankAccount: { type: String, default: '' },
    returnedByName: { type: String, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdvanceTransaction', advanceTransactionSchema);
