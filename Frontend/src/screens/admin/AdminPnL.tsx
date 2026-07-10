import React, { useState, useEffect, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { dashboardApi, isOnline } from '../../services/api';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Calculator, Sliders, RefreshCw } from 'lucide-react';

export default function AdminPnL() {
  const [dateRange, setDateRange] = useState('7 Days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const [totals, setTotals] = useState({ Purchase: 0, Sales: 0, Expenses: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  const local = new Date();
  const todayStr = `${local.getFullYear()}-${String(local.getMonth()+1).padStart(2,'0')}-${String(local.getDate()).padStart(2,'0')}`;

  const getDateRange = useCallback(() => {
    let numDays = 7;
    if (dateRange === 'Today') numDays = 1;
    else if (dateRange === '3 Days') numDays = 3;
    else if (dateRange === '7 Days') numDays = 7;
    else if (dateRange === '1 Month') numDays = 30;
    else if (dateRange === 'Custom Date' && startDate && endDate) {
      return { sd: startDate, ed: endDate };
    }
    const ed = new Date();
    const sd = new Date();
    sd.setDate(sd.getDate() - (numDays - 1));
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { sd: fmt(sd), ed: fmt(ed) };
  }, [dateRange, startDate, endDate]);

  const loadData = useCallback(async () => {
    if (!isOnline()) return;
    setLoading(true);
    try {
      const { sd, ed } = getDateRange();
      const res: any = await dashboardApi.getPnL({ startDate: sd, endDate: ed });
      if (res.success && res.data) {
        const { chartData: cd, summary } = res.data;

        // Chart data format karo
        const formatted = (cd || []).map((d: any) => ({
          name: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: (dateRange === '7 Days' || dateRange === '3 Days' || dateRange === 'Today') ? 'short' : undefined,
            month: (dateRange === '1 Month' || dateRange === 'Custom Date') ? 'short' : undefined,
            day: 'numeric'
          }),
          Purchase: Math.round(d.purchase || 0),
          Sales: Math.round(d.sale || 0),
          Expenses: Math.round(d.expense || 0),
        }));

        setChartData(formatted);
        setTotals({
          Purchase: Math.round(summary?.totalPurchase || 0),
          Sales: Math.round(summary?.totalSale || 0),
          Expenses: Math.round(summary?.totalExpense || 0),
        });
      }
    } catch (err) {
      console.error('[AdminPnL] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const netProfit = totals.Sales - (totals.Purchase + totals.Expenses);
  const isLoss = netProfit < 0;

  const pieData = [
    { name: isLoss ? 'Net Loss' : 'Net Profit', value: Math.abs(netProfit) },
    { name: 'Purchases + Expenditures', value: totals.Purchase + totals.Expenses },
  ];
  const COLORS = [isLoss ? '#ef4444' : '#10b981', '#6366f1'];

  return (
    <div id="admin-pnl-pane" className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Executive Header */}
      <div className="bg-slate-900 p-6 rounded-2xl text-white border border-slate-800 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"> <div className="flex items-center gap-3"> <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"> <Calculator className="w-5 h-5 text-indigo-105" /> </div> <div> <h1 className="text-xl font-black font-sans tracking-tight">Executive Profit & Loss Analyser</h1> <p className="text-xs text-slate-400 mt-0.5">Dual visualization dashboard comparing trade revenues and operational overheads</p> </div> </div> <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto"> <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 border border-slate-750 bg-slate-800 rounded-lg text-xs font-black text-white outline-none focus:ring-1 focus:ring-indigo-505 cursor-pointer self-stretch sm:self-auto text-center"
          > <option value="Today">Today (1 Day)</option> <option value="3 Days">Last 3 Days</option> <option value="7 Days">Last 7 Days</option> <option value="1 Month">Last 1 Month</option> <option value="Custom Date">Custom Date Range</option> </select>

          {dateRange === 'Custom Date' && (
            <div className="flex items-center gap-1.5"> <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-700 bg-slate-800 rounded text-white"
              /> <span className="text-slate-400 text-xs font-bold font-mono">to</span> <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-700 bg-slate-800 rounded text-white"
              /> </div>
          )}
          <button onClick={loadData} disabled={loading} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div> </div>

      {/* Numerical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"> <div className="bg-white p-5 rounded-xl border border-slate-200"> <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total Purchases Cost</span> <p className="text-2xl font-black text-rose-700 font-mono block mt-1">Rs. {totals.Purchase.toLocaleString()}</p> <p className="text-[10px] text-slate-400 mt-1">Acquisitions from farmer route collections</p> </div> <div className="bg-white p-5 rounded-xl border border-slate-200"> <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total Sales Revenue</span> <p className="text-2xl font-black text-emerald-700 font-mono block mt-1">Rs. {totals.Sales.toLocaleString()}</p> <p className="text-[10px] text-slate-400 mt-1">Revenues generated on trade counters</p> </div> <div className="bg-white p-5 rounded-xl border border-slate-200"> <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider font-sans">Total Operating Expenditures</span> <p className="text-2xl font-black text-rose-500 font-mono block mt-1">Rs. {totals.Expenses.toLocaleString()}</p> <p className="text-[10px] text-slate-400 mt-1">Administrative overheads + Driver advances</p> </div> <div className={`p-5 rounded-xl border ${isLoss ? 'bg-rose-50/20 border-rose-200' : 'bg-emerald-50/20 border-emerald-200'}`}> <span className={`text-[9px] uppercase font-black block tracking-wider ${isLoss ? 'text-rose-800' : 'text-emerald-800'}`}>
            {isLoss ? 'Net Operating Loss' : 'Net Operating Profit'}
          </span> <p className={`text-2xl font-black font-mono block mt-1 ${isLoss ? 'text-rose-900' : 'text-emerald-900'}`}>
            Rs. {Math.abs(netProfit).toLocaleString()}
          </p> <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            {isLoss ? <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> : <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
            Formula: S − (P + Exp)
          </p> </div> </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart Panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-xs"> <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between"> <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Line Items Balance Comparison Chart</h3> <span className="text-[10px] font-bold text-slate-400">Rs. currency scale</span> </div> <div className="p-4 h-80 w-full"> <ResponsiveContainer width="100%" height="100%"> <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} /> <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} /> <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs.${v}`} /> <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }} /> <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} /> <Bar dataKey="Purchase" fill="#c084fc" name="Raw purchases" radius={[4, 4, 0, 0]} maxBarSize={25} /> <Bar dataKey="Sales" fill="#10b981" name="Outbound revenue" radius={[4, 4, 0, 0]} maxBarSize={25} /> <Bar dataKey="Expenses" fill="#f43f5e" name="Operating Outlays" radius={[4, 4, 0, 0]} maxBarSize={25} /> </BarChart> </ResponsiveContainer> </div> </div>

        {/* Pie Distribution Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-xs"> <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between"> <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Gross Worth Allocation</h3> </div> <div className="p-4 flex-1 w-full flex flex-col items-center justify-center relative"> <div className="h-60 w-full"> <ResponsiveContainer width="100%" height="100%"> <PieChart> <Pie
                    data={pieData}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie> <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }} /> <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} /> </PieChart> </ResponsiveContainer> </div> </div> </div> </div>

      {/* Disclaimer on drivers */}
      <div className="p-4.5 bg-indigo-50 border border-indigo-150 rounded-2xl text-xs text-indigo-850 flex items-start gap-2.5"> <Sliders className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" /> <div> <span className="font-extrabold text-[10.5px] uppercase tracking-wider block">Operational Note on driver custody releasing</span> <p className="text-slate-655 mt-1 leading-relaxed">
            As standard system policy, released driver advances represent physical capital withdrawn from accounts, meaning they are categorized as immediate operating expenses. These calculations are fully separated from the dispatch records log system.
          </p> </div> </div> </div>
  );
}
