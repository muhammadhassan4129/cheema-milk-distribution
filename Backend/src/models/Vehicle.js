const mongoose = require('mongoose');

/**
 * Vehicle Model
 * Frontend: VehicleContext.tsx ke Vehicle interface ke barabar
 */
const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    driverPhone: {
      type: String,
      default: '',
    },
    driverName: {
      type: String,
      default: '',
    },
    imei: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Available', 'On Route', 'Maintenance', 'Inactive'],
      default: 'Available',
    },
    routeInfo: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
