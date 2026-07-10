const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://muhammadengrwaqas_db_user:waqas123@cluster0.ayrd5jn.mongodb.net/')
  .then(async () => {
    const logs = await mongoose.connection.db.collection('synclogs').find().sort({ _id: -1 }).limit(30).toArray();
    console.log('--- Sync Logs ---');
    logs.forEach(l => console.log(`${l.timestamp} - ${l.status} - ${l.context} - ${l.errorMessage}`));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
