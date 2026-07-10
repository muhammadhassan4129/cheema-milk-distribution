require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('../models/User');

  // Purane test users clean karo
  await User.deleteMany({ username: { $in: ['ahmad', 'raza', 'milktester1', 'testtester'] } });
  console.log('Old test users removed');

  // Admin ensure karo
  let admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    await User.create({
      fullName: 'System Admin',
      username: 'admin',
      password: 'admin123',
      role: 'Admin',
      status: 'Active',
      phone: '03000000000',
      cnic: '',
      openingBalance: 0,
    });
    console.log('Admin created: admin / admin123');
  } else {
    admin.password = 'admin123';
    await admin.save();
    console.log('Admin password confirmed: admin / admin123');
  }

  // waqas ka password reset
  const waqas = await User.findOne({ username: 'waqas' });
  if (waqas) {
    waqas.password = 'waqas123';
    await waqas.save();
    console.log('waqas password reset to: waqas123');
  }

  // Fresh MilkTester banao simple credentials se
  const existing = await User.findOne({ username: 'mt1' });
  if (!existing) {
    await User.create({
      fullName: 'Milk Tester One',
      username: 'mt1',
      password: 'pass1234',
      role: 'MilkTester',
      status: 'Active',
      phone: '03001234567',
      cnic: '',
      openingBalance: 0,
    });
    console.log('MilkTester created: mt1 / pass1234');
  }

  console.log('\n====== ALL USERS IN DATABASE ======');
  const all = await User.find({}, 'username fullName role status');
  all.forEach(u => {
    console.log(`  ${u.username.padEnd(15)} | ${u.role.padEnd(12)} | ${u.status}`);
  });

  mongoose.disconnect();
  console.log('\nDone!');
}).catch(e => console.error('Error:', e.message));
