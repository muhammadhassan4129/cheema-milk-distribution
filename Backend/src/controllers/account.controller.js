const AccountRecord = require('../models/AccountRecord');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/accounts
 * @desc    Account records lo (Expenses, Income)
 * @access  Admin, Accountant
 * Query: type, category, date, startDate, endDate
 */
const getAccountRecords = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.type) filter.type = req.query.type;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.date) filter.date = req.query.date;

  if (req.query.startDate && req.query.endDate) {
    filter.date = { $gte: req.query.startDate, $lte: req.query.endDate };
  }

  const records = await AccountRecord.find(filter).sort({ date: -1, createdAt: -1 });
  return ApiResponse.ok(records).send(res);
});

/**
 * @route   POST /api/accounts
 * @desc    Naya account record add karo (Expense/Income)
 * @access  Admin, Accountant
 */
const createAccountRecord = asyncHandler(async (req, res) => {
  const now = new Date();
  const record = await AccountRecord.create({
    ...req.body,
    date: req.body.date || now.toISOString().split('T')[0],
    time: req.body.time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    user: req.body.user || req.user.fullName,
    createdBy: req.user._id,
  });

  return ApiResponse.created(record, 'Account record added').send(res);
});

/**
 * @route   DELETE /api/accounts/:id
 * @access  Admin, Accountant
 */
const deleteAccountRecord = asyncHandler(async (req, res) => {
  const record = await AccountRecord.findByIdAndDelete(req.params.id);
  if (!record) throw ApiError.notFound('Account record not found');
  return ApiResponse.ok({ id: req.params.id }, 'Record deleted').send(res);
});

/**
 * @route   GET /api/accounts/summary
 * @desc    Financial summary - total income, total expense, profit/loss
 * @access  Admin, Accountant
 */
const getFinancialSummary = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.startDate && req.query.endDate) {
    filter.date = { $gte: req.query.startDate, $lte: req.query.endDate };
  }

  const records = await AccountRecord.find(filter);

  let totalIncome = 0;
  let totalExpense = 0;

  records.forEach((r) => {
    const amount = Number(r.amount);
    if (r.type === 'Income' || r.type === 'Revenue') {
      totalIncome += amount;
    } else if (r.type === 'Expense') {
      if (amount < 0) {
        // Negative expense = actually a return/credit
        totalExpense += 0;
        totalIncome += Math.abs(amount);
      } else {
        totalExpense += amount;
      }
    }
  });

  return ApiResponse.ok({
    totalIncome,
    totalExpense,
    netPnL: totalIncome - totalExpense,
    recordCount: records.length,
  }).send(res);
});

module.exports = { getAccountRecords, createAccountRecord, deleteAccountRecord, getFinancialSummary };
