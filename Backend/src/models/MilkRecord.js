const mongoose = require('mongoose');

/**
 * Milk Record Model (Purchase & Sale)
 * Frontend: MilkTransactionContext.tsx ke MilkRecord interface ke barabar
 * type: 'Purchase' = kharida | 'Sale' = becha
 */
const milkRecordSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    type: {
      type: String,
      enum: ['Purchase', 'Sale'],
      required: [true, 'Type (Purchase/Sale) is required'],
    },
    partyName: {
      type: String,
      required: [true, 'Party name is required'],
      trim: true,
    },
    vol: {
      type: Number,
      required: [true, 'Volume (liters) is required'],
      min: 0,
    },
    fat: { type: Number, default: 0 },
    lr: { type: Number, default: 0 },
    snf: { type: Number, default: 0 },
    tsr: { type: Number, default: 0 },
    totalTs: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    pricePerLiter: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    soldUnit: {
      type: String,
      enum: ['L', 'Kg', null],
      default: null,
    },
    soldQtyKg: { type: Number, default: null },
    advance: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    routeName: { type: String, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MilkRecord', milkRecordSchema);
