import React, { useState, useMemo } from 'react';
import { DollarSign, Clock, Truck, TestTube, FileText, Search, Download } from 'lucide-react';
import { useLabContext } from '../../contexts/LabContext';
import { useAccountContext } from '../../contexts/AccountContext';

export default function ExpenseMonitor() {
  const [activeTab, setActiveTab] = useState<'account' | 'lab'>('account');
  const [filterPeriod, setFilterPeriod] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchUser, setSearchUser] = useState('');

  const todayDateStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const pastEightDays = new Date();
  pastEightDays.setDate(pastEightDays.getDate() - 8);
  const pastEightStr = pastEightDays.toISOString().split('T')[0];

  const { accountRecords } = useAccountContext();
  const accountReports = [
    { id: '1', type: 'Expense', category: 'Fuel', amount: 150.00, method: 'Cash', note: 'Truck DF-2023 refuel', payer: 'Company Acct', payee: 'Shell Station', date: todayDateStr, time: '09:30 AM', user: 'Sarah Acc', vehicleNumber: 'DF-2023' },
    { id: '2', type: 'Expense', category: 'Truck Maintenance', amount: 450.00, method: 'Bank', note: 'Truck repair', payer: 'Company Acct', payee: 'Auto Shop', date: yesterdayStr, time: '02:15 PM', user: 'Sarah Acc', vehicleNumber: 'DF-2024' },
    { id: '3', type: 'Income', category: 'Receipt', amount: 80.00, method: 'JazzCash', note: 'Sale of old supplies', payer: 'Local Vendor', payee: 'Company Acct', date: pastEightStr, time: '11:00 AM', user: 'Sarah Acc' },
    ...accountRecords
  ];

  const { labReports: labReportsContext } = useLabContext();
  const labReports = [
    { id: '1', batchNo: 'B-901', fat: 4.5, snf: 8.5, lr: 28, totalTs: 100.5, result: 'Passed', technician: 'Mike Lab', date: todayDateStr, time: '07:30 AM' },
    { id: '2', batchNo: 'B-902', fat: 4.2, snf: 8.3, lr: 27, totalTs: 95.2, result: 'Passed', technician: 'Mike Lab', date: yesterdayStr, time: '06:15 PM' },
    { id: '3', batchNo: 'B-903', fat: 3.8, snf: 8.1, lr: 26, totalTs: 88.4, result: 'Failed', technician: 'Ali Tech', date: pastEightStr, time: '02:00 PM' },
    ...labReportsContext,
  ];

  const filterRecords = (records: any[], userKey: string) => {
    let filtered = records;

    // Filter by Date Period
    if (filterPeriod !== 'All Time') {
      const todayDate = new Date();
      todayDate.setHours(0,0,0,0);
      
      if (filterPeriod === 'Today') {
        filtered = filtered.filter(r => r.date === todayDateStr);
      } else if (filterPeriod === 'Yesterday') {
        filtered = filtered.filter(r => r.date === yesterdayStr);
      } else if (filterPeriod === 'Last 3 Days') {
        const past = new Date(todayDate);
        past.setDate(past.getDate() - 3);
        filtered = filtered.filter(r => new Date(r.date) >= past);
      } else if (filterPeriod === 'Last 7 Days') {
        const past = new Date(todayDate);
        past.setDate(past.getDate() - 7);
        filtered = filtered.filter(r => new Date(r.date) >= past);
      } else if (filterPeriod === 'Last 30 Days') {
        const past = new Date(todayDate);
        past.setDate(past.getDate() - 30);
        filtered = filtered.filter(r => new Date(r.date) >= past);
      } else if (filterPeriod === 'Custom Date Range') {
        if (startDate) {
          filtered = filtered.filter(r => new Date(r.date) >= new Date(startDate));
        }
        if (endDate) {
          filtered = filtered.filter(r => new Date(r.date) <= new Date(endDate));
        }
      }
    }

    // Filter by User Search
    if (searchUser.trim() !== '') {
      const search = searchUser.toLowerCase();
      filtered = filtered.filter(r => r[userKey] && r[userKey].toLowerCase().includes(search));
    }

    return filtered;
  };

  const filteredAccountReports = useMemo(() => filterRecords(accountReports, 'user'), [filterPeriod, startDate, endDate, searchUser]);
  const filteredLabReports = useMemo(() => filterRecords(labReports, 'technician'), [filterPeriod, startDate, endDate, searchUser]);

  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeTab === 'account') {
      csvContent += "Date,Time,Accountant,Type,Category,Amount,Payer,Payee,Method,Note\n";
      filteredAccountReports.forEach(r => {
        csvContent += `${r.date},${r.time},${r.user},${r.type},${r.category},${r.amount},${r.payer},${r.payee},${r.method},${r.note}\n`;
      });
    } else if (activeTab === 'lab') {
      csvContent += "Date,Time,Technician,Batch No,Fat %,SNF %,LR,Result\n";
      filteredLabReports.forEach(r => {
        csvContent += `${r.date},${r.time},${r.technician},${r.batchNo},${r.fat},${r.snf},${r.lr},${r.result}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_reports.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 flex flex-col h-full"> <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"> <h1 className="text-xl font-bold text-slate-800">Expenses & Inventory Reports</h1> <div className="flex flex-wrap items-center gap-3 w-full md:w-auto"> <div className="relative"> <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /> <input 
              type="text" 
              placeholder="Search by User Name..." 
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 w-full md:w-64"
            /> </div> <select 
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          > <option value="All Time">All Time</option> <option value="Today">Today (1 Day)</option> <option value="Yesterday">Yesterday</option> <option value="Last 3 Days">Last 3 Days</option> <option value="Last 7 Days">Last 7 Days</option> <option value="Last 30 Days">Last 30 Days</option> <option value="Custom Date Range">Custom Date</option> </select>

          {filterPeriod === 'Custom Date Range' && (
            <div className="flex items-center gap-2"> <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 font-medium w-32"
              /> <span className="text-slate-400 font-medium text-sm">to</span> <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 font-medium w-32"
              /> </div>
          )}

          <button 
            onClick={handleExport}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md transition-colors flex items-center gap-1.5"
          > <Download className="w-3.5 h-3.5" /> <span>Export to Excel</span> </button> </div> </div> <div className="flex border-b border-slate-200 space-x-6"> <button 
          onClick={() => setActiveTab('account')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'account' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        > <DollarSign className="w-4 h-4" /> Account Reports
        </button> <button 
          onClick={() => setActiveTab('lab')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'lab' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        > <TestTube className="w-4 h-4" /> Lab Reports
        </button> </div> <div className="grid grid-cols-1 gap-6">
        {activeTab === 'account' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse"> <thead> <tr className="bg-slate-50 border-b border-slate-200"> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Date & Time</th> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Accountant Name</th> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Type / Category</th> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Parties (Payer → Payee)</th> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Details</th> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500 text-right">Amount</th> </tr> </thead> <tbody className="divide-y divide-slate-100">
                  {filteredAccountReports.length > 0 ? filteredAccountReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50"> <td className="py-3 px-4 text-xs font-medium text-slate-700">{report.date} {report.time}</td> <td className="py-3 px-4 text-xs font-bold text-slate-700">{report.user}</td> <td className="py-3 px-4 text-xs"> <span className={`font-bold ${report.type === 'Income' ? 'text-green-700' : report.type === 'Expense' ? 'text-red-700' : 'text-slate-800'}`}>{report.type}</span> • <span className="text-slate-500">{report.category}</span>
                        {report.vehicleNumber && <div className="text-amber-800 text-[10px] font-mono mt-0.5">({report.vehicleNumber})</div>}
                      </td> <td className="py-3 px-4 text-xs text-slate-600"> <span className="font-semibold text-slate-700">{report.payer}</span> <span className="text-slate-400 mx-1">→</span> <span className="font-semibold text-slate-700">{report.payee}</span> </td> <td className="py-3 px-4 text-xs text-slate-600">
                        {report.note} <span className="text-slate-400">({report.method})</span> </td> <td className="py-3 px-4 text-sm font-bold text-slate-800 font-mono text-right">
                        ${report.amount.toFixed(2)}
                      </td> </tr>
                  )) : (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">No account reports found.</td></tr>
                  )}
                </tbody> </table> </div> </div>
        )}

        {activeTab === 'lab' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse"> <thead> <tr className="bg-slate-50 border-b border-slate-200"> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Date & Time</th> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Technician Name</th> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Batch No</th> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Quality Metrics</th> <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-tight text-slate-500">Status</th> </tr> </thead> <tbody className="divide-y divide-slate-100">
                  {filteredLabReports.length > 0 ? filteredLabReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50"> <td className="py-3 px-4 text-xs font-medium text-slate-700">{report.date} {report.time}</td> <td className="py-3 px-4 text-xs font-bold text-slate-700">{report.technician}</td> <td className="py-3 px-4 text-xs font-bold text-slate-800">{report.batchNo}</td> <td className="py-3 px-4 text-xs text-slate-600">
                        Fat: <span className="font-semibold">{report.fat}%</span> • SNF: <span className="font-semibold">{report.snf}%</span> • LR: <span className="font-semibold">{report.lr}</span> • Total TS: <span className="font-semibold">{report.totalTs || '-'}</span> </td> <td className="py-3 px-4"> <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${report.result === 'Passed' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                          {report.result.toUpperCase()}
                        </span> </td> </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-500">No lab reports found.</td></tr>
                  )}
                </tbody> </table> </div> </div>
        )}
      </div> </div>
  );
}

