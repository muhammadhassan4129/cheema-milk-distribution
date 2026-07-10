import React, { useState } from 'react';
import { useRouteContext } from '../../contexts/RouteContext';
import { useUserContext } from '../../contexts/UserContext';
import { routesApi } from '../../services/api';
import {
  MapPin, Plus, Trash2, Edit, Navigation, UserCheck, X, ChevronRight
} from 'lucide-react';
import { Route } from '../../types';

/* ─── small helpers ─────────────────────────────────────────────── */
const emptyForm = (): Omit<Route, 'id'> => ({
  name: '', stops: [], length: '', travelTime: '', cost: 0,
  tankerNumber: '', mtName: '', assignedMilkTesterIds: [],
});

export default function RouteManagement() {
  const { routes, addRoute, updateRoute, deleteRoute } = useRouteContext();
  const { users } = useUserContext();

  const milkTesters = users.filter(u => u.role === 'MilkTester' && u.status === 'Active');

  /* modal open/close */
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* form state */
  const [form, setForm] = useState<Omit<Route, 'id'>>(emptyForm());
  const [customers, setCustomers] = useState<string[]>(['', '', '', '', '']);
  const [error, setError] = useState('');

  /* ── open helpers ───────────────────────────────────────────── */
  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setCustomers(['', '', '', '', '']);
    setError('');
    setShowModal(true);
  }

  function openEdit(route: Route) {
    setEditingId(route.id);
    setForm({
      name: route.name, stops: route.stops,
      length: route.length, travelTime: route.travelTime, cost: route.cost,
      tankerNumber: route.tankerNumber || '', mtName: route.mtName || '',
      assignedMilkTesterIds: route.assignedMilkTesterIds || [],
    });
    const names = route.stops.map(s => s.name);
    // pad to at least 5 rows
    while (names.length < 5) names.push('');
    setCustomers(names);
    setError('');
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditingId(null); }

  /* ── customer row helpers ───────────────────────────────────── */
  function setCustomerAt(idx: number, val: string) {
    setCustomers(prev => { const n = [...prev]; n[idx] = val; return n; });
  }
  function addCustomerRow() {
    setCustomers(prev => [...prev, '']);
  }
  function removeCustomerRow(idx: number) {
    setCustomers(prev => prev.length <= 1 ? [''] : prev.filter((_, i) => i !== idx));
  }

  /* ── milk tester toggle ─────────────────────────────────────── */
  function toggleTester(id: string) {
    setForm(prev => {
      const cur = prev.assignedMilkTesterIds || [];
      return {
        ...prev,
        assignedMilkTesterIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id],
      };
    });
  }

  /* ── save ───────────────────────────────────────────────────── */
  async function save() {
    setError('');
    if (!form.name.trim()) { setError('Route Name is required.'); return; }
    if (!form.tankerNumber?.trim()) { setError('Trunk Name is required.'); return; }
    if (!form.mtName?.trim()) { setError('Milk Tester Name is required.'); return; }

    const stops = customers
      .map(n => n.trim()).filter(Boolean)
      .map((name, i) => ({ id: `${Date.now()}-${i}`, name }));

    if (stops.length === 0) { setError('Add at least one customer name.'); return; }

    const testerIds = form.assignedMilkTesterIds || [];
    const payload = { ...form, stops, assignedMilkTesterIds: testerIds };

    if (editingId) {
      // PUT full update including assignedMilkTesterIds in one call
      try {
        const res: any = await routesApi.update(editingId, payload);
        if (res.success && res.data) {
          // Refresh local state from backend response
          updateRoute(editingId, payload);
        }
      } catch {
        updateRoute(editingId, payload);
      }
    } else {
      // POST - create route with assignedMilkTesterIds in body
      addRoute(payload);
    }
    closeModal();
  }

  /* ── helper: tester name by id ──────────────────────────────── */
  const testerName = (id: string) => users.find(u => u.id === id)?.fullName ?? id;

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5 tracking-tight">
          <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
          <span className="whitespace-nowrap">Route Management</span>
        </h2>

        <button
          onClick={openNew}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition-colors text-xs sm:text-sm whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>Create New Route</span>
        </button>
      </div>

      {/* ── Route cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {routes.map(route => (
          <div key={route.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* card header */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <span className="truncate">{route.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  🚛 <span className="font-mono font-semibold">{route.tankerNumber || '—'}</span>
                  &nbsp;·&nbsp;👤 {route.mtName || '—'}
                </p>
                {(route.assignedMilkTesterIds || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(route.assignedMilkTesterIds || []).map(id => (
                      <span key={id} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        <UserCheck className="w-2.5 h-2.5" />{testerName(id)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 ml-3 flex-shrink-0">
                <button onClick={() => openEdit(route)}
                  className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => deleteRoute(route.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* stop list */}
            <div className="p-4">
              {route.stops.length === 0
                ? <p className="text-sm text-slate-400 italic">No customers added.</p>
                : (
                  <ol className="space-y-1">
                    {route.stops.map((stop, idx) => (
                      <li key={stop.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center text-[9px] font-black text-indigo-700 flex-shrink-0">
                          {idx + 1}
                        </span>
                        {stop.name}
                      </li>
                    ))}
                  </ol>
                )
              }
            </div>
          </div>
        ))}

        {routes.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-slate-300">
            <Navigation className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">No routes yet.</p>
            <p className="text-slate-400 text-sm mt-1">Click "Create New Route" to get started.</p>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          ── MODAL: Create / Edit Route Template ──
          ════════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">

            {/* ── Modal Header ── */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800 leading-tight">
                  {editingId ? 'Edit Route Template' : 'Create New Route Template'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define custom route names and prefill customer names
                </p>
              </div>
              <button onClick={closeModal} aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex-shrink-0 ml-4">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              {/* ── Top 3 fields ── */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Route Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Route 11 – Sialkot"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Trunk Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.tankerNumber}
                    onChange={e => setForm(p => ({ ...p, tankerNumber: e.target.value }))}
                    placeholder="e.g. TNK-123"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Milk Tester Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.mtName}
                    onChange={e => setForm(p => ({ ...p, mtName: e.target.value }))}
                    placeholder="e.g. Ali Ahmed"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* ── Customer Names section ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Customer Names</label>
                  <button
                    type="button"
                    onClick={addCustomerRow}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Customer
                  </button>
                </div>

                {/* Customer rows */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {customers.map((name, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 px-4 py-2.5 ${idx < customers.length - 1 ? 'border-b border-slate-100' : ''
                        } hover:bg-slate-50/60 transition-colors`}
                    >
                      {/* Row number */}
                      <span className="w-6 text-xs font-bold text-slate-400 text-right flex-shrink-0 select-none">
                        {idx + 1}.
                      </span>

                      {/* Input */}
                      <input
                        type="text"
                        value={name}
                        onChange={e => setCustomerAt(idx, e.target.value)}
                        placeholder={`Customer ${idx + 1} name`}
                        className="flex-1 text-sm text-slate-800 bg-transparent border-none outline-none placeholder-slate-300 py-0.5"
                      />

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeCustomerRow(idx)}
                        aria-label="Delete row"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400 mt-1.5 px-1">
                  Note: Empty lines are automatically excluded when saving.
                </p>
              </div>

              {/* ── Assign Milk Testers ── */}
              {milkTesters.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-500" />
                    Assign Milk Tester(s)
                    {(form.assignedMilkTesterIds || []).length > 0 && (
                      <span className="ml-1 bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        {(form.assignedMilkTesterIds || []).length}
                      </span>
                    )}
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {milkTesters.map(mt => {
                      const sel = (form.assignedMilkTesterIds || []).includes(mt.id);
                      return (
                        <label key={mt.id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors ${sel ? 'bg-indigo-50' : 'hover:bg-slate-50'
                            }`}>
                          <input type="checkbox" checked={sel} onChange={() => toggleTester(mt.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${sel ? 'text-indigo-800' : 'text-slate-700'}`}>
                              {mt.fullName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">@{mt.username}</p>
                          </div>
                          {sel && <span className="text-[10px] text-indigo-600 font-bold flex-shrink-0">✓ Assigned</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>{/* end scrollable body */}

            {/* ── Modal Footer ── */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
              >
                {editingId ? (
                  <><MapPin className="w-4 h-4" /> Save Changes</>
                ) : (
                  <><ChevronRight className="w-4 h-4" /> Save &amp; Apply Route</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
