import React, { useState, useMemo } from 'react';
import { CreditCard, Search, Trash2, Calendar, DollarSign, Truck, TrendingUp, TrendingDown, X, Plus } from 'lucide-react';
import { useAccountContext } from '../../contexts/AccountContext';
import { useVehicleContext } from '../../contexts/VehicleContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageShell } from '../../components/ui/PageShell';
import { cn } from '../../lib/utils';

const CATEGORIES = ['Salary','Truck Maintenance','Utilities','Food','Income','Staff Income','Other Expenses','Miscellaneous'];

type Tab = 'history' | 'daily';

export default function ExpenseEntry() {
  const { accountRecords, addAccountRecord, deleteAccountRecord } = useAccountContext();
  const { user } = useAuth();
  const { vehicles } = useVehicleContext();

  const [tab, setTab] = useState<Tab>('history');
  const [form, setForm] = useState({
    category: 'Salary', method: 'Cash', payer: '', payee: '',
    amount: '', note: '', date: new Date().toISOString().split('T')[0], vehicleNumber: ''
  });
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('All');
  const [dateFilter,   setDateFilter]   = useState('');
  const [dailyDate,    setDailyDate]    = useState(new Date().toISOString().split('T')[0]);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category || !form.amount || !form.payer || !form.payee) {
      alert('Please fill all required fields.');
      return;
    }
    const type = ['Income','Staff Income'].includes(form.category) ? 'Income' : 'Expense';
    addAccountRecord({
      type, category: form.category, amount: parseFloat(form.amount),
      method: form.method, payer: form.payer, payee: form.payee,
      note: form.note, date: form.date,
      user: user?.fullName || 'Accountant',
      vehicleNumber: form.category === 'Truck Maintenance' ? form.vehicleNumber : undefined
    });
    setForm(f => ({ ...f, payer: '', payee: '', amount: '', note: '', vehicleNumber: '' }));
  }

  const sortedRecords = useMemo(() => {
    return accountRecords
      .slice()
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r, i) => ({ ...r, sn: i+1 }))
      .filter(r => {
        if (search && !r.payee.toLowerCase().includes(search.toLowerCase()) && !r.payer.toLowerCase().includes(search.toLowerCase())) return false;
        if (catFilter !== 'All' && r.category !== catFilter) return false;
        if (dateFilter && r.date !== dateFilter) return false;
        return true;
      })
      .reverse();
  }, [accountRecords, search, catFilter, dateFilter]);

  const dailyData = useMemo(() => {
    const recs = accountRecords.filter(r => r.date === dailyDate && r.type === 'Expense');
    const total = recs.reduce((s,r) => s+r.amount, 0);
    const byMethod = recs.reduce((acc, r) => { acc[r.method] = (acc[r.method]||0)+r.amount; return acc; }, {} as Record<string,number>);
    return { recs, total, byMethod };
  }, [accountRecords, dailyDate]);

  const totalExpense = useMemo(() => accountRecords.filter(r=>r.type==='Expense').reduce((s,r)=>s+r.amount,0), [accountRecords]);
  const totalIncome  = useMemo(() => accountRecords.filter(r=>r.type==='Income').reduce((s,r)=>s+r.amount,0),  [accountRecords]);

  return (
    <PageShell
      title="Daily Expenses"
      subtitle="Log payments, salaries, maintenance and other operational costs"
      icon={<CreditCard className="w-4.5 h-4.5" />}
    >
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3"> <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4 shadow-sm"> <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Total Expenses</p> <p className="text-xl font-black font-mono text-red-600">Rs. {totalExpense.toLocaleString()}</p> </div> <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4 shadow-sm"> <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Total Income</p> <p className="text-xl font-black font-mono text-emerald-600">Rs. {totalIncome.toLocaleString()}</p> </div> <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1"> <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Net Balance</p> <p className={cn('text-xl font-black font-mono', (totalIncome-totalExpense)>=0 ? 'text-emerald-600' : 'text-red-600')}>
            Rs. {(totalIncome-totalExpense).toLocaleString()}
          </p> </div> </div> <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Entry Form ── */}
        <div className="card overflow-hidden h-fit"> <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-alt)]"> <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5"> <Plus className="w-3.5 h-3.5 text-blue-500" /> Log Transaction
            </h2> </div> <form className="p-5 space-y-3.5" onSubmit={handleSubmit}> <div> <label className="form-label" htmlFor="exp-cat">Category</label> <select id="exp-cat" className="form-input mt-1" value={form.category} onChange={e=>setF('category',e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select> </div>
            {form.category === 'Truck Maintenance' && (
              <div> <label className="form-label flex items-center gap-1" htmlFor="exp-veh"> <Truck className="w-3 h-3" /> Vehicle
                </label> <select id="exp-veh" className="form-input mt-1" value={form.vehicleNumber} onChange={e=>setF('vehicleNumber',e.target.value)} required> <option value="">Select vehicle…</option>
                  {vehicles.map(v => <option key={v.id} value={v.vehicleNumber}>{v.vehicleNumber} — {v.name}</option>)}
                </select> </div>
            )}
            <div className="grid grid-cols-2 gap-3"> <div> <label className="form-label" htmlFor="exp-date">Date</label> <input id="exp-date" type="date" className="form-input mt-1" value={form.date} onChange={e=>setF('date',e.target.value)} required /> </div> <div> <label className="form-label" htmlFor="exp-method">Method</label> <select id="exp-method" className="form-input mt-1" value={form.method} onChange={e=>setF('method',e.target.value)}>
                  {['Cash','Bank Transfer','Cheque','JazzCash','EasyPaisa'].map(m => <option key={m}>{m}</option>)}
                </select> </div> </div> <div> <label className="form-label" htmlFor="exp-from">Paid From</label> <input id="exp-from" className="form-input mt-1" value={form.payer} onChange={e=>setF('payer',e.target.value)} placeholder="Company Cash / HBL Bank" required /> </div> <div> <label className="form-label" htmlFor="exp-to">Paid To</label> <input id="exp-to" className="form-input mt-1" value={form.payee} onChange={e=>setF('payee',e.target.value)} placeholder="Recipient name" required /> </div> <div> <label className="form-label" htmlFor="exp-amt">Amount (Rs.)</label> <input id="exp-amt" type="number" step="0.01" min="0" className="form-input mt-1 font-mono" value={form.amount} onChange={e=>setF('amount',e.target.value)} placeholder="0.00" required /> </div> <div> <label className="form-label" htmlFor="exp-note">Notes</label> <textarea id="exp-note" rows={2} className="form-input mt-1 resize-none" value={form.note} onChange={e=>setF('note',e.target.value)} placeholder="Description…" /> </div> <button type="submit" className="btn btn-primary w-full py-2.5 gap-2"> <CreditCard className="w-3.5 h-3.5" /> Log Entry
            </button> </form> </div>

        {/* ── History / Daily tabs ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tab bar */}
          <div className="flex bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl p-1">
            {(['history','daily'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('flex-1 py-2 rounded-lg text-xs font-bold transition-all',
                  tab === t
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]')}>
                {t === 'history' ? 'Payment History' : 'Daily Entries'}
              </button>
            ))}
          </div>

          {tab === 'history' ? (
            <>
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"> <div className="relative"> <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" /> <input type="search" placeholder="Search payee…" value={search} onChange={e=>setSearch(e.target.value)} className="form-input form-input-sm pl-8" /> </div> <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="form-input form-input-sm"> <option value="All">All Categories</option>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select> <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="form-input form-input-sm" /> </div> <p className="text-xs text-[var(--text-muted)]">{sortedRecords.length} record{sortedRecords.length!==1?'s':''} found</p> <div className="table-wrapper"> <div className="table-scroll"> <table className="data-table"> <thead> <tr> <th>#</th><th>Date</th><th>Category</th> <th>From</th><th>To</th><th>Method</th> <th className="text-right">Amount</th>
                        {user?.role==='Admin' && <th>Del</th>}
                      </tr> </thead> <tbody>
                      {sortedRecords.length === 0 ? (
                        <tr><td colSpan={user?.role==='Admin'?8:7} className="py-10 text-center text-[var(--text-muted)]">No records match your filters.</td></tr>
                      ) : sortedRecords.map(r => (
                        <tr key={r.id}> <td className="text-[var(--text-muted)] font-mono text-xs">#{r.sn}</td> <td className="font-mono text-xs text-[var(--text-secondary)]">{r.date}</td> <td> <div className="flex flex-col gap-0.5"> <span className={cn('badge text-[9px]',
                                r.type==='Income' ? 'badge-success' :
                                r.category==='Truck Maintenance' ? 'badge-warning' :
                                'badge-info')}>
                                {r.category}
                              </span>
                              {r.vehicleNumber && <span className="text-[9px] text-[var(--text-muted)] font-mono">{r.vehicleNumber}</span>}
                            </div> </td> <td className="text-xs text-[var(--text-secondary)] max-w-[100px] truncate">{r.payer}</td> <td className="text-xs font-semibold text-[var(--text-primary)] max-w-[100px] truncate">{r.payee}</td> <td className="text-xs text-[var(--text-muted)] font-mono">{r.method}</td> <td className={cn('text-right font-black font-mono', r.type==='Income'?'text-emerald-600':'text-red-600')}>
                            {r.type==='Income'?'+':'−'} Rs.{r.amount.toLocaleString()}
                          </td>
                          {user?.role==='Admin' && (
                            <td> <button onClick={()=>{ if(confirm('Delete this entry?')) deleteAccountRecord(r.id); }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-all" aria-label="Delete"> <Trash2 className="w-3.5 h-3.5" /> </button> </td>
                          )}
                        </tr>
                      ))}
                    </tbody> </table> </div> </div> </>
          ) : (
            <>
              {/* Daily picker */}
              <div className="flex items-center gap-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-4 py-3"> <Calendar className="w-4 h-4 text-[var(--text-muted)]" /> <label className="form-label mb-0">Date:</label> <input type="date" value={dailyDate} onChange={e=>setDailyDate(e.target.value)} className="form-input form-input-sm" /> </div> <div className="grid grid-cols-2 gap-3"> <div className="bg-red-50 border border-red-100 rounded-xl p-4"> <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Day Total Outflow</p> <p className="text-xl font-black font-mono text-red-700 mt-1">Rs. {dailyData.total.toLocaleString()}</p> <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{dailyData.recs.length} entries</p> </div> <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl p-4"> <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">By Payment Method</p> <div className="mt-1 space-y-0.5">
                    {Object.entries(dailyData.byMethod).length === 0
                      ? <p className="text-xs text-[var(--text-muted)] italic">No entries</p>
                      : Object.entries(dailyData.byMethod).map(([m,a]) => (
                          <div key={m} className="flex justify-between text-xs font-mono"> <span className="text-[var(--text-secondary)]">{m}</span> <strong className="text-[var(--text-primary)]">Rs.{a.toLocaleString()}</strong> </div>
                        ))
                    }
                  </div> </div> </div> <div className="table-wrapper"> <div className="table-scroll"> <table className="data-table"> <thead> <tr><th>Category</th><th>From</th><th>To</th><th>Method</th><th>Notes</th><th className="text-right">Amount</th>{user?.role==='Admin'&&<th>Del</th>}</tr> </thead> <tbody>
                      {dailyData.recs.length === 0 ? (
                        <tr><td colSpan={user?.role==='Admin'?7:6} className="py-10 text-center text-[var(--text-muted)]">No expenses on this date.</td></tr>
                      ) : dailyData.recs.map(r => (
                        <tr key={r.id}> <td className="font-semibold text-xs">{r.category}{r.vehicleNumber&&<span className="block font-mono text-[10px] text-[var(--text-muted)]">{r.vehicleNumber}</span>}</td> <td className="text-xs text-[var(--text-secondary)]">{r.payer}</td> <td className="text-xs font-semibold">{r.payee}</td> <td className="text-xs font-mono text-[var(--text-muted)]">{r.method}</td> <td className="text-xs text-[var(--text-muted)] max-w-[120px] truncate">{r.note}</td> <td className="text-right font-black font-mono text-red-600 text-xs">Rs.{r.amount.toLocaleString()}</td>
                          {user?.role==='Admin'&&(
                            <td><button onClick={()=>{ if(confirm('Delete?')) deleteAccountRecord(r.id); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-all" aria-label="Delete"> <Trash2 className="w-3.5 h-3.5"/></button></td>
                          )}
                        </tr>
                      ))}
                    </tbody> </table> </div> </div> </>
          )}
        </div> </div> </PageShell>
  );
}
