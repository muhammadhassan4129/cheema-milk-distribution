import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Calendar, TrendingDown, TrendingUp, CreditCard, RefreshCw } from 'lucide-react';
import { useAccountContext } from '../../contexts/AccountContext';
import { dashboardApi, ledgerApi, isOnline } from '../../services/api';

export default function FinancialOverview() {
  const { accountRecords } = useAccountContext();
  
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Backend se accurate data — same source as P&L page
  const [pnlData, setPnlData] = useState<{
    totalPurchaseAmt: number;
    totalSalesAmt: number;
    totalExpenseAmt: number;
    purchaseRecords: any[];
    saleRecords: any[];
  }>({
    totalPurchaseAmt: 0,
    totalSalesAmt: 0,
    totalExpenseAmt: 0,
    purchaseRecords: [],
    saleRecords: [],
  });
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!isOnline()) return;
    setLoading(true);
    try {
      // PnL summary for totals (same API as AdminPnL page)
      const [pnlRes, purchaseRes, saleRes] = await Promise.all([
        dashboardApi.getPnL({ startDate, endDate }) as any,
        ledgerApi.getPurchase({ startDate, endDate }) as any,
        ledgerApi.getSale({ startDate, endDate }) as any,
      ]);

      const summary = pnlRes?.data?.summary || {};
      const purchaseRecords = Array.isArray(purchaseRes?.data) ? purchaseRes.data : [];
      const saleRecords = Array.isArray(saleRes?.data) ? saleRes.data : [];

      setPnlData({
        totalPurchaseAmt: Math.round(summary.totalPurchase || 0),
        totalSalesAmt: Math.round(summary.totalSale || 0),
        totalExpenseAmt: Math.round(summary.totalExpense || 0),
        // 0 amount wali entries hide karo
        purchaseRecords: purchaseRecords.filter((p: any) => (p.totalAmount || 0) > 0 && (p.milkLiter || 0) > 0),
        saleRecords: saleRecords.filter((s: any) => (s.totalAmount || 0) > 0 && (s.milkLiter || 0) > 0),
      });
    } catch (err) {
      console.warn('[FinancialOverview] load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const { totalPurchaseAmt, totalSalesAmt, totalExpenseAmt, purchaseRecords, saleRecords } = pnlData;

  // Expenditures: backend se (same as P&L page — AccountRecord type=Expense)
  const totalExpenditures = totalExpenseAmt;

  // Other incomes from AccountContext (local only — income entries)
  const incomes = accountRecords.filter(r => r.type === 'Income' && r.date >= startDate && r.date <= endDate);
  const totalIncomeAmt = incomes.reduce((sum, r) => sum + r.amount, 0);

  const totalInflow = totalSalesAmt + totalIncomeAmt;
  const totalOutflow = totalPurchaseAmt + totalExpenditures;
  const remainingBalance = totalInflow - totalOutflow;

  return (
    <div className="space-y-6 max-w-5xl mx-auto"> <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200"> <div> <h1 className="text-2xl font-bold text-slate-800 flex items-center" id="accounts-title-header"> <DollarSign className="w-6 h-6 mr-2 text-indigo-500" />
            Accounts & Financial Overview
          </h1> <p className="text-slate-500 text-sm mt-1">View purchase details, sales details, and expenditures for any period.</p> </div> <div className="mt-4 sm:mt-0 flex gap-4 items-center flex-wrap"> <div className="flex items-center space-x-2"> <label className="text-sm font-semibold text-slate-700 flex items-center"> <Calendar className="w-4 h-4 mr-1 text-slate-400" /> From:
            </label> <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            /> </div> <div className="flex items-center space-x-2"> <label className="text-sm font-semibold text-slate-700 flex items-center"> <Calendar className="w-4 h-4 mr-1 text-slate-400" /> To:
            </label> <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            /> </div>
            <button onClick={loadData} disabled={loading} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-1.5 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div> </div> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6" id="summary-purchase-card"> <div className="flex items-center justify-between mb-4"> <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Purchases</h3> <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"> <TrendingDown className="w-5 h-5" /> </div> </div> <p className="text-3xl font-bold text-slate-800 font-mono">Rs. {totalPurchaseAmt.toLocaleString()}</p> <p className="text-xs text-slate-400 mt-2">Milk purchased in period</p> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6" id="summary-sales-card"> <div className="flex items-center justify-between mb-4"> <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Sales</h3> <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"> <TrendingUp className="w-5 h-5" /> </div> </div> <p className="text-3xl font-bold text-slate-800 font-mono">Rs. {totalSalesAmt.toLocaleString()}</p> <p className="text-xs text-slate-400 mt-2">Milk sold in period</p> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6" id="summary-gex-card"> <div className="flex items-center justify-between mb-4"> <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Expenditures</h3> <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center"> <CreditCard className="w-5 h-5" /> </div> </div> <p className="text-3xl font-bold text-slate-800 font-mono">Rs. {totalExpenditures.toLocaleString()}</p> <p className="text-xs text-slate-400 mt-2">General business expenses</p> </div> <div className={`bg-white rounded-xl shadow-sm border ${remainingBalance >= 0 ? 'border-emerald-200' : 'border-rose-200'} p-6`} id="summary-net-card"> <div className="flex items-center justify-between mb-4"> <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Net Balance</h3> <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${remainingBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}> <DollarSign className="w-5 h-5" /> </div> </div> <p className={`text-3xl font-bold font-mono ${remainingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {remainingBalance >= 0 ? '+' : ''}Rs. {remainingBalance.toLocaleString()}
          </p> <p className="text-xs text-slate-400 mt-2">Sales + Income - Purchases - Expenses</p> </div> </div>

      {/* Dynamic Detail Sections: Customer Purchase & Customer Sales Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="accounts-details-split-grid">
        {/* CUSTOMER (FARMER) PURCHASE DETAIL */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" id="customer-purchase-detail-card"> <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex justify-between items-center"> <div> <h2 className="text-base font-bold text-slate-800">Customer Purchase Detail</h2> <p className="text-xs text-slate-500">Farmers & suppliers purchased milk records</p> </div> <span className="bg-blue-105 bg-blue-50 text-blue-700 text-[11px] font-bold px-2 rounded-full font-mono">
              {purchaseRecords.length} Items
            </span> </div> <div className="p-4 flex-1"> <div className="overflow-x-auto max-h-[350px] overflow-y-auto"> <table className="w-full text-left border-collapse text-xs"> <thead> <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider"> <th className="px-3 py-2">Date</th> <th className="px-3 py-2">Supplier Party</th> <th className="px-3 py-2 text-right">Volume (L)</th> <th className="px-3 py-2 text-right">Fat / SNF</th> <th className="px-3 py-2 text-right">Amount (Rs)</th> </tr> </thead> <tbody className="divide-y divide-slate-100 text-slate-700">
                  {purchaseRecords.length > 0 ? (
                    purchaseRecords.map((p: any) => (
                      <tr key={p._id || p.id} className="hover:bg-slate-50/50 transition-colors"> <td className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">{p.date}</td> <td className="px-3 py-2.5 font-bold text-slate-800 truncate max-w-[120px]" title={p.supplierName}>{p.supplierName}</td> <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{(p.milkLiter || 0).toLocaleString()} L</td> <td className="px-3 py-2.5 text-right font-mono text-slate-500">{p.fat || '—'}% / {p.snf || '—'}%</td> <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">Rs. {Math.round(p.totalAmount || 0).toLocaleString()}</td> </tr>
                    ))
                  ) : (
                    <tr> <td colSpan={5} className="px-3 py-8 text-center text-slate-400 italic">
                        {loading ? 'Loading...' : 'No purchase records logged in this timeframe.'}
                      </td> </tr>
                  )}
                </tbody> </table> </div> </div> <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-right"> <span className="text-xs font-semibold text-slate-600">
              Total Outflow: <strong className="text-slate-800 font-mono font-black">Rs. {totalPurchaseAmt.toLocaleString()}</strong> </span> </div> </div>

        {/* CUSTOMER DISTRIBUTIONS SALES DETAIL */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" id="customer-sales-detail-card"> <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex justify-between items-center"> <div> <h2 className="text-base font-bold text-slate-800">Customer Sales Detail</h2> <p className="text-xs text-slate-500">Retailers & distributors sold milk records</p> </div> <span className="bg-emerald-105 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 rounded-full font-mono">
              {saleRecords.length} Items
            </span> </div> <div className="p-4 flex-1"> <div className="overflow-x-auto max-h-[350px] overflow-y-auto"> <table className="w-full text-left border-collapse text-xs"> <thead> <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider"> <th className="px-3 py-2">Date</th> <th className="px-3 py-2">Customer Party</th> <th className="px-3 py-2 text-right">Volume (L)</th> <th className="px-3 py-2 text-right">Fat / SNF</th> <th className="px-3 py-2 text-right">Amount (Rs)</th> </tr> </thead> <tbody className="divide-y divide-slate-100 text-slate-700">
                  {saleRecords.length > 0 ? (
                    saleRecords.map((s: any) => (
                      <tr key={s._id || s.id} className="hover:bg-slate-50/50 transition-colors"> <td className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">{s.date}</td> <td className="px-3 py-2.5 font-bold text-slate-800 truncate max-w-[120px]" title={s.customerName}>{s.customerName}</td> <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{(s.milkLiter || 0).toLocaleString()} L</td> <td className="px-3 py-2.5 text-right font-mono text-slate-500">{s.fat || '—'}% / {s.snf || '—'}%</td> <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">Rs. {Math.round(s.totalAmount || 0).toLocaleString()}</td> </tr>
                    ))
                  ) : (
                    <tr> <td colSpan={5} className="px-3 py-8 text-center text-slate-400 italic">
                        {loading ? 'Loading...' : 'No distribution sale records configured.'}
                      </td> </tr>
                  )}
                </tbody> </table> </div> </div> <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-right"> <span className="text-xs font-semibold text-slate-600">
              Total Inflow: <strong className="text-slate-800 font-mono font-black">Rs. {totalSalesAmt.toLocaleString()}</strong> </span> </div> </div> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"> <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between"> <h2 className="text-lg font-bold text-slate-800">Financial Breakdown ({startDate} to {endDate})</h2> </div> <div className="p-6"> <div className="space-y-4"> <div className="flex justify-between items-center py-2 border-b border-slate-100"> <span className="text-slate-600 font-medium">Milk Sales Inflow</span> <span className="text-emerald-600 font-bold font-mono">+Rs. {totalSalesAmt.toLocaleString()}</span> </div> <div className="flex justify-between items-center py-2 border-b border-slate-100"> <span className="text-slate-600 font-medium">Other Income Inflow</span> <span className="text-emerald-600 font-bold font-mono">+Rs. {totalIncomeAmt.toLocaleString()}</span> </div> <div className="flex justify-between items-center py-2 border-b border-slate-100"> <span className="text-slate-600 font-medium">Milk Purchases Outflow</span> <span className="text-rose-600 font-bold font-mono">-Rs. {totalPurchaseAmt.toLocaleString()}</span> </div> <div className="flex justify-between items-center py-2 border-b border-slate-100"> <span className="text-slate-600 font-medium">General Expenditures Outflow</span> <span className="text-rose-600 font-bold font-mono">-Rs. {totalExpenditures.toLocaleString()}</span> </div> <div className="flex justify-between items-center py-4 mt-4 bg-slate-50 rounded-lg px-4 border border-slate-200"> <span className="text-slate-800 font-bold uppercase tracking-wide">Net Change for Period</span> <span className={`text-xl font-bold font-mono ${remainingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {remainingBalance >= 0 ? '+' : ''}Rs. {remainingBalance.toLocaleString()}
              </span> </div> </div> </div> </div> </div>
  );
}
