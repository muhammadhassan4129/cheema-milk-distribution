const express = require('express');
const { resetSystemData } = require('../controllers/reset.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

/**
 * POST /api/reset
 * Admin only + special confirmation header required
 * Header: x-reset-confirm: RESET_CONFIRMED
 */
router.post('/', protect, authorize('Admin'), resetSystemData);

module.exports = router;
