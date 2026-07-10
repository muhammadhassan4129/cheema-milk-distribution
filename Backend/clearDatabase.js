/**
 * Database Clear Script
 * - Routes: bilkul safe (skip)
 * - Users: sirf non-Admin delete, Admin bacha ke rakho
 * - Baaki sab collections: poora data delete
 *
 * Run: node clearDatabase.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;

// Loop mein yeh collections bilkul skip honge
const SKIP_COLLECTIONS = ['routes', 'users'];

// Admin user — agar koi Admin na bache toh yeh naya ban jayega
const ADMIN = {
  fullName: 'Super Admin',
  username: 'admin',
  password: 'admin123',
  role: 'Admin',
  status: 'Active',
  phone: '',
  cnic: '',
  openingBalance: 0,
};

async function clearDatabase() {
  try {
    console.log('\n🔌 MongoDB se connect ho raha hai...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected!\n');

    const db = mongoose.connection.db;

    // ── Sab collections ki list ────────────────────────────────────────────
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    console.log(`📋 Collections mili: ${collectionNames.join(', ') || '(koi nahi)'}\n`);

    // ── Routes aur Users loop mein skip — alag se handle honge ───────────
    for (const name of collectionNames) {
      if (SKIP_COLLECTIONS.includes(name.toLowerCase())) {
        console.log(`⏭️  ${name}: skip kiya gaya (protected)`);
        continue;
      }
      const result = await db.collection(name).deleteMany({});
      console.log(`🗑️  ${name}: ${result.deletedCount} records delete kiye`);
    }

    // ── Users: sirf non-Admin delete karo ─────────────────────────────────
    console.log('\n👥 Users collection clean ho rahi hai (Admin safe hai)...');
    const usersResult = await db.collection('users').deleteMany({ role: { $ne: 'Admin' } });
    console.log(`🗑️  users (non-Admin): ${usersResult.deletedCount} records delete kiye`);

    // ── Check karo Admin bacha hai ya nahi ────────────────────────────────
    const adminExists = await db.collection('users').findOne({ role: 'Admin' });
    if (!adminExists) {
      console.log('\n⚠️  Koi Admin nahi mila — naya Admin ban raha hai...');
      const hashedPassword = await bcrypt.hash(ADMIN.password, 12);
      await db.collection('users').insertOne({
        ...ADMIN,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✓ Admin ban gaya!');
      console.log('─────────────────────────────────');
      console.log(`  Username : ${ADMIN.username}`);
      console.log(`  Password : ${ADMIN.password}`);
      console.log('─────────────────────────────────');
    } else {
      console.log(`✓ Admin already maujood hai: "${adminExists.username}"`);
    }

    console.log('\n✅ Database clean ho gaya!');
    console.log('   (Routes aur Admin user safe hain)\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnect ho gaya.');
    process.exit(0);
  }
}

clearDatabase();
