const express = require('express');
const { getVehicles, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/vehicle.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/', authorize('Admin', 'Accountant', 'MilkTester'), getVehicles);
router.post('/', authorize('Admin'), createVehicle);
router.put('/:id', authorize('Admin'), updateVehicle);
router.delete('/:id', authorize('Admin'), deleteVehicle);

module.exports = router;
