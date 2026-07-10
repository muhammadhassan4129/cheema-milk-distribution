const express = require('express');
const { getDashboardSummary, getPnLReport, getDriverReport } = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();
router.use(protect);

router.get('/summary', getDashboardSummary);
router.get('/pnl', authorize('Admin', 'Accountant'), getPnLReport);
router.get('/driver-report/:driverId', authorize('Admin', 'Accountant'), getDriverReport);

module.exports = router;
