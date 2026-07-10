import React, { useState, useMemo } from 'react';
import { useAdvanceContext } from '../../contexts/AdvanceContext';
import { useUserContext } from '../../contexts/UserContext';
import { 
  FileText, Calendar, Filter, Download, DollarSign, ArrowUpRight, 
  ArrowDownLeft, User, Search, MapPin, Tag, CircleDot, AlertCircle
} from 'lucide-react';

export default function AdminDriverReports() {
  const { transactions } = useAdvanceContext();
  const { users } = useUserContext();
  
  // Sirf woh Drivers jo Advances se register hain (role === 'Driver')
  const drivers = useMemo(() => {
    return users.filter(u => u.role === 'Driver');
  }, [users]);

  // Filtering form states
  const [driverSearch, setDriverSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Date assessment helper to filter transactions
  const isTxInPeriod = useMemo(() => {
    return (txDateStr: string) => {
      if (filterPeriod === 'All') return true;

      const local = new Date();
      const year = local.getFullYear();
      const month = String(local.getMonth() + 1).padStart(2, '0');
      const day = String(local.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const dTx = new Date(txDateStr + 'T00:00:00');
      const dBench = new Date(todayStr + 'T00:00:00');
      const diffTime = dBench.getTime() - dTx.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (filterPeriod === 'Today') {
        return txDateStr === todayStr;
      } else if (filterPeriod === '10-days') {
        return diffDays >= 0 && diffDays < 10;
      } else if (filterPeriod === '15-days') {
        return diffDays >= 0 && diffDays < 15;
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
    };
  }, [filterPeriod, customStartDate, customEndDate]);

  // Filtered drivers based on Search Input
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => 
      d.fullName.toLowerCase().includes(driverSearch.toLowerCase()) ||
      d.username.toLowerCase().includes(driverSearch.toLowerCase())
    );
  }, [drivers, driverSearch]);

  // Comprehensive list of active advances and expenses filtered by the active date policy
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => isTxInPeriod(tx.date));
  }, [transactions, isTxInPeriod]);

  // Calculate global summary states across all active drivers in the selected period
  const globalSummary = useMemo(() => {
    const periodTx = transactions.filter(tx => isTxInPeriod(tx.date));
    const advances = periodTx.filter(t => t.type === 'ADVANCE').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = periodTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    return {
      advances,
      expenses,
      balance: advances - expenses
    };
  }, [transactions, isTxInPeriod]);

  const handleDownloadExcel = () => {
    const headers = ["Driver Name", "Date", "Record Type", "Category", "Description", "Amount (Rs.)"];
    
    // We want to download the filtered drivers' transactions
    const allowedDriverIds = new Set(filteredDrivers.map(d => d.id));
    const exportableTx = filteredTransactions.filter(tx => allowedDriverIds.has(tx.driverId));

    const rows = exportableTx.map(tx => [
      tx.driverName || 'N/A',
      tx.date,
      tx.type === 'ADVANCE' ? 'Disbursed Advance' : 'Logged Expense',
      tx.category || 'N/A',
      tx.description.replace(/"/g, '""'),
      tx.amount
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Driver_Custody_Financial_Audit.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="driver-reports-view" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Panel */}
      <div className="bg-slate-900 p-6 rounded-2xl text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"> <div> <h1 className="text-xl font-black font-sans tracking-tight flex items-center"> <FileText className="w-5 h-5 mr-2 text-indigo-400" />
            Driver Advance & Expense Reports
          </h1> <p className="text-slate-400 text-xs mt-1">Audit active route cash balances, advances disbursed, and expense histories itemized by driver profile</p> </div> <button
          onClick={handleDownloadExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer self-start md:self-auto"
        > <Download className="w-3.5 h-3.5" /> <span>Download Audit CSV</span> </button> </div>

      {/* Global Financial Metrics across active filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Advances */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4"> <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"> <ArrowDownLeft className="w-6 h-6" /> </div> <div> <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Advances Disbursed</span> <span className="text-xl font-black text-slate-800 font-mono">Rs. {globalSummary.advances.toLocaleString()}</span> </div> </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4"> <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"> <ArrowUpRight className="w-6 h-6" /> </div> <div> <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Logged Route Expenditures</span> <span className="text-xl font-black text-slate-800 font-mono font-sans">Rs. {globalSummary.expenses.toLocaleString()}</span> </div> </div>

        {/* Net Outstanding Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4"> <div className={`p-3 rounded-lg ${globalSummary.balance >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}> <DollarSign className="w-6 h-6" /> </div> <div> <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Custody Net Balance</span> <span className={`text-xl font-black font-mono ${globalSummary.balance >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
              Rs. {globalSummary.balance.toLocaleString()}
            </span> </div> </div> </div>

      {/* --- Filter Toolbar --- */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Driver Search */}
        <div className="md:col-span-4 flex flex-col justify-center"> <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"> <Search className="w-3.5 h-3.5 text-slate-400" /> Search Driver Profile
          </label> <div className="relative"> <input
              type="text"
              placeholder="Type driver name..."
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none text-slate-700 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500"
            /> <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" /> </div> </div>

        {/* Date Period Filter */}
        <div className="md:col-span-3 flex flex-col justify-center"> <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"> <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Period Select
          </label> <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
          > <option value="All">All Transactions</option> <option value="Today">Today (Active Day)</option> <option value="10-days">Last 10 Days</option> <option value="15-days">Last 15 Days</option> <option value="custom">Custom Date Range</option> </select> </div>

        {/* Custom Range Range Fields */}
        {filterPeriod === 'custom' && (
          <div className="md:col-span-5 grid grid-cols-2 gap-3"> <div className="flex flex-col justify-center"> <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">From Date</span> <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              /> </div> <div className="flex flex-col justify-center"> <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">To Date</span> <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              /> </div> </div>
        )}
      </div>

      {/* --- Section: Individual Driver Custody Profiles --- */}
      <div className="space-y-6"> <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"> <CircleDot className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Individual Drivers Ledgers & Running Expenses
        </h2>

        {filteredDrivers.length > 0 ? (
          filteredDrivers.map(driver => {
            // Retrieve all initial total history for calculations
            const driverTransactionsList = transactions.filter(tx => tx.driverId === driver.id);
            
            // Sub-filtered by selected timeframe
            const filteredDriverTx = driverTransactionsList.filter(tx => isTxInPeriod(tx.date));

            // Cumulative overall calculations
            const rawAdvances = driverTransactionsList.filter(tx => tx.type === 'ADVANCE');
            const totalAdvancesOverall = rawAdvances.reduce((sum, tx) => sum + Number(tx.amount), 0);
            
            // Expenses spent from advances
            const totalExpensesOverall = driverTransactionsList.filter(tx => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0);
            const remainingPocketAdvance = totalAdvancesOverall - totalExpensesOverall;

            // In-period calculations
            const periodAdvances = filteredDriverTx.filter(tx => tx.type === 'ADVANCE');
            const periodExpenses = filteredDriverTx.filter(tx => tx.type === 'EXPENSE');
            const periodAdvancesAmount = periodAdvances.reduce((sum, tx) => sum + Number(tx.amount), 0);
            const periodExpensesAmount = periodExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0);

            return (
              <div key={driver.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-indigo-100 transition-colors">
                
                {/* Driver Summary Profile Header Card */}
                <div className="bg-slate-50 border-b border-slate-250 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"> <div className="flex items-center space-x-3.5"> <div className="w-11 h-11 bg-slate-900 text-white rounded-full flex items-center justify-center font-black uppercase text-base border-2 border-indigo-200 shadow-sm flex-shrink-0">
                      {driver.fullName.charAt(0)}
                    </div> <div> <h3 className="text-base font-black text-slate-800 tracking-tight leading-none">{driver.fullName}</h3> <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-wider">Driver Profile • {driver.username}</p> </div> </div> <div className="flex flex-wrap gap-4 text-xs">
                    {/* Overall Advances Pocket */}
                    <div className="bg-indigo-50/40 border border-indigo-100 p-2.5 rounded-xl min-w-[130px] shadow-sm"> <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Pocket Advance</span> <span className="text-sm font-black text-indigo-950 font-mono block mt-0.5">Rs. {totalAdvancesOverall.toLocaleString()}</span> </div>

                    {/* Spent Pocket */}
                    <div className="bg-rose-50/40 border border-rose-100 p-2.5 rounded-xl min-w-[130px] shadow-sm"> <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Total Spent</span> <span className="text-sm font-black text-rose-950 font-mono block mt-0.5">Rs. {totalExpensesOverall.toLocaleString()}</span> </div>

                    {/* Remaining Pocket Balance */}
                    <div className="bg-emerald-50 border border-emerald-150 p-2.5 rounded-xl min-w-[130px] shadow-sm"> <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block">Remaining Balance</span> <span className="text-sm font-black text-emerald-800 font-mono block mt-0.5">Rs. {remainingPocketAdvance.toLocaleString()}</span> </div> </div> </div>

                {/* Sub-section: Itemized Expenses Spent From Advance */}
                <div className="p-5 space-y-4"> <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Spent History / itemized expenses (From Pocket Advance)
                  </h4>

                  {periodExpenses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {periodExpenses.map(item => (
                        <div key={item.id} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 shadow-xs flex justify-between items-start hover:bg-slate-100/50 transition-colors"> <div className="space-y-1.5 flex-1 pr-3"> <div className="flex items-center space-x-2"> <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase"> <Tag className="w-2.5 h-2.5" />
                                {item.category || 'Transit'}
                              </span> <span className="text-[10px] text-slate-400 font-bold font-mono">{item.date}</span> </div> <p className="text-xs font-semibold text-slate-800 flex items-start gap-1.5 leading-snug"> <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" /> <span className="break-words">{item.description}</span> </p> </div> <div className="text-right flex-shrink-0"> <p className="text-xs font-bold text-slate-400 block">Spent Amount</p> <p className="text-sm font-black text-rose-650 font-mono mt-0.5">Rs. {item.amount.toLocaleString()}</p> </div> </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs italic">
                      No expense records logged by this driver in this period.
                    </div>
                  )}

                  {/* Period cumulative footer statistics */}
                  <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-3"> <div> <span>Showing <strong>{filteredDriverTx.length}</strong> transactions for this driver in this timeframe</span> </div> <div className="flex items-center space-x-4"> <span>Advances: <strong className="text-emerald-700 font-mono">Rs. {periodAdvancesAmount.toLocaleString()}</strong></span> <span>Expenses: <strong className="text-rose-700 font-mono">Rs. {periodExpensesAmount.toLocaleString()}</strong></span> </div> </div> </div> </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500 italic text-sm">
            No driver profiles match the filter parameters.
          </div>
        )}
      </div> </div>
  );
}
