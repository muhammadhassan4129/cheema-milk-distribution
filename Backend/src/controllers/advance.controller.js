const AdvanceTransaction = require('../models/AdvanceTransaction');
const AccountRecord = require('../models/AccountRecord');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/advances
 * @desc    Sab advance transactions lo
 * @access  Admin, Accountant, MilkTester (apne)
 */
const getTransactions = asyncHandler(async (req, res) => {
  const filter = {};

  // MilkTester sirf apne transactions dekhega
  if (req.user.role === 'MilkTester') {
    filter.driverId = req.user._id;
  }

  if (req.query.driverId) filter.driverId = req.query.driverId;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.date) filter.date = req.query.date;

  const transactions = await AdvanceTransaction.find(filter)
    .populate('driverId', 'fullName username')
    .sort({ createdAt: -1 });

  return ApiResponse.ok(transactions).send(res);
});

/**
 * @route   GET /api/advances/balance/:driverId
 * @desc    Driver ki balance summary
 * @access  Admin, Accountant, Driver (apni)
 */
const getDriverBalance = asyncHandler(async (req, res) => {
  const driverId = req.params.driverId;
  const openingBalance = parseFloat(req.query.openingBalance || 0);

  const transactions = await AdvanceTransaction.find({ driverId });

  let totalAdvance = 0;
  let totalExpense = 0;
  let totalIncome = 0;
  let totalReturn = 0;

  transactions.forEach((t) => {
    const amount = Number(t.amount);
    if (t.type === 'ADVANCE') totalAdvance += amount;
    else if (t.type === 'EXPENSE') totalExpense += amount;
    else if (t.type === 'TRIP_INCOME') totalIncome += amount;
    else if (t.type === 'CASH_RETURN') totalReturn += amount;
  });

  const balance = openingBalance + totalAdvance - totalExpense + totalIncome - totalReturn;

  return ApiResponse.ok({
    driverId,
    totalAdvance,
    totalExpense,
    totalIncome,
    totalReturn,
    balance,
  }).send(res);
});

/**
 * @route   POST /api/advances
 * @desc    Naya advance/expense/income transaction add karo
 * @access  Admin, Accountant
 *
 * NOTE: AccountRecord frontend (AdvanceContext) mein already banta hai.
 * Backend mein duplicate mat banao — sirf AdvanceTransaction save karo.
 */
const createTransaction = asyncHandler(async (req, res) => {
  const transaction = await AdvanceTransaction.create({
    ...req.body,
    createdBy: req.user._id,
  });

  return ApiResponse.created(transaction, 'Transaction added').send(res);
});

/**
 * @route   PUT /api/advances/:id
 * @access  Admin, Accountant
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await AdvanceTransaction.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!transaction) throw ApiError.notFound('Transaction not found');
  return ApiResponse.ok(transaction, 'Transaction updated').send(res);
});

/**
 * @route   DELETE /api/advances/:id
 * @access  Admin
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await AdvanceTransaction.findByIdAndDelete(req.params.id);
  if (!transaction) throw ApiError.notFound('Transaction not found');
  return ApiResponse.ok({ id: req.params.id }, 'Transaction deleted').send(res);
});

module.exports = {
  getTransactions,
  getDriverBalance,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
