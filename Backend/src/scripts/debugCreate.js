/**
 * Full debug script:
 * 1. Admin login karo
 * 2. Naya MilkTester create karo (exactly jaise frontend karta hai)
 * 3. Turant us se login karo
 * 4. DB mein check karo
 */
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

function apiCall(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { hostname: 'localhost', port: 5000, path: '/api' + path, method, headers };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', e => resolve({ status: 0, body: { message: e.message } }));
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('  FULL CREATE + LOGIN DEBUG');
  console.log('========================================\n');

  // Step 1: Admin login
  console.log('1. Admin login...');
  const loginRes = await apiCall('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  if (!loginRes.body.success) {
    console.log('   FAIL:', loginRes.body.message);
    console.log('   Admin user nahi hai ya password galat hai');
    process.exit(1);
  }
  const token = loginRes.body.data.token;
  console.log('   OK - Admin logged in\n');

  // Step 2: Naya user banao (exactly jaise frontend bhejta hai)
  const newUser = {
    fullName: 'Test MilkTester',
    username: 'testmt',
    password: 'testmt123',
    phone: '03001234567',
    role: 'MilkTester',
    status: 'Active'
  };
  console.log('2. Creating user:', newUser.username, '/ password:', newUser.password);
  const createRes = await apiCall('POST', '/users', newUser, token);
  console.log('   HTTP Status:', createRes.status);
  console.log('   Response:', JSON.stringify(createRes.body, null, 2));

  if (!createRes.body.success) {
    console.log('\n   ERROR: User create nahi hua!');
    console.log('   Reason:', createRes.body.message);
    process.exit(1);
  }
  console.log('   User created! ID:', createRes.body.data?._id, '\n');

  // Step 3: DB se verify karo
  console.log('3. DB se verify...');
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');
  const dbUser = await User.findOne({ username: 'testmt' }).select('+password');
  if (!dbUser) {
    console.log('   ERROR: DB mein user nahi mila!');
  } else {
    console.log('   DB user found:', dbUser.username, '| role:', dbUser.role);
    const match123 = await dbUser.comparePassword('testmt123');
    console.log('   Password "testmt123" match:', match123);
  }
  await mongoose.disconnect();
  console.log();

  // Step 4: Login karo naye user se
  console.log('4. Naye user se login karo...');
  const login2 = await apiCall('POST', '/auth/login', { username: 'testmt', password: 'testmt123' });
  console.log('   HTTP Status:', login2.status);
  if (login2.body.success) {
    console.log('   LOGIN OK! Role:', login2.body.data?.user?.role);
  } else {
    console.log('   LOGIN FAIL:', login2.body.message);
  }

  console.log('\n========================================');
  console.log('  RESULT:');
  if (login2.body.success) {
    console.log('  Backend bilkul theek hai!');
    console.log('  Username: testmt');
    console.log('  Password: testmt123');
    console.log('  Role: MilkTester');
    console.log('\n  Problem frontend mein hai - neeche dekho');
  } else {
    console.log('  Backend mein bug hai!');
  }
  console.log('========================================');
}

main().catch(e => { console.error('Script error:', e.message); process.exit(1); });
