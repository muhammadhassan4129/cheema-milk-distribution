import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, Activity, Calendar, Archive,
  TrendingUp, TrendingDown, ArrowRight, Trash2, Truck,
  ShoppingCart, BarChart3, Layers, RefreshCw
} from 'lucide-react';
import { dashboardApi, isOnline } from '../../services/api';
import { useDispatchContext } from '../../contexts/DispatchContext';
import { cn } from '../../lib/utils';

// ── helpers ──────────────────────────────────────────────────────────────────
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmt(n: number) { return n.toLocaleString(); }
function fmtRs(n: number) { return `Rs. ${n.toLocaleString()}`; }

interface DashboardData {
  today: {
    purchase: { liters: number; amount: number; count: number };
    sale: { liters: number; amount: number; count: number };
    expenses: number;
    profit: number;
    stock: number;
  };
  thisMonth: {
    purchase: { liters: number; amount: number };
    sale: { liters: number; amount: number };
    profit: number;
  };
  operations: {
    pendingDispatches: number;
    activeRoutes: number;
    driverCount: number;
    vehicleCount: number;
  };
}

// ── KPI Card (accent-bordered stat) ─────────────────────────────────────────
interface KpiProps {
  label: string; primary: string; secondary?: string;
  note?: string; accent: string; icon: React.ReactNode;
  delay?: number; loading?: boolean;
}
function KpiCard({ label, primary, secondary, note, accent, icon, delay = 0, loading }: KpiProps) {
  return (
    <div
      className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] p-5 shadow-sm
                 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-slide-up flex flex-col gap-3"
      style={{ animationDelay: `${delay}ms`, borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
      </div>
      <div>
        {loading ? (
          <div className="h-8 w-24 bg-[var(--border)] rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-black font-mono tracking-tight text-[var(--text-primary)] leading-none">{primary}</p>
        )}
        {secondary && !loading && <p className="text-sm font-bold mt-1.5" style={{ color: accent }}>{secondary}</p>}
        {note && <p className="text-[11px] text-[var(--text-muted)] mt-1">{note}</p>}
      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[var(--text-muted)]">{icon}</span>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">{text}</p>
        {sub && <p className="text-[10px] text-[var(--text-muted)] opacity-70">{sub}</p>}
      </div>
    </div>
  );
}

const EMPTY_DATA: DashboardData = {
  today: { purchase: { liters: 0, amount: 0, count: 0 }, sale: { liters: 0, amount: 0, count: 0 }, expenses: 0, profit: 0, stock: 0 },
  thisMonth: { purchase: { liters: 0, amount: 0 }, sale: { liters: 0, amount: 0 }, profit: 0 },
  operations: { pendingDispatches: 0, activeRoutes: 0, driverCount: 0, vehicleCount: 0 },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { dispatches } = useDispatchContext();
  const todayStr = today();

  const [data, setData] = useState<DashboardData>(() => {
    try {
      const stored = localStorage.getItem('dairy_dashboard_data');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return EMPTY_DATA;
  });
  // Agar cache mein data hai toh loading false se shuru karo — delay nahi dikhega
  const [loading, setLoading] = useState(() => {
    try {
      const stored = localStorage.getItem('dairy_dashboard_data');
      return !stored; // cache hai toh false, nahi hai toh true
    } catch { return true; }
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStats = async () => {
    if (!isOnline()) {
      try {
        const stored = localStorage.getItem('dairy_dashboard_data');
        if (stored) setData(JSON.parse(stored));
      } catch (e) {}
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res: any = await dashboardApi.getSummary();
      if (res.success && res.data) {
        // ── CRITICAL FIX: Backend se aaya data check karo ──
        // Agar backend pe sales 0 hain lekin localStorage mein data hai
        // (matlab offline ke dauran save hua tha), toh cached data prefer karo
        const backendSaleL = res.data.today?.sale?.liters ?? 0;
        const backendPurchaseL = res.data.today?.purchase?.liters ?? 0;

        let cachedData: any = null;
        try {
          const stored = localStorage.getItem('dairy_dashboard_data');
          if (stored) cachedData = JSON.parse(stored);
        } catch (e) {}

        const cachedSaleL = cachedData?.today?.sale?.liters ?? 0;

        // Agar backend data mein sales 0 hain lekin cache mein data hai
        // toh cached data use karo (sync pending ho sakta hai)
        if (backendSaleL === 0 && cachedSaleL > 0 && backendPurchaseL > 0) {
          // Purchase match karta hai backend se, sirf sale missing hai — keep cache
          setData(cachedData);
        } else {
          setData(res.data);
          localStorage.setItem('dairy_dashboard_data', JSON.stringify(res.data));
          setLastUpdated(new Date());
        }

        // Always update non-zero backend data to cache
        if (backendSaleL > 0 || backendPurchaseL > 0) {
          localStorage.setItem('dairy_dashboard_data', JSON.stringify(res.data));
          setData(res.data);
          setLastUpdated(new Date());
        }
      }
    } catch (err) {
      console.warn('[AdminDashboard] Failed to load stats:', err);
      try {
        const stored = localStorage.getItem('dairy_dashboard_data');
        if (stored) setData(JSON.parse(stored));
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const handleLogin = () => loadStats();
    window.addEventListener('dairy-user-login', handleLogin);
    return () => window.removeEventListener('dairy-user-login', handleLogin);
  }, []);

  // Re-fetch when purchase/sale saved or reset
  useEffect(() => {
    const refresh = () => loadStats();
    window.addEventListener('dairy-reset', refresh);
    window.addEventListener('dairy-purchase-saved', refresh);
    window.addEventListener('dairy-sale-saved', refresh);
    return () => {
      window.removeEventListener('dairy-reset', refresh);
      window.removeEventListener('dairy-purchase-saved', refresh);
      window.removeEventListener('dairy-sale-saved', refresh);
    };
  }, []);

  const todayPurchL   = data.today.purchase.liters;
  const todayPurchRs  = data.today.purchase.amount;
  const todaySaleL    = data.today.sale.liters;
  const todaySaleRs   = data.today.sale.amount;
  const todayProfit   = data.today.profit;
  const todayStock    = data.today.stock;
  const todayExpRs    = data.today.expenses;
  const todayDispL    = dispatches.filter(d => d.date === todayStr).reduce((s, d) => s + d.liters, 0);

  const mPurchL   = data.thisMonth.purchase.liters;
  const mPurchRs  = data.thisMonth.purchase.amount;
  const mSaleL    = data.thisMonth.sale.liters;
  const mSaleRs   = data.thisMonth.sale.amount;
  const mProfit   = data.thisMonth.profit;
  const mStock    = mPurchL - mSaleL;

  const handleReset = () => {
    if (!window.confirm(' This will permanently delete ALL operational records.\n\nPurchases, sales, expenses, dispatches, advances — everything.\n\nThis cannot be undone. Continue?')) return;
    if (typeof (window as any).resetAllEntries === 'function') (window as any).resetAllEntries();
  };

  return (
    <div className="space-y-8 pb-12">

      {/* ── Hero header ── */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 rounded-2xl p-6 text-white overflow-hidden shadow-lg border border-slate-700/60">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-64 h-32 rounded-full bg-blue-600/10 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/80 rounded-xl flex items-center justify-center shadow-md">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Executive Dashboard</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Live operational metrics · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {lastUpdated && <span className="ml-2 text-slate-500">· Updated {lastUpdated.toLocaleTimeString()}</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button onClick={loadStats} disabled={loading} className="btn btn-sm bg-slate-700 border-slate-600 text-white hover:bg-slate-600 gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={handleReset} className="btn btn-danger btn-sm gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              Reset All
            </button>
            <button onClick={() => navigate('/admin/dispatch')} className="btn btn-sm bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 gap-1.5">
              Dispatches <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Today ── */}
      <section>
        <SectionLabel icon={<Calendar className="w-3.5 h-3.5"/>} text="Today's Metrics" sub="Live figures from database — same across all browsers" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard loading={loading} label="Today's Purchase"  primary={`${fmt(todayPurchL)} L`}  secondary={fmtRs(todayPurchRs)} note="Incoming raw milk"           accent="#3b82f6" icon={<Droplets className="w-4 h-4"/>}    delay={0}/>
          <KpiCard loading={loading} label="Today's Sales"     primary={`${fmt(todaySaleL)} L`}   secondary={fmtRs(todaySaleRs)}  note="Outbound commercial trade"    accent="#10b981" icon={<Activity className="w-4 h-4"/>}   delay={60}/>
          <KpiCard loading={loading} label="Remaining Stock"   primary={`${fmt(todayStock)} L`}   note="Purchase − Sales"          accent="#0ea5e9" icon={<Layers className="w-4 h-4"/>}    delay={120}/>
          <KpiCard loading={loading} label="Today's Dispatch"  primary={`${fmt(todayDispL)} L`}   note="Dispatched to customers"   accent="#a855f7" icon={<Truck className="w-4 h-4"/>}     delay={180}/>
        </div>
      </section>

      {/* ── P&L strip ── */}
      <div className={cn(
        'flex items-center justify-between gap-4 px-5 py-4 rounded-xl border text-sm font-semibold',
        todayProfit >= 0
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'
      )}>
        <div className="flex items-center gap-2">
          {todayProfit >= 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
          <span className="font-black text-xs uppercase tracking-wider">Today's Net Profit / Loss</span>
          <span className="text-xs opacity-60">(Sales − Purchase − Expenses)</span>
        </div>
        {loading ? <div className="h-6 w-24 bg-current opacity-20 rounded animate-pulse" /> : <span className="font-black font-mono text-base">{fmtRs(todayProfit)}</span>}
      </div>

      {/* ── Month ── */}
      <section>
        <SectionLabel icon={<Archive className="w-3.5 h-3.5"/>} text="Month-to-Date KPIs" sub="Cumulative figures since month start" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <KpiCard loading={loading} label="Monthly Purchase"  primary={`${fmt(mPurchL)} L`}  secondary={fmtRs(mPurchRs)} note="Accumulated milk receipts"   accent="#3b82f6" icon={<ShoppingCart className="w-4 h-4"/>} delay={0}/>
          <KpiCard loading={loading} label="Monthly Sales"     primary={`${fmt(mSaleL)} L`}   secondary={fmtRs(mSaleRs)}  note="Total commercial revenues"   accent="#10b981" icon={<Activity className="w-4 h-4"/>}    delay={60}/>
          <KpiCard loading={loading} label="Cumulative Stock"  primary={`${fmt(mStock)} L`}   note="Purchases − Sales MTD"  accent="#0ea5e9" icon={<Layers className="w-4 h-4"/>}          delay={120}/>
        </div>
      </section>

      {/* ── Monthly P&L strip ── */}
      <div className={cn(
        'flex items-center justify-between gap-4 px-5 py-4 rounded-xl border text-sm font-semibold',
        mProfit >= 0
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'
      )}>
        <div className="flex items-center gap-2">
          {mProfit >= 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
          <span className="font-black text-xs uppercase tracking-wider">Monthly Net Profit / Loss</span>
        </div>
        {loading ? <div className="h-6 w-24 bg-current opacity-20 rounded animate-pulse" /> : <span className="font-black font-mono text-base">{fmtRs(mProfit)}</span>}
      </div>

      {/* ── Operations row ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending Dispatches', value: data.operations.pendingDispatches, accent: '#f59e0b' },
            { label: 'Active Routes',      value: data.operations.activeRoutes,      accent: '#6366f1' },
            { label: 'Active Drivers',     value: data.operations.driverCount,       accent: '#10b981' },
            { label: 'Active Vehicles',    value: data.operations.vehicleCount,      accent: '#0ea5e9' },
          ].map(({ label, value, accent }) => (
            <div key={label} className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-4 text-center" style={{ borderTop: `2px solid ${accent}` }}>
              <p className="text-2xl font-black font-mono" style={{ color: accent }}>{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick nav ── */}
      <section>
        <SectionLabel icon={<ArrowRight className="w-3.5 h-3.5"/>} text="Quick Access" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label:'Farmer Purchases', href:'/admin/farmer-purchases', color:'blue'   },
            { label:'Milk Sales',       href:'/admin/sales',            color:'green'  },
            { label:'Dispatch Record',  href:'/admin/dispatch',         color:'purple' },
            { label:'Route Collection', href:'/admin/collections',      color:'sky'    },
            { label:'Purchase Ledger',  href:'/admin/purchase-ledger',  color:'indigo' },
            { label:'Sale Ledger',      href:'/admin/sale-ledger',      color:'teal'   },
            { label:'Profit & Loss',    href:'/admin/pnl',              color:'amber'  },
            { label:'Driver Advances',  href:'/admin/advances',         color:'rose'   },
          ].map(({ label, href, color }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]
                          text-sm font-semibold text-[var(--text-secondary)] hover:border-${color}-400 hover:text-${color}-600 hover:bg-${color}-50
                          transition-all duration-150 text-left`}
            >
              <span className="text-xs font-bold">{label}</span>
              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
