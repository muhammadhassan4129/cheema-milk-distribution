import React, { useState, useEffect } from 'react';
import { Droplets, Activity, Layers, TrendingUp, TrendingDown, ArrowRight, RefreshCw } from 'lucide-react';
import { dashboardApi, isOnline } from '../../services/api';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

function fmtRs(n: number) { return `Rs. ${n.toLocaleString()}`; }
function fmt(n: number) { return n.toLocaleString(); }

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

interface MetricRowProps { label: string; vol: number; amt: number; color: string; loading?: boolean; }
function MetricRow({ label, vol, amt, color, loading }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)]">
      <div>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{label}</p>
        {loading ? (
          <div className="h-5 w-24 bg-[var(--border)] rounded animate-pulse" />
        ) : (
          <p className="text-base font-black font-mono text-[var(--text-primary)]">{fmtRs(amt)}</p>
        )}
      </div>
      {loading ? (
        <div className="h-5 w-16 bg-[var(--border)] rounded animate-pulse" />
      ) : (
        <p className="text-sm font-bold font-mono" style={{ color }}>{fmt(vol)} L</p>
      )}
    </div>
  );
}

interface DashboardData {
  today: {
    purchase: { liters: number; amount: number };
    sale: { liters: number; amount: number };
    expenses: number;
    profit: number;
    stock: number;
  };
  thisMonth: {
    purchase: { liters: number; amount: number };
    sale: { liters: number; amount: number };
    profit: number;
  };
}

const EMPTY: DashboardData = {
  today: { purchase: { liters: 0, amount: 0 }, sale: { liters: 0, amount: 0 }, expenses: 0, profit: 0, stock: 0 },
  thisMonth: { purchase: { liters: 0, amount: 0 }, sale: { liters: 0, amount: 0 }, profit: 0 },
};

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(() => {
    try {
      const stored = localStorage.getItem('dairy_dashboard_data');
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return EMPTY;
  });
  // Agar cache mein data hai toh loading false se shuru karo — delay nahi dikhega
  const [loading, setLoading] = useState(() => {
    try {
      const stored = localStorage.getItem('dairy_dashboard_data');
      return !stored;
    } catch { return true; }
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStats = async () => {
    if (!isOnline()) {
      try {
        const stored = localStorage.getItem('dairy_dashboard_data');
        if (stored) setData(JSON.parse(stored));
      } catch (e) { }
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res: any = await dashboardApi.getSummary();
      if (res.success && res.data) {
        // ── CRITICAL FIX: Backend se aaya 0 data se cache overwrite mat karo ──
        const backendSaleL = res.data.today?.sale?.liters ?? 0;
        const backendPurchaseL = res.data.today?.purchase?.liters ?? 0;

        let cachedData: any = null;
        try {
          const stored = localStorage.getItem('dairy_dashboard_data');
          if (stored) cachedData = JSON.parse(stored);
        } catch (e) { }

        const cachedSaleL = cachedData?.today?.sale?.liters ?? 0;

        if (backendSaleL === 0 && cachedSaleL > 0 && backendPurchaseL > 0) {
          setData(cachedData);
        } else {
          setData(res.data);
          localStorage.setItem('dairy_dashboard_data', JSON.stringify(res.data));
          setLastUpdated(new Date());
        }

        if (backendSaleL > 0 || backendPurchaseL > 0) {
          localStorage.setItem('dairy_dashboard_data', JSON.stringify(res.data));
          setData(res.data);
          setLastUpdated(new Date());
        }
      }
    } catch (err) {
      console.warn('[AccountantDashboard] Failed to load stats:', err);
      try {
        const stored = localStorage.getItem('dairy_dashboard_data');
        if (stored) setData(JSON.parse(stored));
      } catch (e) { }
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

  const pTodayVol = data.today.purchase.liters;
  const pTodayAmt = data.today.purchase.amount;
  const pMonthVol = data.thisMonth.purchase.liters;
  const pMonthAmt = data.thisMonth.purchase.amount;
  const sTodayVol = data.today.sale.liters;
  const sTodayAmt = data.today.sale.amount;
  const sMonthVol = data.thisMonth.sale.liters;
  const sMonthAmt = data.thisMonth.sale.amount;

  const cumulStock = Math.max(0, pMonthVol - sMonthVol);

  const todayProfit = data.today.profit;
  const monthProfit = data.thisMonth.profit;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Accountant Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Operational summary · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {lastUpdated && <span className="ml-2 text-[var(--text-muted)] opacity-60">· Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadStats} disabled={loading} className="btn btn-secondary btn-sm gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              if (!window.confirm(' Reset ALL records? This cannot be undone.')) return;
              if (typeof (window as any).resetAllEntries === 'function') (window as any).resetAllEntries();
            }}
            className="btn btn-danger btn-sm gap-1.5"
          >
            Reset All Entries
          </button>
        </div>
      </div>

      {/* 3 main cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Purchase Card */}
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl p-5 shadow-sm border-t-4 border-t-blue-500 animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="font-black text-[var(--text-primary)]">Purchase</h2>
          </div>
          <div className="space-y-2.5">
            <MetricRow loading={loading} label="Today" vol={pTodayVol} amt={pTodayAmt} color="#3b82f6" />
            <MetricRow loading={loading} label="This Month" vol={pMonthVol} amt={pMonthAmt} color="#3b82f6" />
          </div>
          <button onClick={() => navigate('/accountant/farmer-purchases')} className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors py-1">
            View Purchases <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Sale Card */}
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl p-5 shadow-sm border-t-4 border-t-emerald-500 animate-slide-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="font-black text-[var(--text-primary)]">Sales</h2>
          </div>
          <div className="space-y-2.5">
            <MetricRow loading={loading} label="Today" vol={sTodayVol} amt={sTodayAmt} color="#10b981" />
            <MetricRow loading={loading} label="This Month" vol={sMonthVol} amt={sMonthAmt} color="#10b981" />
          </div>
          <button onClick={() => navigate('/accountant/sales')} className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors py-1">
            View Sales <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Stock Card */}
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl p-5 shadow-sm border-t-4 border-t-purple-500 animate-slide-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="font-black text-[var(--text-primary)]">Milk Stock</h2>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-purple-50 border border-purple-100">
              <div>
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">Month Stock</p>
                <p className="text-[10px] text-purple-400">All purchases − all sales</p>
              </div>
              {loading ? (
                <div className="h-8 w-20 bg-purple-200 rounded animate-pulse" />
              ) : (
                <p className="text-xl font-black font-mono text-purple-700">{fmt(cumulStock)} L</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Today', val: pTodayVol - sTodayVol },
                { label: 'Month', val: pMonthVol - sMonthVol },
              ].map(({ label, val }) => (
                <div key={label} className="py-2.5 px-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-center">
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{label}</p>
                  {loading ? (
                    <div className="h-5 w-12 bg-[var(--border)] rounded animate-pulse mx-auto mt-1" />
                  ) : (
                    <p className="text-sm font-black font-mono text-purple-600 mt-0.5">{fmt(val)} L</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* P&L strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "Today's P&L", profit: todayProfit },
          { label: "Monthly P&L", profit: monthProfit },
        ].map(({ label, profit }) => (
          <div key={label} className={cn(
            'flex items-center justify-between px-5 py-3.5 rounded-xl border text-sm font-semibold',
            profit >= 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}>
            <div className="flex items-center gap-2">
              {profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-xs font-black uppercase tracking-wider">{label}</span>
            </div>
            {loading ? <div className="h-5 w-20 bg-current opacity-20 rounded animate-pulse" /> : <span className="font-black font-mono">{fmtRs(profit)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
