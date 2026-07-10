const express = require('express');
const {
  getPurchaseLedger, getPurchaseLedgerBySupplier,
  createPurchaseLedgerEntry, bulkCreatePurchaseLedger,
  updatePurchaseLedgerEntry, deletePurchaseLedgerEntry,
  getPurchaseSummary, getSupplierRunningBalance,
  getSaleLedger, getSaleLedgerByCustomer,
  createSaleLedgerEntry, bulkCreateSaleLedger,
  updateSaleLedgerEntry, deleteSaleLedgerEntry,
  getSaleSummary, getCustomerRunningBalance,
  getSupplierProfiles, createSupplierProfile, updateSupplierProfile, deleteSupplierProfile,
  getCustomerProfiles, createCustomerProfile, updateCustomerProfile, deleteCustomerProfile,
  resetAllData,
} = require('../controllers/ledger.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();
router.use(protect);

// ── Purchase Ledger ──────────────────────────────────────────────────────────
router.get('/purchase/summary', authorize('Admin', 'Accountant'), getPurchaseSummary);
router.get('/purchase/by-supplier/:supplierProfileId', getSupplierRunningBalance);
router.get('/purchase', authorize('Admin', 'Accountant'), getPurchaseLedger);
router.post('/purchase/bulk', authorize('Admin', 'Accountant', 'MilkTester'), bulkCreatePurchaseLedger);
router.post('/purchase', authorize('Admin', 'Accountant', 'MilkTester'), createPurchaseLedgerEntry);
router.put('/purchase/:id', authorize('Admin', 'Accountant'), updatePurchaseLedgerEntry);
router.delete('/purchase/:id', authorize('Admin', 'Accountant'), deletePurchaseLedgerEntry);

// ── Sale Ledger ──────────────────────────────────────────────────────────────
router.get('/sale/summary', authorize('Admin', 'Accountant'), getSaleSummary);
router.get('/sale/by-customer/:customerProfileId', getCustomerRunningBalance);
router.get('/sale', authorize('Admin', 'Accountant'), getSaleLedger);
router.post('/sale/bulk', authorize('Admin', 'Accountant', 'MilkTester'), bulkCreateSaleLedger);
router.post('/sale', authorize('Admin', 'Accountant', 'MilkTester'), createSaleLedgerEntry);
router.put('/sale/:id', authorize('Admin', 'Accountant'), updateSaleLedgerEntry);
router.delete('/sale/:id', authorize('Admin', 'Accountant'), deleteSaleLedgerEntry);

// ── Supplier Profiles ────────────────────────────────────────────────────────
router.get('/suppliers', getSupplierProfiles);
router.post('/suppliers', authorize('Admin', 'Accountant'), createSupplierProfile);
router.put('/suppliers/:id', authorize('Admin', 'Accountant'), updateSupplierProfile);
router.delete('/suppliers/:id', authorize('Admin'), deleteSupplierProfile);

// ── Customer Profiles ────────────────────────────────────────────────────────
router.get('/customers', getCustomerProfiles);
router.post('/customers', authorize('Admin', 'Accountant'), createCustomerProfile);
router.put('/customers/:id', authorize('Admin', 'Accountant'), updateCustomerProfile);
router.delete('/customers/:id', authorize('Admin'), deleteCustomerProfile);

// ── Reset All ────────────────────────────────────────────────────────────────
router.post('/reset-all', authorize('Admin'), resetAllData);

module.exports = router;
