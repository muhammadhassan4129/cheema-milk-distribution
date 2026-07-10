/**
 * Cleanup Script
 * Run: node src/utils/cleanup.js
 * 
 * Ye script non-admin users, seed routes aur seed vehicles delete karega.
 * Sirf admin login rehga, baaki sab Admin panel se add karo.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Route = require('../models/Route');
const Vehicle = require('../models/Vehicle');
const MilkRecord = require('../models/MilkRecord');
const Dispatch = require('../models/Dispatch');
const AdvanceTransaction = require('../models/AdvanceTransaction');
const AccountRecord = require('../models/AccountRecord');
const LabReport = require('../models/LabReport');
const RouteCollection = require('../models/RouteCollection');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected...');
};

const cleanup = async () => {
  // Non-admin users delete karo
  const deletedUsers = await User.deleteMany({ role: { $ne: 'Admin' } });
  console.log(`✓ ${deletedUsers.deletedCount} non-admin users deleted`);

  // Sab routes delete karo (admin phir se add karega)
  const deletedRoutes = await Route.deleteMany({});
  console.log(`✓ ${deletedRoutes.deletedCount} routes deleted`);

  // Sab vehicles delete karo (admin phir se add karega)
  const deletedVehicles = await Vehicle.deleteMany({});
  console.log(`✓ ${deletedVehicles.deletedCount} vehicles deleted`);

  // Sab operational data delete karo (fake demo data)
  const deletedMilk = await MilkRecord.deleteMany({});
  console.log(`✓ ${deletedMilk.deletedCount} milk records deleted`);

  const deletedDispatches = await Dispatch.deleteMany({});
  console.log(`✓ ${deletedDispatches.deletedCount} dispatches deleted`);

  const deletedAdvances = await AdvanceTransaction.deleteMany({});
  console.log(`✓ ${deletedAdvances.deletedCount} advance transactions deleted`);

  const deletedAccounts = await AccountRecord.deleteMany({});
  console.log(`✓ ${deletedAccounts.deletedCount} account records deleted`);

  const deletedLab = await LabReport.deleteMany({});
  console.log(`✓ ${deletedLab.deletedCount} lab reports deleted`);

  const deletedCollections = await RouteCollection.deleteMany({});
  console.log(`✓ ${deletedCollections.deletedCount} route collections deleted`);

  console.log('\n✅ Cleanup complete!');
  console.log('Database mein sirf Admin user reh gaya hai.');
  console.log('Login: username=admin  password=password');
};

const run = async () => {
  try {
    await connectDB();
    await cleanup();
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  }
};

run();
