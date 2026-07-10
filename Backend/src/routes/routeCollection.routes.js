const express = require('express');
const {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  submitCollection,
  receiveCollection,
  deleteCollection,
} = require('../controllers/routeCollection.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getCollections);
router.get('/:id', getCollectionById);
router.post('/', authorize('Admin', 'MilkTester'), createCollection);
router.put('/:id', authorize('Admin', 'MilkTester'), updateCollection);
router.patch('/:id/submit', authorize('Admin', 'MilkTester'), submitCollection);
router.patch('/:id/receive', authorize('Admin', 'Accountant'), receiveCollection);
router.delete('/:id', authorize('Admin'), deleteCollection);

module.exports = router;
