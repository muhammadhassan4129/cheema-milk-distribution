const express = require('express');
const { getDraftsForDate, getDraft, saveDraft, deleteDraft } = require('../controllers/purchaseDraft.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect, authorize('Admin', 'Accountant'));

router.get('/:date', getDraftsForDate);
router.get('/:date/:supplierId', getDraft);
router.post('/', saveDraft);
router.delete('/:date/:supplierId', deleteDraft);

module.exports = router;
