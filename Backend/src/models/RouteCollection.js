const mongoose = require('mongoose');

/**
 * Route Collection Model
 * Frontend: RouteCollectionContext.tsx + types/index.ts ke RouteCollection ke barabar
 * Milk collection ka complete record - har stop ka data
 */

// Ek stop par milk collection ka data
const milkCollectionStopSchema = new mongoose.Schema(
  {
    time: { type: String, default: '' },
    locationName: { type: String, required: true, trim: true },
    milkLiter: { type: Number, default: 0 },
    snf: { type: Number, default: 0 },
    totalSolids: { type: Number, default: 0 },
    ts13: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    lr: { type: Number, default: 0 },
    milkKgs: { type: Number, default: 0 },
    temperature: { type: Number, default: null },
    price: { type: Number, default: null },
    totalPayable: { type: Number, default: null },
    organoTest: { type: String, default: 'Pending' },
    glucoseTest: { type: String, default: 'Pending' },
    starchTest: { type: String, default: 'Pending' },
    aptTest: { type: String, default: 'Pending' },
    abTest: { type: String, default: 'Pending' },
    remarks: { type: String, default: '' },
  },
  { _id: true }
);

// Plant/destination par receiving ka data
const receivingSchema = new mongoose.Schema(
  {
    locationName: { type: String, default: '' },
    time: { type: String, default: '' },
    milkKgs: { type: Number, default: 0 },
    milkLiter: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    lr: { type: Number, default: 0 },
    snf: { type: Number, default: 0 },
    temperature: { type: Number, default: 0 },
  },
  { _id: false }
);

const routeCollectionSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    routeName: {
      type: String,
      required: [true, 'Route name is required'],
    },
    tankerNumber: {
      type: String,
      default: '',
    },
    mtName: {
      type: String,
      default: '',
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    stops: [milkCollectionStopSchema],
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Received', 'Lab Tested'],
      default: 'Draft',
    },
    receiving: receivingSchema,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RouteCollection', routeCollectionSchema);
