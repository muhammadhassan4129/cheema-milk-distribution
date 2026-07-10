/**
 * Clean stale/orphaned user IDs from route assignedMilkTesterIds
 * Run: node src/scripts/cleanStaleRouteIds.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Get all valid user IDs
  const users = await db.collection('users').find({}, { projection: { _id: 1, username: 1, role: 1 } }).toArray();
  const validIds = new Set(users.map(u => u._id.toString()));
  console.log('Valid user IDs:', [...validIds]);

  const routes = await db.collection('routes').find({}).toArray();
  console.log('\nProcessing', routes.length, 'routes...');

  for (const route of routes) {
    const original = (route.assignedMilkTesterIds || []).map(id => id.toString());
    const cleaned = original.filter(id => validIds.has(id));

    if (original.length !== cleaned.length) {
      const removedCount = original.length - cleaned.length;
      console.log(`  Route "${route.name}": removed ${removedCount} stale ID(s)`);
      await db.collection('routes').updateOne(
        { _id: route._id },
        { $set: { assignedMilkTesterIds: cleaned.map(id => new mongoose.Types.ObjectId(id)) } }
      );
    } else {
      console.log(`  Route "${route.name}": OK (${original.length} testers)`);
    }
  }

  // Show final state
  console.log('\nFinal route assignments:');
  const updated = await db.collection('routes').find({}).toArray();
  updated.forEach(r => {
    const ids = (r.assignedMilkTesterIds || []).map(id => id.toString());
    const names = ids.map(id => users.find(u => u._id.toString() === id)?.username || '?');
    console.log(`  "${r.name}": [${names.join(', ') || 'none'}]`);
  });

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(e => { console.error(e.message); process.exit(1); });
