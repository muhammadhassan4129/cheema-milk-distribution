import React, { useState } from 'react';
import { useLabContext } from '../../contexts/LabContext';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Calendar, Download, Beaker, CheckCircle, AlertOctagon, TrendingUp, HelpCircle, Trash2 } from 'lucide-react';

export default function AdminLabReports() {
  const { labReports, deleteLabReport } = useLabContext();
  const { user } = useAuth();
  const [filterPeriod, setFilterPeriod] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const filteredLabReports = labReports.filter(report => {
    if (filterPeriod === 'All') return true;

    const local = new Date();
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, '0');
    const day = String(local.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const reportDateStr = report.date;

    const dTx = new Date(reportDateStr + 'T00:00:00');
    const dBench = new Date(todayStr + 'T00:00:00');
    const diffTime = dBench.getTime() - dTx.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (filterPeriod === '1-day') {
      return reportDateStr === todayStr;
    } else if (filterPeriod === '2-day') {
      return diffDays >= 0 && diffDays < 2;
    } else if (filterPeriod === '3-day') {
      return diffDays >= 0 && diffDays < 3;
    } else if (filterPeriod === '5-day') {
      return diffDays >= 0 && diffDays < 5;
    } else if (filterPeriod === 'custom') {
      let matches = true;
      if (customStartDate) {
        matches = matches && reportDateStr >= customStartDate;
      }
      if (customEndDate) {
        matches = matches && reportDateStr <= customEndDate;
      }
      return matches;
    }
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Cumulative computations
  const totalCheckedQty = filteredLabReports.reduce((sum, r) => sum + Number(r.quantity), 0);
  const totalPassed = filteredLabReports.filter(r => r.result.toLowerCase() === 'passed').length;
  const totalFailed = filteredLabReports.filter(r => r.result.toLowerCase() === 'failed').length;

  const avgFat = filteredLabReports.length > 0
    ? (filteredLabReports.reduce((sum, r) => sum + r.fat, 0) / filteredLabReports.length).toFixed(2)
    : '0.00';

  const avgSNF = filteredLabReports.length > 0
    ? (filteredLabReports.reduce((sum, r) => sum + r.snf, 0) / filteredLabReports.length).toFixed(2)
    : '0.00';

  const handleDownloadExcel = () => {
    const headers = ["Batch No", "Technician", "Supplier Name", "Quantity (Liters)", "Fat (%)", "SNF (%)", "LR", "TS (%)", "Total TS (Kg)", "Price/L (Rs)", "Total Payable (Rs)", "Result", "Date", "Time"];
    const rows = filteredLabReports.map(r => [
      r.batchNo,
      r.technician,
      r.supplierName,
      r.quantity,
      r.fat,
      r.snf,
      r.lr,
      r.ts,
      r.totalTs,
      r.pricePerLiter,
      r.totalPayable,
      r.result,
      r.date,
      r.time
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lab_Reports_${filterPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="lab-reports-view" className="space-y-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"> <div> <h1 className="text-2xl font-bold text-slate-800 flex items-center"> <Beaker className="w-6 h-6 mr-2 text-indigo-600" />
            Lab Test Reports
          </h1> <p className="text-slate-500 text-sm mt-1">Monitor daily milk safety and quality profiles (Fat, SNF, and LR test runs)</p> </div> <button
          onClick={handleDownloadExcel}
          disabled={filteredLabReports.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer h-max self-start md:self-auto"
        > <Download className="w-4 h-4" /> <span>Download Excel</span> </button> </div>

      {/* Lab Stats widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4"> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"> <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Samples</span> <span className="text-2xl font-black text-slate-800 leading-tight block mt-1">{filteredLabReports.length}</span> <span className="text-xs text-slate-500 block mt-0.5">Batches processed</span> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"> <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Checked Vol (Ltr)</span> <span className="text-2xl font-black text-slate-800 leading-tight block mt-1">{totalCheckedQty.toLocaleString()} L</span> <span className="text-xs text-indigo-500 block mt-0.5">Tested milk volume</span> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"> <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pass Rate</span> <span className="text-2xl font-black text-green-600 leading-tight block mt-1">
            {filteredLabReports.length > 0 ? ((totalPassed / filteredLabReports.length) * 100).toFixed(1) : '0'}%
          </span> <span className="text-xs text-slate-500 block mt-0.5">{totalPassed} Passed, {totalFailed} Failed</span> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"> <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Average Fat</span> <span className="text-2xl font-black text-indigo-600 leading-tight block mt-1">{avgFat}%</span> <span className="text-xs text-slate-500 block mt-0.5">{avgFat > '4.00' ? 'Healthy Fat Ratio' : 'Lower Fat Density'}</span> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"> <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Average SNF</span> <span className="text-2xl font-black text-indigo-500 leading-tight block mt-1">{avgSNF}%</span> <span className="text-xs text-slate-500 block mt-0.5">Solids-Not-Fat average</span> </div> </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"> <div className="flex flex-wrap items-center gap-4"> <div className="flex flex-col min-w-[200px]"> <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"> <Calendar className="w-3 h-3" /> Filter Period
            </label> <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-sm text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
            > <option value="All">All Time</option> <option value="1-day">1 Day (Today)</option> <option value="2-day">2 Days</option> <option value="3-day">3 Days</option> <option value="5-day">5 Days</option> <option value="custom">Custom Date Range</option> </select> </div>

          {filterPeriod === 'custom' && (
            <div className="flex items-center gap-3 pt-4"> <div className="flex flex-col"> <span className="text-[10px] font-bold text-slate-400 uppercase">From</span> <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                /> </div> <span className="text-slate-400 text-xs mt-3">to</span> <div className="flex flex-col"> <span className="text-[10px] font-bold text-slate-400 uppercase">To</span> <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                /> </div> </div>
          )}
        </div> </div>

      {/* Lab Reports table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"> <div className="px-6 py-4 border-b bg-slate-50"> <h2 className="font-bold text-slate-800 text-base">Quality Test Records</h2> </div> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse min-w-[1000px]"> <thead> <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200 uppercase font-semibold"> <th className="px-6 py-3">Batch No</th> <th className="px-6 py-3">Date / Time</th> <th className="px-6 py-3">Source Party</th> <th className="px-6 py-3">Quantity</th> <th className="px-6 py-3">Chemical Profile (Fat/SNF/LR)</th> <th className="px-6 py-3">Total TS (Kg)</th> <th className="px-6 py-3">Price / Liter</th> <th className="px-6 py-3">Total Payable</th> <th className="px-6 py-3">Result</th> <th className="px-6 py-3">Inspector</th> {user?.role === 'Admin' && <th className="px-6 py-3 text-center">Action</th>} </tr> </thead> <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {filteredLabReports.length > 0 ? filteredLabReports.map(report => (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors"> <td className="px-6 py-4 font-bold text-slate-900">{report.batchNo}</td> <td className="px-6 py-4 whitespace-nowrap"> <div>{report.date}</div> <div className="text-[10px] text-slate-400">{report.time}</div> </td> <td className="px-6 py-4 font-semibold text-slate-800">{report.supplierName}</td> <td className="px-6 py-4 whitespace-nowrap">{report.quantity.toLocaleString()} Liters</td> <td className="px-6 py-4 whitespace-nowrap"> <div className="flex gap-2 text-xs"> <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">Fat: {report.fat}%</span> <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">SNF: {report.snf}%</span> <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">LR: {report.lr}</span> </div> </td> <td className="px-6 py-4 font-mono font-semibold">{report.totalTs.toLocaleString()} Kg</td> <td className="px-6 py-4">Rs. {report.pricePerLiter.toFixed(1)}</td> <td className="px-6 py-4 font-bold text-slate-800">Rs. {report.totalPayable.toLocaleString()}</td> <td className="px-6 py-4 whitespace-nowrap"> <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      report.result.toLowerCase() === 'passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {report.result}
                    </span> </td> <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{report.technician}</td>
                  {user?.role === 'Admin' && (
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => { if (window.confirm(`Delete lab report for ${report.supplierName} (${report.date})?`)) deleteLabReport(report.id); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr> <td colSpan={10} className="px-6 py-12 text-center text-slate-500 italic">No quality reports logged for the current duration.</td> </tr>
              )}
            </tbody> </table> </div> </div> </div>
  );
}
