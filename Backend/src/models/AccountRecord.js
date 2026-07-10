const mongoose = require('mongoose');

/**
 * Account Record Model
 * Frontend: AccountContext.tsx ke AccountRecord interface ke barabar
 * Expenses, income, driver advances sab yahan record hote hain
 */
const accountRecordSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Type is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    method: {
      type: String,
      default: 'Cash',
    },
    payer: {
      type: String,
      default: '',
    },
    payee: {
      type: String,
      default: '',
    },
    note: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    time: {
      type: String,
      default: '',
    },
    user: {
      type: String,
      default: '',
    },
    liters: {
      type: Number,
      default: null,
    },
    vehicleNumber: {
      type: String,
      default: '',
    },
    driverDetails: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AccountRecord', accountRecordSchema);
