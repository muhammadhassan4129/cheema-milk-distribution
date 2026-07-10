/**
 * Database Seed Script
 * Run: node src/utils/seed.js
 * Ye script sirf ek Admin user create karega
 * Baaki sab cheez Admin panel se add ki jaegi
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected for seeding...');
};

const seedAdmin = async () => {
  // Pehle check karo ke admin pehle se hai ya nahi
  const existingAdmin = await User.findOne({ username: 'admin' });
  if (existingAdmin) {
    console.log('✓ Admin user already exists, skipping...');
    return;
  }

  const hashedPassword = await bcrypt.hash('password', 12);

  const admin = {
    fullName: 'System Admin',
    username: 'admin',
    password: hashedPassword,
    phone: '0000000000',
    role: 'Admin',
    status: 'Active',
  };

  await User.create(admin);
  console.log('✓ Admin user created successfully');
  console.log('  Username: admin');
  console.log('  Password: password');
};

const runSeed = async () => {
  try {
    await connectDB();
    await seedAdmin();
    console.log('\n✅ Seed completed!');
    console.log('Login: username=admin  password=password');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

runSeed();
