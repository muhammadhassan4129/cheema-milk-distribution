const express = require('express');
const { getSyncLogs, createSyncLog } = require('../controllers/syncLog.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getSyncLogs);
router.post('/', createSyncLog);

module.exports = router;
