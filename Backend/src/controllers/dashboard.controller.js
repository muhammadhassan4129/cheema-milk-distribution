const AccountRecord = require('../models/AccountRecord');
// dashboard controller — expense fix: Driver Advance exclude
const AdvanceTransaction = require('../models/AdvanceTransaction');
const Dispatch = require('../models/Dispatch');
const RouteCollection = require('../models/RouteCollection');
const PurchaseLedger = require('../models/PurchaseLedger');
const SaleLedger = require('../models/SaleLedger');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/dashboard/summary
 * AdminDashboard + AccountantDashboard ke stats
 * Frontend: dashboard cards - today purchase, today sale, profit, stock
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const [
    todayPurchase, todaySale, monthPurchase, monthSale,
    todayExpenses, pendingDispatches, activeRoutes,
    driverCount, vehicleCount
  ] = await Promise.all([
    // Today purchases — PurchaseLedger se (spoiled liters/amount minus hoga)
    // Net liters = milkLiter - spoiledLiters
    // Net amount = totalAmount - spoiledAmount
    PurchaseLedger.aggregate([
      { $match: { date: today } },
      {
        $group: {
          _id: null,
          liters: { $sum: { $subtract: ['$milkLiter', { $ifNull: ['$spoiledLiters', 0] }] } },
          amount: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$spoiledAmount', 0] }] } },
          count: { $sum: 1 },
        },
      },
    ]),
    // Today sales — SaleLedger se (spoiled amount minus NAHI karo)
    // Spoiled milk loss already AccountRecord mein Expense ke tor pe record hai
    // Sales figure = jo actually customer ko charge kiya gaya (full totalAmount)
    SaleLedger.aggregate([
      { $match: { date: today } },
      {
        $group: {
          _id: null,
          liters: { $sum: '$milkLiter' },
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]),
    // Month purchases — net (spoiled minus)
    PurchaseLedger.aggregate([
      { $match: { date: { $gte: firstOfMonth } } },
      {
        $group: {
          _id: null,
          liters: { $sum: { $subtract: ['$milkLiter', { $ifNull: ['$spoiledLiters', 0] }] } },
          amount: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$spoiledAmount', 0] }] } },
        },
      },
    ]),
    // Month sales — spoiled amount minus NAHI karo (same reason as above)
    SaleLedger.aggregate([
      { $match: { date: { $gte: firstOfMonth } } },
      {
        $group: {
          _id: null,
          liters: { $sum: '$milkLiter' },
          amount: { $sum: '$totalAmount' },
        },
      },
    ]),
    // Today expenses from account records (ALL expenses including Driver Advance)
    AccountRecord.aggregate([
      { 
        $match: { 
          date: today, 
          type: 'Expense'
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    // Pending dispatches
    Dispatch.countDocuments({ status: { $in: ['Pending', 'On Route'] } }),
    // Active route collections today
    RouteCollection.countDocuments({ date: today }),
    // MilkTester count
    User.countDocuments({ role: 'MilkTester', status: 'Active' }),
    // Vehicle count
    Vehicle.countDocuments({ status: { $in: ['Available', 'On Route'] } }),
  ]);

  const todayPurchaseData = todayPurchase[0] || { liters: 0, amount: 0, count: 0 };
  const todaySaleData = todaySale[0] || { liters: 0, amount: 0, count: 0 };
  const monthPurchaseData = monthPurchase[0] || { liters: 0, amount: 0 };
  const monthSaleData = monthSale[0] || { liters: 0, amount: 0 };
  const todayExpenseData = todayExpenses[0] || { total: 0 };

  const todayProfit = todaySaleData.amount - todayPurchaseData.amount - todayExpenseData.total;
  const monthProfit = monthSaleData.amount - monthPurchaseData.amount;
  const currentStock = todayPurchaseData.liters - todaySaleData.liters;

  return ApiResponse.ok({
    today: {
      purchase: todayPurchaseData,
      sale: todaySaleData,
      expenses: todayExpenseData.total,
      profit: todayProfit,
      stock: currentStock > 0 ? currentStock : 0,
    },
    thisMonth: {
      purchase: monthPurchaseData,
      sale: monthSaleData,
      profit: monthProfit,
    },
    operations: {
      pendingDispatches,
      activeRoutes,
      driverCount,
      vehicleCount,
    },
  }).send(res);
});

/**
 * GET /api/dashboard/pnl
 * AdminPnL.tsx - daily chart data + totals
 * Query: startDate, endDate (defaults to last 30 days)
 */
const getPnLReport = asyncHandler(async (req, res) => {
  const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
  const startDate = req.query.startDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  const [purchases, sales, expenses, advances] = await Promise.all([
    // Purchases — PurchaseLedger se, net of spoiled
    PurchaseLedger.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$date',
          total: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$spoiledAmount', 0] }] } },
          liters: { $sum: { $subtract: ['$milkLiter', { $ifNull: ['$spoiledLiters', 0] }] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Sales — SaleLedger se, spoiled minus NAHI (spoiled already expense mein hai)
    SaleLedger.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$date',
          total: { $sum: '$totalAmount' },
          liters: { $sum: '$milkLiter' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Expenses — ALL actual expenses (Driver Advance + Return bhi include)
    AccountRecord.aggregate([
      { 
        $match: { 
          date: { $gte: startDate, $lte: endDate }, 
          type: 'Expense'
        } 
      },
      { $group: { _id: '$date', total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]),
    AccountRecord.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate }, category: 'Driver Advance', type: 'Expense' } },
      { $group: { _id: '$date', total: { $sum: '$amount' } } }
    ]),
  ]);

  // Merge by date into a unified chart format
  const dateMap = {};
  const setDate = (date) => {
    if (!dateMap[date]) dateMap[date] = { date, purchase: 0, sale: 0, expense: 0, profit: 0 };
  };

  purchases.forEach(p => { setDate(p._id); dateMap[p._id].purchase = p.total; });
  sales.forEach(s => { setDate(s._id); dateMap[s._id].sale = s.total; });
  expenses.forEach(e => { setDate(e._id); dateMap[e._id].expense = e.total; });

  const chartData = Object.values(dateMap).map(d => ({
    ...d,
    profit: d.sale - d.purchase - d.expense,
  })).sort((a, b) => a.date.localeCompare(b.date));

  const totalPurchase = purchases.reduce((s, p) => s + p.total, 0);
  const totalSale = sales.reduce((s, p) => s + p.total, 0);
  const totalExpense = expenses.reduce((s, p) => s + p.total, 0);

  return ApiResponse.ok({
    chartData,
    summary: {
      totalPurchase,
      totalSale,
      totalExpense,
      netProfit: totalSale - totalPurchase - totalExpense,
      startDate,
      endDate,
    },
  }).send(res);
});

/**
 * GET /api/dashboard/driver-report/:driverId
 * AdminDriverReports.tsx - driver ka expense + income summary
 */
const getDriverReport = asyncHandler(async (req, res) => {
  const driverId = req.params.driverId;
  const { startDate, endDate } = req.query;

  const filter = { driverId };
  if (startDate && endDate) {
    filter.date = { $gte: startDate, $lte: endDate };
  }

  const transactions = await AdvanceTransaction.find(filter).sort({ date: 1 });

  let totalAdvance = 0, totalExpense = 0, totalIncome = 0, totalReturn = 0;
  transactions.forEach(t => {
    if (t.type === 'ADVANCE') totalAdvance += t.amount;
    else if (t.type === 'EXPENSE') totalExpense += t.amount;
    else if (t.type === 'TRIP_INCOME') totalIncome += t.amount;
    else if (t.type === 'CASH_RETURN') totalReturn += t.amount;
  });

  return ApiResponse.ok({
    transactions,
    summary: { totalAdvance, totalExpense, totalIncome, totalReturn,
      netBalance: totalAdvance - totalExpense + totalIncome - totalReturn },
  }).send(res);
});

module.exports = { getDashboardSummary, getPnLReport, getDriverReport };
