import React, { useState, useMemo } from 'react';
import { Download, Filter, Droplets, ArrowUpRight, ArrowDownRight, Truck, Archive, Search, Calendar, ChevronRight, Scale } from 'lucide-react';
import { useAccountContext } from '../../contexts/AccountContext';
import { useMilkTransactionContext } from '../../contexts/MilkTransactionContext';

export default function AccountantReports() {
  const { accountRecords } = useAccountContext();
  const { records: milkRecords } = useMilkTransactionContext();
  
  // States for reporting filters
  const [filterType, setFilterType] = useState('All');
  const [daysFilter, setDaysFilter] = useState('All'); // 'All' | '1' | '2' | '10'
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Compute high accuracy volume metrics based on milk trades
  const totalPurchaseLiters = useMemo(() => {
    return milkRecords
      .filter(r => r.type === 'Purchase')
      .reduce((sum, r) => sum + r.vol, 0);
  }, [milkRecords]);

  const totalSalesLiters = useMemo(() => {
    return milkRecords
      .filter(r => r.type === 'Sale')
      .reduce((sum, r) => sum + r.vol, 0);
  }, [milkRecords]);

  const totalSalesKgs = useMemo(() => {
    return milkRecords
      .filter(r => r.type === 'Sale' && r.soldUnit === 'Kg')
      .reduce((sum, r) => sum + (r.soldQtyKg || 0), 0);
  }, [milkRecords]);

  const currentStock = useMemo(() => {
    const stock = totalPurchaseLiters - totalSalesLiters;
    return stock < 0 ? 0 : stock;
  }, [totalPurchaseLiters, totalSalesLiters]);

  // Map Milk Records to generic report type
  const mappedMilkRecords = useMemo(() => {
    return milkRecords
      .filter(rec => rec.type === 'Purchase' || rec.type === 'Sale')
      .map((rec, index) => ({
        id: rec.id,
        date: rec.date,
        type: rec.type as string,
        category: rec.type === 'Purchase' ? 'Purchased Milk' : 'Sold Milk',
        party: rec.partyName,
        paymentMethod: 'Cash Lock',
        liters: rec.vol,
        soldUnit: rec.soldUnit,
        soldQtyKg: rec.soldQtyKg,
        amount: rec.amount,
        details: rec.soldUnit === 'Kg'
          ? `Sold ${rec.soldQtyKg?.toFixed(2)} Kg originally`
          : `Fat: ${rec.fat}% | SNF: ${rec.snf}% | LR: ${rec.lr} | TS: ${rec.totalTs?.toFixed(2) || '—'} Kg`,
        isMilkOperation: true
      }));
  }, [milkRecords]);

  // Map other accounting records (Salary, Maintenance, Utilities, Other Payments, Other Additions)
  const mappedAccountRecords = useMemo(() => {
    return accountRecords.map(rec => ({
      id: rec.id,
      date: rec.date,
      type: rec.type, // 'Expense' | 'Income'
      category: rec.category, // e.g. Salary, Maintenance, Utilities
      party: rec.payee || rec.payer || '-',
      paymentMethod: rec.method || 'Cash',
      liters: rec.liters || 0,
      amount: rec.amount,
      details: rec.note || 'Other Accounting Activity',
      isMilkOperation: false
    }));
  }, [accountRecords]);

  // Combine both sources
  const allReportsCombined = useMemo(() => {
    return [...mappedMilkRecords, ...mappedAccountRecords];
  }, [mappedMilkRecords, mappedAccountRecords]);

  // Apply search query, category type filters, and duration logic (1, 2, or 10 days)
  const filteredReportsList = useMemo(() => {
    return allReportsCombined.filter(item => {
      // 1. Search Query filter (matches party, category, paymentMethod or details)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const partyMatch = item.party.toLowerCase().includes(query);
        const catMatch = item.category.toLowerCase().includes(query);
        const methodMatch = item.paymentMethod.toLowerCase().includes(query);
        const detailsMatch = item.details.toLowerCase().includes(query);
        if (!partyMatch && !catMatch && !methodMatch && !detailsMatch) {
          return false;
        }
      }

      // 2. Filter Type (Purchase, Sale, Other Activities)
      if (filterType !== 'All') {
        if (filterType === 'Purchase' && item.type !== 'Purchase') return false;
        if (filterType === 'Sale' && item.type !== 'Sale') return false;
        if (filterType === 'Other' && item.isMilkOperation) return false;
      }

      // 3. Days Filter for purchases (or also applying to general ledger items for flexibility)
      if (daysFilter !== 'All') {
        const days = parseInt(daysFilter, 10);
        const recordDate = new Date(item.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Safe today upper limit

        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days + 1);
        limitDate.setHours(0, 0, 0, 0); // Start of limit date day

        if (recordDate < limitDate || recordDate > today) {
          return false;
        }
      }

      // 4. Custom Date limit filters
      if (startDate !== '') {
        if (item.date < startDate) return false;
      }
      if (endDate !== '') {
        if (item.date > endDate) return false;
      }

      return true;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allReportsCombined, searchQuery, filterType, daysFilter, startDate, endDate]);

  const exportToCSV = () => {
    let headers = ["Date", "Operational Type", "Classification Category", "Party Counterparty", "Quantity (Liters)", "Amount (Rs)", "Payment Channel", "Particulars Checksum"];
    let rows = filteredReportsList.map(item => [
      item.date,
      item.type,
      item.category,
      item.party,
      item.liters || 0,
      item.amount,
      item.paymentMethod,
      item.details
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Accounting_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4"> <div> <h1 className="text-2xl font-black text-slate-800 flex items-center gap-1">
            History & Reporting Engine
          </h1> <p className="text-slate-500 text-xs mt-1">
            Accounts & Milk Operations (Sales, Purchases) and Core Corporate Payments Journal
          </p> </div> <div className="flex items-center gap-2 w-full md:w-auto"> <button 
            onClick={exportToCSV}
            className="flex items-center justify-center gap-1.5 border border-indigo-200 hover:bg-slate-50 text-indigo-700 font-extrabold px-4 py-2 rounded-xl transition-colors text-xs shadow-sm uppercase tracking-wide w-full md:w-auto cursor-pointer"
          > <Download className="w-3.5 h-3.5" /> <span>Export CSV</span> </button> </div> </div>

      {/* Corporate Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"> <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 flex-shrink-0"> <ArrowDownRight className="w-6 h-6" /> </div> <div> <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Purchased Milk</span> <span className="text-xl font-extrabold text-blue-800 block font-mono">{totalPurchaseLiters.toLocaleString()} L</span> </div> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"> <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 flex-shrink-0"> <ArrowUpRight className="w-6 h-6" /> </div> <div> <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sold Milk (Held as Sale)</span> <span className="text-xl font-extrabold text-emerald-800 block font-mono">{totalSalesLiters.toLocaleString()} L</span> </div> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"> <div className="w-12 h-12 bg-green-50 text-green-700 rounded-xl flex items-center justify-center border border-green-100 flex-shrink-0"> <Scale className="w-6 h-6" /> </div> <div> <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sold in Kilograms</span> <span className="text-xl font-extrabold text-green-800 block font-mono">{totalSalesKgs.toLocaleString()} Kg</span> </div> </div> <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-5 flex items-center gap-4 bg-indigo-50/20 hover:shadow-md transition-shadow"> <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"> <Archive className="w-6 h-6" /> </div> <div> <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Remaining Milk Stock</span> <span className="text-xl font-black text-indigo-950 block font-mono">{currentStock.toLocaleString()} L</span> </div> </div> </div>

      {/* Reconciliation Formula Breakdown Card */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 p-5 rounded-xl border border-indigo-100 shadow-sm space-y-3"> <h3 className="text-xs font-black text-indigo-850 uppercase tracking-wider flex items-center gap-2"> <Archive className="w-4 h-4 text-indigo-600" /> Milk Stock Reconciliation Analysis
        </h3> <p className="text-xs text-slate-655 leading-relaxed">
          The dairy physical flow metrics follow a strict conservation formula:
        </p> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1"> <div className="bg-white p-3 rounded-lg border border-slate-200"> <span className="text-[10px] font-bold text-slate-400 uppercase block">1. Total Purchases Amount</span> <span className="text-sm font-black text-slate-800 font-mono">{totalPurchaseLiters.toLocaleString()} L</span> <span className="text-[10px] text-slate-500 block mt-1">Raw incoming dairy volume</span> </div> <div className="bg-white p-3 rounded-lg border border-slate-200"> <span className="text-[10px] font-bold text-slate-400 uppercase block font-sans">2. Total Sold Milk</span> <span className="text-sm font-black text-indigo-950 font-mono">{totalSalesLiters.toLocaleString()} L</span> <span className="text-[10px] text-slate-500 block mt-1">Sold volume outflows</span> </div> <div className="bg-white p-3 rounded-lg border border-indigo-200 bg-indigo-50/10"> <span className="text-[10px] font-black text-indigo-700 uppercase block">3. The Remaining Milk In Stock</span> <span className="text-sm font-black text-indigo-700 font-mono">{currentStock.toLocaleString()} L</span> <span className="text-[10px] text-slate-500 block mt-1">Total Purchases minus Total Sold (1 − 2)</span> </div> </div> </div>

      {/* Filter Options with Duration and Days Limit */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4"> <div className="flex items-center gap-2 border-b border-slate-100 pb-2"> <Filter className="w-4 h-4 text-indigo-650" /> <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Report Filters & Query Configurator</h3> </div> <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* 1. Category operational filter */}
          <div className="space-y-1"> <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Classification</label> <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)} 
              className="w-full px-3 py-2 text-xs border border-slate-250 rounded-lg outline-none font-bold text-slate-705 cursor-pointer bg-slate-50"
            > <option value="All">All Operations & Payments</option> <option value="Purchase">Purchases (Milk Only)</option> <option value="Sale">Sales (Milk Only)</option> <option value="Other">Other Activities (Salaries, Maintenance, etc.)</option> </select> </div>

          {/* 2. Days Filter pill list / selection */}
          <div className="space-y-1"> <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Purchase Duration Limit</label> <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-250 rounded-lg outline-none font-extrabold text-indigo-700 cursor-pointer bg-indigo-50/50"
            > <option value="All">All Time Logs</option> <option value="1">1 Day (Today)</option> <option value="2">2 Days (Yesterday & Today)</option> <option value="10">10 Days Window</option> </select> </div>

          {/* 3. Text search query */}
          <div className="space-y-1 md:col-span-1 lg:col-span-2"> <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Search Query Name / Particulars</label> <div className="relative"> <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" /> <input
                type="text"
                placeholder="Search party name, payment method, fat/snf details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full border border-slate-250 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
              /> </div> </div>

          {/* 4. Date ranges */}
          <div className="space-y-1"> <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Custom Date Bounds</label> <div className="flex items-center gap-1"> <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded font-mono outline-none"
                placeholder="Start"
              /> <span className="text-slate-300">—</span> <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded font-mono outline-none"
                placeholder="End"
              /> </div> </div> </div>

        {/* Quick info duration header */}
        {daysFilter !== 'All' && (
          <div className="bg-indigo-50 border border-indigo-150 p-2.5 rounded-lg flex items-center gap-2"> <span className="text-[11px] font-bold text-indigo-800">
              Filtering specifically for records within the last {daysFilter} days.
            </span> </div>
        )}

      </div>

      {/* Big Master Report Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"> <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"> <h2 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
            Combined Operational & Accounting Report Ledger
          </h2> <span className="text-slate-500 text-xs font-semibold">
            Showing {filteredReportsList.length} filtered items
          </span> </div> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse min-w-[900px]"> <thead> <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-wider"> <th className="px-5 py-3">Date</th> <th className="px-5 py-3">Classification Type</th> <th className="px-5 py-3">Classification Category</th> <th className="px-5 py-3">Party Name / Counterparty</th> <th className="px-5 py-3">Payment Channel</th> <th className="px-5 py-3">Milk Quantity</th> <th className="px-5 py-3 text-right">Yield Amount</th> <th className="px-5 py-3">Operational Details / Particulars</th> </tr> </thead> <tbody className="divide-y divide-slate-150 text-slate-700 text-xs">
              {filteredReportsList.length > 0 ? (
                filteredReportsList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors"> <td className="px-5 py-4 font-bold text-slate-650 whitespace-nowrap">{item.date}</td> <td className="px-5 py-4 whitespace-nowrap"> <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                        item.type === 'Purchase' ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                        item.type === 'Sale' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                        item.type === 'Income' ? 'bg-teal-50 text-teal-800 border border-teal-100' :
                        'bg-rose-50 text-rose-800 border border-rose-100'
                      }`}>
                        {item.type}
                      </span> </td> <td className="px-5 py-4 whitespace-nowrap font-semibold"> <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        item.category === 'Salary' ? 'bg-emerald-50 text-emerald-700' :
                        item.category === 'Maintenance' ? 'bg-amber-50 text-amber-700' :
                        item.category === 'Utilities' ? 'bg-indigo-50 text-indigo-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.category}
                      </span> </td> <td className="px-5 py-4 font-extrabold text-slate-900 whitespace-nowrap">{item.party}</td> <td className="px-5 py-4 font-mono font-semibold text-slate-500 whitespace-nowrap">
                      {item.paymentMethod}
                    </td> <td className="px-5 py-4 font-bold text-slate-800 whitespace-nowrap">
                      {item.liters > 0 ? (
                        <div className="flex flex-col"> <span>{item.liters.toLocaleString()} L</span>
                          {(item as any).soldUnit === 'Kg' && (
                            <span className="text-[10px] text-green-700 font-bold block">
                              ({(item as any).soldQtyKg?.toLocaleString()} Kg)
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td> <td className={`px-5 py-4 font-black text-right whitespace-nowrap text-sm font-mono ${
                      item.type === 'Sale' || item.type === 'Income' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {item.type === 'Sale' || item.type === 'Income' ? '+' : '-'} Rs. {Math.round(item.amount).toLocaleString()}
                    </td> <td className="px-5 py-4 text-slate-550 max-w-xs truncate" title={item.details}>
                      {item.details}
                    </td> </tr>
                ))
              ) : (
                <tr> <td colSpan={8} className="px-5 py-16 text-center text-slate-400 italic font-medium">
                    No transactions or operations found matching selected filters.
                  </td> </tr>
              )}
            </tbody> </table> </div> </div> </div>
  );
}
