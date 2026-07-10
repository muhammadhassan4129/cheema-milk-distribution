const mongoose = require('mongoose');

/**
 * Lab Report Model
 * Frontend: LabContext.tsx ke LabReportRecord interface ke barabar
 * Milk quality testing records
 */
const labReportSchema = new mongoose.Schema(
  {
    batchNo: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
    },
    technician: {
      type: String,
      required: [true, 'Technician name is required'],
      trim: true,
    },
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 0,
    },
    fat: { type: Number, default: 0 },
    snf: { type: Number, default: 0 },
    lr: { type: Number, default: 0 },
    ts: { type: Number, default: 0 },
    totalTs: { type: Number, default: 0 },
    pricePerLiter: { type: Number, default: 0 },
    totalPayable: { type: Number, default: 0 },
    result: {
      type: String,
      default: 'Pending',
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    time: {
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

module.exports = mongoose.model('LabReport', labReportSchema);
