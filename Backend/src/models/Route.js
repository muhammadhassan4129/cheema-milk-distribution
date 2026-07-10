const mongoose = require('mongoose');

/**
 * Route Model
 * Frontend: RouteContext.tsx + types/index.ts ke Route interface ke barabar
 */
const routeStopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }
);

const routeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
    },
    stops: [routeStopSchema],
    length: {
      type: String,
      default: '',
    },
    travelTime: {
      type: String,
      default: '',
    },
    cost: {
      type: Number,
      default: 0,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
    tankerNumber: {
      type: String,
      default: '',
    },
    mtName: {
      type: String,
      default: '',
    },
    // Assigned milk testers (Driver role users) - admin jo milk testers assign kare
    assignedMilkTesterIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Route', routeSchema);
