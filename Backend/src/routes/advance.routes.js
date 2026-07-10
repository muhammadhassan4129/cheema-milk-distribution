const express = require('express');
const {
  getTransactions,
  getDriverBalance,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/advance.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getTransactions);
router.get('/balance/:driverId', getDriverBalance);
router.post('/', authorize('Admin', 'Accountant'), createTransaction);
router.put('/:id', authorize('Admin', 'Accountant'), updateTransaction);
router.delete('/:id', authorize('Admin'), deleteTransaction);

module.exports = router;
