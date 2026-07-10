/**
 * Role Migration Script
 * Driver → MilkTester
 * Lab Technician → MilkTester
 *
 * Run: node src/scripts/migrateRoles.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function migrateRoles() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  // Driver → MilkTester
  const driverResult = await users.updateMany(
    { role: 'Driver' },
    { $set: { role: 'MilkTester' } }
  );
  console.log(`✅ Driver → MilkTester: ${driverResult.modifiedCount} users updated`);

  // Lab Technician → MilkTester
  const labResult = await users.updateMany(
    { role: 'Lab Technician' },
    { $set: { role: 'MilkTester' } }
  );
  console.log(`✅ Lab Technician → MilkTester: ${labResult.modifiedCount} users updated`);

  // Verify remaining roles
  const roleCounts = await users.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]).toArray();
  console.log('\n📊 Current role distribution:');
  roleCounts.forEach(r => console.log(`  ${r._id}: ${r.count} users`));

  await mongoose.disconnect();
  console.log('\n✅ Migration complete. Disconnected.');
}

migrateRoles().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
