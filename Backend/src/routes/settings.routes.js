const express = require('express');
const { getSettings, getSetting, upsertSetting, bulkUpsertSettings, deleteSetting } = require('../controllers/settings.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getSettings);
router.get('/:key', getSetting);
router.put('/:key', upsertSetting);
router.post('/bulk', bulkUpsertSettings);
router.delete('/:key', deleteSetting);

module.exports = router;
