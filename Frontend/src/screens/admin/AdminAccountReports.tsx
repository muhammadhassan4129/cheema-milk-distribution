import React, { useState, useMemo, useEffect } from 'react';
import { useAccountContext } from '../../contexts/AccountContext';
import { useMilkTransactionContext } from '../../contexts/MilkTransactionContext';
import { useAdvanceContext } from '../../contexts/AdvanceContext';
import { useUserContext } from '../../contexts/UserContext';
import { useDispatchContext } from '../../contexts/DispatchContext';
import { dashboardApi, isOnline } from '../../services/api';
import { 
  FileText, Calendar, Download, TrendingUp, TrendingDown, 
  ShoppingCart, DollarSign, ArrowUpRight, ArrowDownLeft, Search, 
  PlusCircle, User, Users, CheckCircle, RefreshCw, Sliders, Trash, ListFilter,
  Layers, Wallet, BookOpen, Calculator, Trash2, Droplets, Truck
} from 'lucide-react';

export default function AdminAccountReports() {
  const { accountRecords, addAccountRecord } = useAccountContext();
  const { records: milkRecords } = useMilkTransactionContext();
  const { transactions: driverTransactions, addAdvance } = useAdvanceContext();
  const { users } = useUserContext();
  const { dispatches } = useDispatchContext();

  const drivers = useMemo(() => {
    return users.filter(u => u.role === 'Driver');
  }, [users]);

  // Selected Tab/Page: 'p1', 'p2', 'p3', 'p4', 'p5'
  const [activeTab, setActiveTab] = useState<'p1' | 'p2' | 'p3' | 'p4' | 'p5'>('p1');

  // --- Date setup & helpers ---
  const local = new Date();
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const monthStartStr = `${year}-${month}-01`;

  // Filter calculator helper based on custom ranges or standard periods
  const isDateInPeriod = (itemDate: string, period: string, start?: string, end?: string) => {
    if (period === 'All') return true;

    const dTx = new Date(itemDate + 'T00:00:00');
    const dBench = new Date(todayStr + 'T00:00:00');
    const diffTime = dBench.getTime() - dTx.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (period === 'Today' || period === '1-day') {
      return itemDate === todayStr;
    } else if (period === '2-days') {
      return diffDays >= 0 && diffDays < 2;
    } else if (period === '5-days') {
      return diffDays >= 0 && diffDays < 5;
    } else if (period === 'custom') {
      let matches = true;
      if (start) matches = matches && itemDate >= start;
      if (end) matches = matches && itemDate <= end;
      return matches;
    }
    return true;
  };

  // ==========================================
  // PAGE 1: Purchase, Sale & Dispatch Records
  // ==========================================
  const [p1Type, setP1Type] = useState<'All' | 'Purchase' | 'Sale' | 'Dispatch'>('All');
  const [p1Period, setP1Period] = useState<string>('All');
  const [p1Start, setP1Start] = useState<string>('');
  const [p1End, setP1End] = useState<string>('');

  const p1CombinedRecords = useMemo(() => {
    const list: any[] = [];

    // Add Purchase & Sale
    milkRecords.forEach(rec => {
      list.push({
        id: rec.id,
        date: rec.date,
        type: rec.type, // 'Purchase' | 'Sale'
        partyName: rec.partyName,
        vol: rec.vol,
        amount: rec.amount,
        details: rec.soldUnit === 'Kg'
          ? `Sold ${rec.soldQtyKg?.toFixed(2)} Kg originally`
          : `Fat: ${rec.fat}% | SNF: ${rec.snf}% | LR: ${rec.lr} | TS: ${rec.totalTs?.toFixed(2) || '—'} Kg`,
        soldUnit: rec.soldUnit,
        soldQtyKg: rec.soldQtyKg
      });
    });

    // Add Dispatches
    dispatches.forEach(disp => {
      list.push({
        id: disp.id,
        date: disp.date,
        type: 'Dispatch',
        partyName: disp.destination || 'Unspecified Hub',
        vol: disp.liters,
        amount: 0, // Dispatch carries zero absolute profit financial value impact
        details: `Driver: ${disp.driverName || 'N/A'} | Vehicle: ${disp.vehicleNumber || 'N/A'}`
      });
    });

    // Filter by action type
    let filtered = list;
    if (p1Type !== 'All') {
      filtered = list.filter(r => r.type === p1Type);
    }

    // Filter by date duration policy
    filtered = filtered.filter(r => isDateInPeriod(r.date, p1Period, p1Start, p1End));

    // Sort chronologically descending
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [milkRecords, dispatches, p1Type, p1Period, p1Start, p1End]);


  // ==========================================
  // PAGE 2: Advance Balance
  // ==========================================
  // List of all people (drivers) who received advances + their remaining balances
  const advanceRecipients = useMemo(() => {
    // Compile distinct drivers who have transactions
    return drivers.map(d => {
      const dTx = driverTransactions.filter(tx => tx.driverId === d.id);
      const advances = dTx.filter(tx => tx.type === 'ADVANCE');
      if (advances.length === 0) return null; // Only show drivers who received advance payments

      const totalGiven = advances.reduce((s, tx) => s + Number(tx.amount), 0);
      const totalSpent = dTx.filter(tx => tx.type === 'EXPENSE').reduce((s, tx) => s + Number(tx.amount), 0);
      const latestAdvDate = advances[0]?.date || '—';

      return {
        id: d.id,
        name: d.fullName,
        username: d.username,
        amountGiven: totalGiven,
        latestDate: latestAdvDate,
        remainingBalance: totalGiven - totalSpent
      };
    }).filter(Boolean);
  }, [drivers, driverTransactions]);


  // ==========================================
  // PAGE 3: Payments Made
  // ==========================================
  const [p3Search, setP3Search] = useState<string>('');
  const [p3Start, setP3Start] = useState<string>('');
  const [p3End, setP3End] = useState<string>('');

  const paymentsMadeList = useMemo(() => {
    const list: any[] = [];

    // General office expenses
    accountRecords.filter(r => r.type === 'Expense').forEach(r => {
      list.push({
        id: r.id,
        date: r.date,
        payee: r.payee,
        amount: r.amount,
        category: r.category,
        method: r.method,
        note: r.note
      });
    });

    // Driver Advances disbursed
    driverTransactions.filter(tx => tx.type === 'ADVANCE').forEach(tx => {
      list.push({
        id: tx.id,
        date: tx.date,
        payee: tx.driverName || 'Driver Account',
        amount: tx.amount,
        category: 'Driver Advance Topup',
        method: 'Cash Outflow',
        note: tx.description
      });
    });

    return list.filter(p => {
      // 1. Search by name
      if (p3Search.trim() !== '') {
        const query = p3Search.toLowerCase();
        if (!p.payee.toLowerCase().includes(query)) return false;
      }
      // 2. Custom date range filter
      if (p3Start && p.date < p3Start) return false;
      if (p3End && p.date > p3End) return false;

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [accountRecords, driverTransactions, p3Search, p3Start, p3End]);


  // ==========================================
  // PAGE 4: Master Financial Summary
  // ==========================================
  const masterSummary = useMemo(() => {
    const milkSalesRevenue = milkRecords.filter(r => r.type === 'Sale').reduce((s, r) => s + r.amount, 0);
    const otherIncome = accountRecords.filter(r => r.type === 'Income').reduce((s, r) => s + r.amount, 0);
    const totalRevenue = milkSalesRevenue + otherIncome;

    const milkPurchasesCost = milkRecords.filter(r => r.type === 'Purchase').reduce((s, r) => s + r.amount, 0);
    const generalExpenses = accountRecords
      .filter(r => r.type === 'Expense' && r.category !== 'Driver Advance' && r.category !== 'Driver Advance Return')
      .reduce((s, r) => s + r.amount, 0);
    const driverAdvancesIssued = driverTransactions.filter(r => r.type === 'ADVANCE').reduce((s, r) => s + Number(r.amount), 0);
    const driverReturnsReceived = driverTransactions.filter(r => r.type === 'CASH_RETURN').reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenditures = (generalExpenses + driverAdvancesIssued) - driverReturnsReceived;

    return {
      revenueFromMilk: milkSalesRevenue,
      otherIncome,
      totalRevenue,
      costOfMilkPurchased: milkPurchasesCost,
      generalExpenses,
      driverAdvancesIssued,
      driverReturnsReceived,
      totalExpenditures,
      netFinancialLedger: totalRevenue - milkPurchasesCost - totalExpenditures
    };
  }, [milkRecords, accountRecords, driverTransactions]);


  // ==========================================
  // PAGE 5: Profit & Loss — Backend se (same source as AdminPnL page)
  // ==========================================
  const [pnlReports, setPnlReports] = useState({
    today: {
      purchasedLiters: 0, purchasedAmt: 0,
      soldLiters: 0, soldAmt: 0,
      expenditure: 0, netProfit: 0
    },
    monthly: {
      purchasedLiters: 0, purchasedAmt: 0,
      soldLiters: 0, soldAmt: 0,
      expenditure: 0, netProfit: 0
    }
  });
  const [pnlLoading, setPnlLoading] = useState(false);

  const loadPnl = async () => {
    if (!isOnline()) return;
    setPnlLoading(true);
    try {
      // Today
      const todayRes: any = await dashboardApi.getPnL({ startDate: todayStr, endDate: todayStr });
      // Month
      const monthRes: any = await dashboardApi.getPnL({ startDate: monthStartStr, endDate: todayStr });

      const todayS = todayRes?.data?.summary || {};
      const monthS = monthRes?.data?.summary || {};

      // Liters from dashboard summary (accurate)
      const summaryRes: any = await dashboardApi.getSummary();
      const dash = summaryRes?.data || {};

      setPnlReports({
        today: {
          purchasedLiters: dash.today?.purchase?.liters ?? 0,
          purchasedAmt: Math.round(todayS.totalPurchase || 0),
          soldLiters: dash.today?.sale?.liters ?? 0,
          soldAmt: Math.round(todayS.totalSale || 0),
          expenditure: Math.round(todayS.totalExpense || 0),
          netProfit: Math.round(todayS.netProfit || (todayS.totalSale - todayS.totalPurchase - todayS.totalExpense) || 0),
        },
        monthly: {
          purchasedLiters: dash.thisMonth?.purchase?.liters ?? 0,
          purchasedAmt: Math.round(monthS.totalPurchase || 0),
          soldLiters: dash.thisMonth?.sale?.liters ?? 0,
          soldAmt: Math.round(monthS.totalSale || 0),
          expenditure: Math.round(monthS.totalExpense || 0),
          netProfit: Math.round(monthS.netProfit || (monthS.totalSale - monthS.totalPurchase - monthS.totalExpense) || 0),
        }
      });
    } catch (err) {
      console.warn('[AdminAccountReports P5] PnL load failed:', err);
    } finally {
      setPnlLoading(false);
    }
  };

  // Load P5 data when tab is opened
  useEffect(() => {
    if (activeTab === 'p5') loadPnl();
  }, [activeTab]);

  const handleDownloadCSV = () => {
    let headers = ["Date", "Type", "Party/Hub", "Quantity (Liters)", "Amount (Rs.)", "Details/Memo"];
    let rows = p1CombinedRecords.map(item => [
      item.date,
      item.type,
      item.partyName,
      item.vol,
      item.amount,
      item.details
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dairy_Accounts_Audit_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admin-account-reports-container" className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Banner Overview */}
      <div className="bg-slate-900 p-6 rounded-2xl text-white border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"> <div className="flex items-center gap-3"> <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"> <BookOpen className="w-5 h-5 text-indigo-100" /> </div> <div> <h1 className="text-xl font-black font-sans tracking-tight">Finances & Audit Reports</h1> <p className="text-xs text-slate-400 mt-0.5 font-medium">Corporate ledger accounts, driver custody advances, and Profit & Loss balance audits</p> </div> </div> <button
          onClick={handleDownloadCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-stretch sm:self-auto justify-center"
        > <Download className="w-3.5 h-3.5" /> Export Page 1 To CSV
        </button> </div>

      {/* Structured Navigation Pages */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2"> <button
          onClick={() => setActiveTab('p1')}
          className={`px-4.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'p1' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Page 1 — Purchase, Sale & Dispatch
        </button> <button
          onClick={() => setActiveTab('p2')}
          className={`px-4.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'p2' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Page 2 — Advance Balance
        </button> <button
          onClick={() => setActiveTab('p3')}
          className={`px-4.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'p3' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Page 3 — Payments Made
        </button> <button
          onClick={() => setActiveTab('p4')}
          className={`px-4.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'p4' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Page 4 — Master Financial
        </button> <button
          onClick={() => setActiveTab('p5')}
          className={`px-4.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'p5' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Page 5 — Profit & Loss
        </button> </div>

      {/* =======================================================
          PAGE 1: PURCHASE, SALE & DISPATCH RECORDS
          ======================================================= */}
      {activeTab === 'p1' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"> <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4"> <div> <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5"> <Layers className="w-5 h-5 text-indigo-600" /> Page 1: Purchase, Sale & Dispatch Record
              </h2> <p className="text-xs text-slate-500 mt-1">Unified view of all critical dairy volumes processed, traded, or dispatched</p> </div> <div className="flex items-center gap-2"> <span className="text-[11px] font-bold text-slate-400">Filter stream:</span> <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                {(['All', 'Purchase', 'Sale', 'Dispatch'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setP1Type(t)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      p1Type === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-505 hover:text-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div> </div> </div>

          {/* Date range toolbar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4"> <div className="md:col-span-4 flex flex-col justify-center"> <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Select Reporting Period</span> <select
                value={p1Period}
                onChange={(e) => setP1Period(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 outline-none"
              > <option value="All">All Transactions</option> <option value="Today">Today Only</option> <option value="2-days">2 Days (Yesterday & Today)</option> <option value="5-days">5 Days Window</option> <option value="custom">Custom Date Range</option> </select> </div>

            {p1Period === 'custom' && (
              <div className="md:col-span-8 grid grid-cols-2 gap-3"> <div className="flex flex-col justify-center"> <span className="text-[9px] font-bold text-slate-400 uppercase">From Date</span> <input
                    type="date"
                    value={p1Start}
                    onChange={(e) => setP1Start(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                  /> </div> <div className="flex flex-col justify-center"> <span className="text-[9px] font-bold text-slate-400 uppercase">To Date</span> <input
                    type="date"
                    value={p1End}
                    onChange={(e) => setP1End(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                  /> </div> </div>
            )}
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200"> <table className="w-full text-left min-w-[700px]"> <thead className="bg-slate-50 border-b border-slate-200"> <tr className="text-slate-500 text-[10px] uppercase font-bold tracking-wider"> <th className="px-5 py-3">Reporting Date</th> <th className="px-5 py-3">Category Stream</th> <th className="px-5 py-3">Party Name / Hub Destination</th> <th className="px-5 py-3 text-right">Volume</th> <th className="px-5 py-3 text-right">Fiscal Worth</th> <th className="px-5 py-3">Technical Metrics Notes</th> </tr> </thead> <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {p1CombinedRecords.length > 0 ? (
                  p1CombinedRecords.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors"> <td className="px-5 py-3.5 font-mono text-slate-400 font-bold">{item.date}</td> <td className="px-5 py-3.5"> <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          item.type === 'Purchase' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          item.type === 'Sale' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          'bg-purple-50 border-purple-200 text-purple-700'
                        }`}>
                          {item.type}
                        </span> </td> <td className="px-5 py-3.5 font-bold text-slate-800">{item.partyName}</td> <td className="px-5 py-3.5 text-right font-black font-mono"> <div className="flex flex-col items-end"> <span>{item.vol.toLocaleString()} L</span>
                          {item.type === 'Sale' && item.soldUnit === 'Kg' && (
                            <span className="block text-[10px] text-green-705 font-bold">
                              ({item.soldQtyKg?.toLocaleString()} Kg)
                            </span>
                          )}
                        </div> </td> <td className="px-5 py-3.5 text-right font-black font-mono">
                        {item.type === 'Dispatch' ? (
                          <span className="text-slate-400 font-sans font-semibold italic text-[10px]">No financial effect</span>
                        ) : (
                          `Rs. ${Math.round(item.amount).toLocaleString()}`
                        )}
                      </td> <td className="px-5 py-3.5 text-slate-500 font-medium">{item.details}</td> </tr>
                  ))
                ) : (
                  <tr> <td colSpan={6} className="px-5 py-12 text-center text-slate-400 italic">No records detected matching selections.</td> </tr>
                )}
              </tbody> </table> </div> </div>
      )}

      {/* =======================================================
          PAGE 2: ADVANCE BALANCE
          ======================================================= */}
      {activeTab === 'p2' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"> <div> <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5"> <Wallet className="w-5 h-5 text-indigo-600" /> Page 2: Recipients Advances & Overheads
            </h2> <p className="text-xs text-slate-500 mt-1">Comprehensive directory of all system drivers who hold outstanding cash balances and custody pools</p> </div> <div className="overflow-x-auto rounded-xl border border-slate-200"> <table className="w-full text-left min-w-[600px]"> <thead className="bg-slate-50 border-b border-slate-200"> <tr className="text-slate-500 text-[10px] uppercase font-bold tracking-wider"> <th className="px-5 py-3">Recipient Driver</th> <th className="px-5 py-3">Profile Account</th> <th className="px-5 py-3">Latest Top-up Date</th> <th className="px-5 py-3 text-right">Cumulative Given Amount</th> <th className="px-5 py-3 text-right">Current Remaining Balance</th> </tr> </thead> <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {advanceRecipients.length > 0 ? (
                  advanceRecipients.map(r => r && (
                    <tr key={r.id} className="hover:bg-slate-50/40 transition-colors"> <td className="px-5 py-3.5 font-bold text-slate-800 flex items-center gap-2"> <div className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-[10px] uppercase">
                          {r.name.charAt(0)}
                        </div> <span>{r.name}</span> </td> <td className="px-5 py-3.5 text-slate-505 font-mono">@{r.username}</td> <td className="px-5 py-3.5 text-slate-400 font-mono font-bold">{r.latestDate}</td> <td className="px-5 py-3.5 text-right font-black font-mono text-slate-700">
                        Rs. {r.amountGiven.toLocaleString()}
                      </td> <td className="px-5 py-3.5 text-right font-black font-mono text-indigo-650 bg-indigo-50/20">
                        Rs. {r.remainingBalance.toLocaleString()}
                      </td> </tr>
                  ))
                ) : (
                  <tr> <td colSpan={5} className="px-5 py-12 text-center text-slate-400 italic">No drivers currently holding any active advances.</td> </tr>
                )}
              </tbody> </table> </div> </div>
      )}

      {/* =======================================================
          PAGE 3: PAYMENTS MADE
          ======================================================= */}
      {activeTab === 'p3' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"> <div> <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5"> <ArrowUpRight className="w-5 h-5 text-rose-600" /> Page 3: Physical Payments Made Logs
            </h2> <p className="text-xs text-slate-500 mt-1">Detailed history stream of administrative outgoings, fuel payouts, and labor salary settlements</p> </div>

          {/* Simple search and date filters */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4"> <div className="md:col-span-4 flex flex-col justify-center"> <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Search Payee Name</span> <div className="relative"> <input
                  type="text"
                  placeholder="e.g. PSO Petrol..."
                  value={p3Search}
                  onChange={(e) => setP3Search(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 outline-none focus:ring-1 focus:ring-indigo-505"
                /> <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" /> </div> </div> <div className="md:col-span-4 flex flex-col justify-center"> <span className="text-[9px] font-bold text-slate-400 uppercase">Custom Date Range (Start)</span> <input
                type="date"
                value={p3Start}
                onChange={(e) => setP3Start(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              /> </div> <div className="md:col-span-4 flex flex-col justify-center"> <span className="text-[9px] font-bold text-slate-400 uppercase">Custom Date Range (End)</span> <input
                type="date"
                value={p3End}
                onChange={(e) => setP3End(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              /> </div> </div>

          {/* Payments list table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200"> <table className="w-full text-left min-w-[750px]"> <thead className="bg-slate-50 border-b border-slate-200"> <tr className="text-slate-500 text-[10px] uppercase font-bold tracking-wider"> <th className="px-5 py-3">Payout Date</th> <th className="px-5 py-3">Recipient Payee Name</th> <th className="px-5 py-3">Expense Category</th> <th className="px-5 py-3">Disbursed Channel</th> <th className="px-5 py-3">Descriptive Audit Particulars</th> <th className="px-5 py-3 text-right">Disbursed Amount</th> </tr> </thead> <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paymentsMadeList.length > 0 ? (
                  paymentsMadeList.map(pay => (
                    <tr key={pay.id} className="hover:bg-slate-50/40 transition-colors"> <td className="px-5 py-3 font-mono font-bold text-slate-400 whitespace-nowrap">{pay.date}</td> <td className="px-5 py-3 font-bold text-slate-800 whitespace-nowrap">{pay.payee}</td> <td className="px-5 py-3 whitespace-nowrap"> <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 uppercase tracking-widest text-slate-600">
                          {pay.category}
                        </span> </td> <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{pay.method}</td> <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{pay.note}</td> <td className="px-5 py-3 text-right font-black font-mono text-rose-650">
                        Rs. {pay.amount.toLocaleString()}
                      </td> </tr>
                  ))
                ) : (
                  <tr> <td colSpan={6} className="px-5 py-12 text-center text-slate-400 italic">No matching payments released in this time bounds.</td> </tr>
                )}
              </tbody> </table> </div> </div>
      )}

      {/* =======================================================
          PAGE 4: MASTER FINANCIAL SUMMARY
          ======================================================= */}
      {activeTab === 'p4' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"> <div> <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5"> <Calculator className="w-5 h-5 text-indigo-600" /> Page 4: Master Financial Summary
            </h2> <p className="text-xs text-slate-500 mt-1">Consolidated all-time corporate revenues and released expenditure outflows</p> </div> <div className="grid grid-cols-1 md:grid-cols-4 gap-5"> <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-150"> <span className="text-[10px] font-black text-emerald-800 uppercase block">Trade Sales Revenue</span> <span className="text-2xl font-black text-emerald-950 font-mono block mt-1">Rs. {masterSummary.revenueFromMilk.toLocaleString()}</span> <p className="text-[9px] text-emerald-600 mt-2 font-medium">Revenues from outbound milk sold</p> </div> <div className="bg-blue-50 rounded-xl p-5 border border-blue-150"> <span className="text-[10px] font-black text-blue-800 uppercase block">Farmer Milk Cost</span> <span className="text-2xl font-black text-blue-950 font-mono block mt-1">Rs. {masterSummary.costOfMilkPurchased.toLocaleString()}</span> <p className="text-[9px] text-blue-600 mt-2 font-medium">Total purchased milk value</p> </div> <div className="bg-amber-50 rounded-xl p-5 border border-amber-150"> <span className="text-[10px] font-black text-amber-800 uppercase block">Routine Admin Expenses</span> <span className="text-2xl font-black text-amber-950 font-mono block mt-1">Rs. {masterSummary.generalExpenses.toLocaleString()}</span> <p className="text-[9px] text-amber-600 mt-2 font-medium">Fuels, bills, rent, and office assets</p> </div> <div className="bg-purple-50 rounded-xl p-5 border border-purple-150"> <span className="text-[10px] font-black text-purple-800 uppercase block">Driver Advances release</span> <span className="text-2xl font-black text-purple-950 font-mono block mt-1">Rs. {masterSummary.driverAdvancesIssued.toLocaleString()}</span> <p className="text-[9px] text-purple-600 mt-2 font-medium">Advances given as pocket pools</p> </div> </div>

          {/* Grand Balance Card */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-5"> <div> <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Ledger Master Balance Summary</span> <p className="text-3xl font-mono font-black text-indigo-200 mt-1">Rs. {masterSummary.netFinancialLedger.toLocaleString()}</p> <p className="text-[11px] text-slate-400 mt-1">Calculated as: (Milk revenue + Other Income) − (Purchased Milk cost + Admin Overheads + Driver custody advances issued)</p> </div> <div className="p-3 bg-slate-800 border-l-4 border-l-indigo-500 rounded-r-lg max-w-sm text-xs leading-relaxed text-slate-300 font-medium">
              We count released Driver Advances as immediate outflows in total expenditure, guaranteeing optimal fiscal cashflow visibility.
            </div> </div> </div>
      )}

      {/* =======================================================
          PAGE 5: PROFIT & LOSS
          ======================================================= */}
      {activeTab === 'p5' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"> <div className="flex items-center justify-between"> <div> <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5"> <TrendingUp className="w-5 h-5 text-indigo-600" /> Page 5: Profit & Loss Statement
            </h2> <p className="text-xs text-slate-500 mt-1">Dual-timeframe micro-audit showing today's earnings and cumulative monthly margins — data from backend ledger</p> </div>
            <button onClick={loadPnl} disabled={pnlLoading} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all flex-shrink-0">
              <RefreshCw className={`w-3.5 h-3.5 ${pnlLoading ? 'animate-spin' : ''}`} />
              {pnlLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Today's P&L */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-250 p-5 space-y-4"> <div className="border-b pb-2 flex items-center justify-between"> <span className="text-xs font-black uppercase text-slate-850 tracking-wider">Today's Profit & Loss</span> <span className="text-[10.5px] font-bold text-slate-400 font-mono">{todayStr}</span> </div> <div className="space-y-3 text-xs"> <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100"> <span className="text-slate-500 font-bold uppercase text-[9.5px]">purchased raw milk today</span> <div className="text-right"> <span className="font-extrabold text-slate-800 font-mono block">{pnlReports.today.purchasedLiters.toLocaleString()} L</span> <span className="font-semibold text-rose-600 font-mono text-[10.5px] block mt-0.5">Rs. {pnlReports.today.purchasedAmt.toLocaleString()}</span> </div> </div> <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100"> <span className="text-slate-500 font-bold uppercase text-[9.5px]">sold milk today</span> <div className="text-right"> <span className="font-extrabold text-slate-800 font-mono block">{pnlReports.today.soldLiters.toLocaleString()} L</span> <span className="font-semibold text-emerald-600 font-mono text-[10.5px] block mt-0.5">Rs. {pnlReports.today.soldAmt.toLocaleString()}</span> </div> </div> <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100"> <span className="text-slate-500 font-bold uppercase text-[9.5px]">Operating Expenditure Today</span> <div className="text-right font-semibold text-rose-600 font-mono">
                    - Rs. {pnlReports.today.expenditure.toLocaleString()}
                  </div> </div> <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl mt-4"> <span className="font-black uppercase text-[10.5px] text-indigo-200 tracking-wider">Today's Direct Fiscal margin</span> <span className={`text-base font-black font-mono ${pnlReports.today.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pnlReports.today.netProfit >= 0 ? '+' : ''} Rs. {pnlReports.today.netProfit.toLocaleString()}
                  </span> </div> </div> </div>

            {/* Monthly P&L */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-250 p-5 space-y-4"> <div className="border-b pb-2 flex items-center justify-between"> <span className="text-xs font-black uppercase text-indigo-900 tracking-wider">Monthly Profit & Loss</span> <span className="text-[10.5px] font-black text-indigo-650 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-lg">Mtd</span> </div> <div className="space-y-3 text-xs"> <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100"> <span className="text-slate-500 font-bold uppercase text-[9.5px]">purchased raw milk monthly</span> <div className="text-right"> <span className="font-extrabold text-slate-800 font-mono block">{pnlReports.monthly.purchasedLiters.toLocaleString()} L</span> <span className="font-semibold text-rose-600 font-mono text-[10.5px] block mt-0.5">Rs. {pnlReports.monthly.purchasedAmt.toLocaleString()}</span> </div> </div> <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100"> <span className="text-slate-500 font-bold uppercase text-[9.5px]">sold milk monthly</span> <div className="text-right"> <span className="font-extrabold text-slate-800 font-mono block">{pnlReports.monthly.soldLiters.toLocaleString()} L</span> <span className="font-semibold text-emerald-600 font-mono text-[10.5px] block mt-0.5">Rs. {pnlReports.monthly.soldAmt.toLocaleString()}</span> </div> </div> <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100"> <span className="text-slate-500 font-bold uppercase text-[9.5px]">Operating Expenditures monthly</span> <div className="text-right font-semibold text-rose-600 font-mono">
                    - Rs. {pnlReports.monthly.expenditure.toLocaleString()}
                  </div> </div> <div className="flex justify-between items-center bg-indigo-950 text-white p-4 rounded-xl mt-4"> <span className="font-black uppercase text-[10.5px] text-indigo-200 tracking-wider">Month's accumulated margin</span> <span className={`text-base font-black font-mono ${pnlReports.monthly.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pnlReports.monthly.netProfit >= 0 ? '+' : ''} Rs. {pnlReports.monthly.netProfit.toLocaleString()}
                  </span> </div> </div> </div> </div> <div className="p-4 bg-slate-900 border border-slate-750 rounded-2xl text-xs text-slate-300 leading-relaxed font-medium"> <span className="font-black text-indigo-300 block uppercase mb-1.5">Consensus formula on operational returns</span>
            Formula: Net Profit = Total Sale − (Total Purchase + Total Expenditure). P&L calculations automatically count driver advance release payments as expenditures while isolating dispatch shipping data structures.
          </div> </div>
      )}

    </div>
  );
}
