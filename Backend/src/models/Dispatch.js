const mongoose = require('mongoose');

/**
 * Dispatch Model
 * Frontend: DispatchContext.tsx ke DispatchRecord interface ke barabar
 * Milk dispatch ka full record - vehicle, driver, destination, status
 */

// Route collection entry (driver ke route par har ghar ka data)
const routeCollectionEntrySchema = new mongoose.Schema(
  {
    customerName: { type: String, default: '' },
    time: { type: String, default: '' },
    milkKg: { type: Number, default: 0 },
    milkLiter: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    lr: { type: Number, default: 0 },
    temp: { type: Number, default: 0 },
    snf: { type: Number, default: 0 },
    ts: { type: Number, default: 0 },
    totalTs: { type: Number, default: 0 },
  },
  { _id: true }
);

// Destination par delivery entry
const destinationEntrySchema = new mongoose.Schema(
  {
    addedBy: { type: String, default: '' },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    liters: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    lr: { type: Number, default: 0 },
    otherElements: { type: String, default: '' },
    remarks: { type: String, default: '' },
  },
  { _id: true }
);

const dispatchSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    time: {
      type: String,
      default: '',
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    driverName: {
      type: String,
      required: [true, 'Driver name is required'],
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    driverPhone: { type: String, default: '' },
    roadName: { type: String, default: '' },
    trunkName: { type: String, default: '' },
    liters: {
      type: Number,
      required: [true, 'Liters is required'],
      min: 0,
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'On Route', 'Completed', 'Returned', 'Received'],
      default: 'Pending',
    },
    remarks: { type: String, default: '' },
    driverSign: { type: String, default: '' },
    kg: { type: Number, default: null },
    fat: { type: Number, default: null },
    lr: { type: Number, default: null },
    ts: { type: Number, default: null },
    price: { type: Number, default: null },
    transportType: { type: String, default: '' },
    kilometers: { type: Number, default: null },
    otherElements: { type: String, default: '' },
    isSold: { type: Boolean, default: false },
    soldDate: { type: String, default: null },
    destinationEntries: [destinationEntrySchema],
    entries: [routeCollectionEntrySchema],
    receivedEntries: [routeCollectionEntrySchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Dispatch', dispatchSchema);
