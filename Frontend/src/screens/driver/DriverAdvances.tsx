import React, { useState } from 'react';
import { useAdvanceContext } from '../../contexts/AdvanceContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Wallet, FileText, Calendar, DollarSign, Tag, ArrowDown, ArrowUp, User } from 'lucide-react';

export default function DriverAdvances() {
  const { user } = useAuth();
  const { transactions, addExpense, getDriverBalance } = useAdvanceContext();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseData, setExpenseData] = useState({
    driverName: user?.fullName || user?.name || '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'Fuel',
    description: ''
  });
  const [filterPeriod, setFilterPeriod] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  if (!user) return null;

  // Filter calculations
  const rawTransactions = transactions.filter(t => t.driverId === user.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const userTransactions = rawTransactions.filter(tx => {
    if (filterPeriod === 'All') return true;

    const todayStr = new Date().toISOString().split('T')[0];
    const txDateStr = tx.date;

    const todayDate = new Date(todayStr);
    const txDate = new Date(txDateStr);
    const diffTime = todayDate.getTime() - txDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Difference in days

    if (filterPeriod === '1-day') {
      return txDateStr === todayStr;
    } else if (filterPeriod === '2-day') {
      return diffDays >= 0 && diffDays < 2;
    } else if (filterPeriod === '3-day') {
      return diffDays >= 0 && diffDays < 3;
    } else if (filterPeriod === '5-day') {
      return diffDays >= 0 && diffDays < 5;
    } else if (filterPeriod === 'custom') {
      let matches = true;
      if (customStartDate) {
        matches = matches && txDateStr >= customStartDate;
      }
      if (customEndDate) {
        matches = matches && txDateStr <= customEndDate;
      }
      return matches;
    }
    return true;
  });

  const { totalAdvance, totalExpense, balance } = getDriverBalance(user.id);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseData.amount || Number(expenseData.amount) <= 0) return;
    
    addExpense({
      driverId: user.id,
      driverName: expenseData.driverName || user.fullName || user.name,
      date: expenseData.date,
      amount: Number(expenseData.amount),
      category: expenseData.category as any,
      description: expenseData.description
    });
    
    setShowAddExpense(false);
    setExpenseData({
      driverName: user?.fullName || user?.name || '',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: 'Fuel',
      description: ''
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto"> <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200"> <div> <h1 className="text-2xl font-bold text-slate-800 flex items-center"> <Wallet className="w-6 h-6 mr-2 text-indigo-500" />
            Advances & Expenses
          </h1> <p className="text-slate-500 text-sm mt-1">Manage your route expenses and view accountant advances</p> </div> <button
          onClick={() => setShowAddExpense(!showAddExpense)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
        >
          {showAddExpense ? <FileText className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddExpense ? 'Cancel' : 'Add Expense'}</span> </button> </div> <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center"> <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3"> <ArrowDown className="w-6 h-6" /> </div> <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Received</span> <span className="text-2xl font-bold text-slate-800">Rs. {totalAdvance.toLocaleString()}</span> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center"> <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3"> <ArrowUp className="w-6 h-6" /> </div> <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Spent</span> <span className="text-2xl font-bold text-slate-800">Rs. {totalExpense.toLocaleString()}</span> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center"> <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${balance >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}> <Wallet className="w-6 h-6" /> </div> <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Remaining Balance</span> <span className={`text-2xl font-bold ${balance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>Rs. {balance.toLocaleString()}</span> </div> </div>

      {showAddExpense && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"> <div className="bg-slate-50 px-6 py-4 border-b border-slate-200"> <h3 className="text-lg font-bold text-slate-800">Record New Expense</h3> </div> <form onSubmit={handleAddExpense} className="p-6"> <div className="space-y-4 max-w-xl mx-auto">
              {/* 1. Driver's Name */}
              <div> <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center"> <User className="w-4 h-4 mr-2" /> Driver's Name
                </label> <input
                  type="text"
                  required
                  placeholder="Enter driver's name"
                  value={expenseData.driverName}
                  onChange={(e) => setExpenseData({...expenseData, driverName: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                /> </div>

              {/* 2. Date */}
              <div> <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center"> <Calendar className="w-4 h-4 mr-2" /> Date
                </label> <input
                  type="date"
                  required
                  value={expenseData.date}
                  onChange={(e) => setExpenseData({...expenseData, date: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                /> </div>
              
              {/* 3. Category */}
              <div> <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center"> <Tag className="w-4 h-4 mr-2" /> Category
                </label> <select
                  value={expenseData.category}
                  onChange={(e) => setExpenseData({...expenseData, category: e.target.value as any})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                > <option value="Food">Food Expenses</option> <option value="Repair">Vehicle Repairs & Maintenance</option> <option value="Miscellaneous">Other Miscellaneous Expenditures</option> <option value="Fuel">Fuel</option> <option value="Toll Plaza">Toll Plaza</option> <option value="Other">Other</option> </select> </div>

              {/* 4. Amount */}
              <div> <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center"> <DollarSign className="w-4 h-4 mr-2" /> Amount Spent (Rs.)
                </label> <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                /> </div>

              {/* 5. Description */}
              <div> <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center"> <FileText className="w-4 h-4 mr-2" /> Description / Note
                </label> <input
                  type="text"
                  required
                  placeholder="Details of the expenditure"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({...expenseData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                /> </div> </div> <div className="flex justify-end pt-4 mt-6 border-t border-slate-200"> <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors mr-3"
              >
                Cancel
              </button> <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Save Expense
              </button> </div> </form> </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"> <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"> <div> <h2 className="text-lg font-bold text-slate-800">Transaction History</h2> <p className="text-xs text-slate-500">Filter your received advances and logged expenses</p> </div> <div className="flex flex-wrap items-center gap-3 w-full md:w-auto"> <div className="flex items-center space-x-1.5"> <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter Driver:</span> <select
                className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-slate-50 text-slate-700 font-medium outline-none"
                disabled
              > <option value={user.id}>{user.fullName || user.name}</option> </select> </div> <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            > <option value="All">All Time</option> <option value="1-day">1 Day (Today)</option> <option value="2-day">2 Days</option> <option value="3-day">3 Days</option> <option value="5-day">5 Days</option> <option value="custom">Custom Date Range</option> </select>

            {filterPeriod === 'custom' && (
              <div className="flex items-center gap-2"> <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1 border border-slate-300 rounded text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                /> <span className="text-slate-400 text-xs">to</span> <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1 border border-slate-300 rounded text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                /> </div>
            )}
          </div> </div> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse"> <thead> <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200"> <th className="px-6 py-3 font-semibold">Date</th> <th className="px-6 py-3 font-semibold">Type</th> <th className="px-6 py-3 font-semibold">Category/Context</th> <th className="px-6 py-3 font-semibold">Description</th> <th className="px-6 py-3 font-semibold text-right">Amount</th> </tr> </thead> <tbody className="divide-y divide-slate-200">
              {userTransactions.length > 0 ? userTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors"> <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{tx.date}</td> <td className="px-6 py-4 text-sm whitespace-nowrap"> <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      tx.type === 'ADVANCE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tx.type === 'ADVANCE' ? 'Advance' : 'Expense'}
                    </span> </td> <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{tx.category || '-'}</td> <td className="px-6 py-4 text-sm text-slate-600">{tx.description}</td> <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${
                    tx.type === 'ADVANCE' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'ADVANCE' ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                  </td> </tr>
              )) : (
                <tr> <td colSpan={5} className="px-6 py-12 text-center text-slate-500"> <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" /> <p>No transactions found.</p> </td> </tr>
              )}
            </tbody> </table> </div> </div> </div>
  );
}
