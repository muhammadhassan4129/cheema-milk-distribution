/**
 * Complete E2E Test — exactly simulates browser frontend behavior
 * Tests: Create user → Login → Routes fetch
 */
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

const BASE = 'localhost';
const PORT = 5000;

function api(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { hostname: BASE, port: PORT, path: '/api' + path, method, headers };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', e => resolve({ status: 0, data: { message: e.message } }));
    if (data) req.write(data);
    req.end();
  });
}

function pass(msg) { console.log('  ✅', msg); }
function fail(msg) { console.log('  ❌', msg); }
function info(msg) { console.log('  ℹ️ ', msg); }

async function main() {
  console.log('\n════════════════════════════════════════════');
  console.log('   FULL E2E TEST — Milk Distribution System ');
  console.log('════════════════════════════════════════════\n');

  // ─── STEP 1: Admin Login ────────────────────────────────
  console.log('STEP 1: Admin Login');
  const adminLogin = await api('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  if (!adminLogin.data.success) {
    fail('Admin login failed: ' + adminLogin.data.message);
    process.exit(1);
  }
  const adminToken = adminLogin.data.data.token;
  pass('Admin login OK — token received');

  // ─── STEP 2: Create Fresh MilkTester ───────────────────
  console.log('\nSTEP 2: Create MilkTester from Admin Panel');
  const testUsername = 'freshmt_' + Date.now().toString().slice(-4);
  const testPassword = 'Fresh@1234';

  const createRes = await api('POST', '/users', {
    fullName: 'Fresh Milk Tester',
    username: testUsername,
    password: testPassword,
    phone: '03001234567',
    role: 'MilkTester',
    status: 'Active'
  }, adminToken);

  info('HTTP Status: ' + createRes.status);
  if (!createRes.data.success) {
    fail('User creation failed: ' + createRes.data.message);
    process.exit(1);
  }
  const createdUserId = createRes.data.data._id;
  pass('MilkTester created — ID: ' + createdUserId);
  pass('Username: ' + testUsername + ' | Password: ' + testPassword);

  // ─── STEP 3: Verify in DB ───────────────────────────────
  console.log('\nSTEP 3: DB Verification');
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');
  const dbUser = await User.findById(createdUserId).select('+password');
  if (!dbUser) {
    fail('User NOT found in database!');
    await mongoose.disconnect();
    process.exit(1);
  }
  pass('User found in DB: ' + dbUser.username);

  const pwMatch = await dbUser.comparePassword(testPassword);
  if (!pwMatch) {
    fail('Password mismatch in DB! Hash: ' + dbUser.password.slice(0, 20) + '...');
    await mongoose.disconnect();
    process.exit(1);
  }
  pass('Password hash verified in DB');
  await mongoose.disconnect();

  // ─── STEP 4: MilkTester Login ───────────────────────────
  console.log('\nSTEP 4: MilkTester Login (exact frontend behavior)');
  const mtLogin = await api('POST', '/auth/login', { username: testUsername, password: testPassword });
  info('HTTP Status: ' + mtLogin.status);
  info('Response: ' + JSON.stringify(mtLogin.data).slice(0, 200));

  if (!mtLogin.data.success) {
    fail('MilkTester LOGIN FAILED: ' + mtLogin.data.message);

    // Extra diagnosis
    console.log('\n  === EXTRA DIAGNOSIS ===');
    await mongoose.connect(process.env.MONGO_URI);
    const u = await User.findOne({ username: testUsername }).select('+password');
    if (u) {
      console.log('  DB username:', u.username);
      console.log('  DB password hash:', u.password);
      console.log('  Testing various passwords...');
      for (const pw of [testPassword, 'Fresh@1234', testPassword.toLowerCase(), testPassword.toUpperCase()]) {
        const m = await u.comparePassword(pw);
        if (m) console.log('  MATCH FOUND with:', pw);
      }
    }
    await mongoose.disconnect();
    process.exit(1);
  }

  const mtToken = mtLogin.data.data.token;
  const mtUser  = mtLogin.data.data.user;
  pass('MilkTester LOGIN OK!');
  pass('Role: ' + mtUser.role);

  // ─── STEP 5: Create Route & Assign ────────────────────
  console.log('\nSTEP 5: Create Route and Assign to MilkTester');
  const routeRes = await api('POST', '/routes', {
    name: 'Test Route E2E',
    tankerNumber: 'TNK-E2E',
    mtName: 'Fresh Milk Tester',
    stops: [{ name: 'Customer A' }, { name: 'Customer B' }, { name: 'Customer C' }],
    assignedMilkTesterIds: [createdUserId],
  }, adminToken);

  if (!routeRes.data.success) {
    fail('Route creation failed: ' + routeRes.data.message);
    process.exit(1);
  }
  const routeId = routeRes.data.data._id;
  pass('Route created — ID: ' + routeId);

  // Assign (extra confirm)
  const assignRes = await api('PATCH', '/routes/' + routeId + '/assign-testers',
    { assignedMilkTesterIds: [createdUserId] }, adminToken);
  if (assignRes.data.success) pass('Route assigned to MilkTester');
  else fail('Route assign failed: ' + assignRes.data.message);

  // ─── STEP 6: MilkTester Fetch My Routes ───────────────
  console.log('\nSTEP 6: MilkTester fetches assigned routes');
  const myRoutesRes = await api('GET', '/routes/my-routes', null, mtToken);
  info('HTTP Status: ' + myRoutesRes.status);

  if (!myRoutesRes.data.success) {
    fail('getMyRoutes failed: ' + myRoutesRes.data.message);
    process.exit(1);
  }

  const myRoutes = myRoutesRes.data.data;
  if (myRoutes.length === 0) {
    fail('No routes returned for MilkTester! Assignment not working.');
    process.exit(1);
  }

  pass('Routes fetched: ' + myRoutes.length + ' route(s)');
  myRoutes.forEach(r => {
    pass('  Route: "' + r.name + '" | Customers: ' + r.stops.length);
  });

  // ─── FINAL SUMMARY ─────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log('   ALL TESTS PASSED ✅');
  console.log('════════════════════════════════════════════');
  console.log('\n  Use these credentials in browser:');
  console.log('  URL:      http://localhost:3000');
  console.log('  Username: ' + testUsername);
  console.log('  Password: ' + testPassword);
  console.log('  Role:     Milk Tester');
  console.log('\n  Admin: admin / admin123');
  console.log('════════════════════════════════════════════\n');
}

main().catch(e => { console.error('\nScript Error:', e.message); process.exit(1); });
