const express = require('express');
const { getLabReports, createLabReport, deleteLabReport } = require('../controllers/lab.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/', authorize('Admin', 'Accountant', 'MilkTester'), getLabReports);
router.post('/', authorize('Admin', 'Accountant', 'MilkTester'), createLabReport);
router.delete('/:id', authorize('Admin'), deleteLabReport);

module.exports = router;
