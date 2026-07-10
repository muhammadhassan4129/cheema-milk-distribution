/**
 * Yeh script:
 * 1. Fresh MilkTester banata hai
 * 2. Turant login test karta hai
 * 3. Result clearly dikhata hai
 * 
 * Run: node src/scripts/createAndTest.js <username> <password>
 * Example: node src/scripts/createAndTest.js ali ali12345
 */
require('dotenv').config();
const mongoose = require('mongoose');

const username = process.argv[2] || 'newmt';
const password = process.argv[3] || 'pass1234';
const fullName = process.argv[4] || 'New Milk Tester';

async function main() {
  console.log('===========================================');
  console.log('  Creating MilkTester:', username, '/', password);
  console.log('===========================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');

  // Agar already exist kare toh delete karo
  await User.deleteOne({ username: username.toLowerCase() });

  // Naya user banao
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    password,
    role: 'MilkTester',
    status: 'Active',
    phone: '03001234567',
    cnic: '',
    openingBalance: 0,
  });
  console.log('✅ User created in DB');
  console.log('   ID:', user._id);
  console.log('   Username:', user.username);
  console.log('   Role:', user.role);

  // Password verify
  const dbUser = await User.findOne({ username: username.toLowerCase() }).select('+password');
  const match = await dbUser.comparePassword(password);
  console.log('\n✅ Password verify:', match ? 'MATCH' : 'NO MATCH');

  await mongoose.disconnect();

  console.log('\n===========================================');
  console.log('  NOW TRY LOGIN IN BROWSER:');
  console.log('  URL:      http://localhost:3000');
  console.log('  Username: ' + username.toLowerCase());
  console.log('  Password: ' + password);
  console.log('  Role:     Milk Tester');
  console.log('===========================================');
}

main().catch(e => console.error('Error:', e.message));
