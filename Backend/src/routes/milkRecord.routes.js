const express = require('express');
const {
  getMilkRecords,
  createMilkRecord,
  createBulkMilkRecords,
  deleteMilkRecord,
} = require('../controllers/milkRecord.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/', authorize('Admin', 'Accountant', 'MilkTester'), getMilkRecords);
router.post('/', authorize('Admin', 'Accountant', 'MilkTester'), createMilkRecord);
router.post('/bulk', authorize('Admin', 'MilkTester'), createBulkMilkRecords);
router.delete('/:id', authorize('Admin'), deleteMilkRecord);

module.exports = router;
