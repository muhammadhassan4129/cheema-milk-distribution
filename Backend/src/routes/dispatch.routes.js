const express = require('express');
const {
  getDispatches,
  getDispatchById,
  createDispatch,
  updateDispatchStatus,
  markAsSold,
  addDestinationEntry,
  receiveDispatch,
  deleteDispatch,
} = require('../controllers/dispatch.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getDispatches);
router.get('/:id', getDispatchById);
router.post('/', authorize('Admin', 'Accountant'), createDispatch);
router.patch('/:id/status', authorize('Admin', 'Accountant', 'MilkTester'), updateDispatchStatus);
router.patch('/:id/mark-sold', authorize('Admin', 'Accountant'), markAsSold);
router.post('/:id/destination-entry', authorize('Admin', 'Accountant'), addDestinationEntry);
router.patch('/:id/receive', authorize('Admin', 'Accountant'), receiveDispatch);
router.delete('/:id', authorize('Admin'), deleteDispatch);

module.exports = router;
