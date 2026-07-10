const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://muhammadengrwaqas_db_user:waqas123@cluster0.ayrd5jn.mongodb.net/')
  .then(async () => {
    const mr = await mongoose.connection.db.collection('milkrecords').find({ date: '2026-07-07' }).toArray();
    const sl = await mongoose.connection.db.collection('saleledgers').find({ date: '2026-07-07' }).toArray();
    const pl = await mongoose.connection.db.collection('purchaseledgers').find({ date: '2026-07-07' }).toArray();
    console.log('--- Database Audit ---');
    console.log('MilkRecords count:', mr.length);
    console.log('SaleLedgers count:', sl.length);
    console.log('PurchaseLedgers count:', pl.length);
    console.log('SaleLedgers:', JSON.stringify(sl, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
