import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Power, PowerOff, Users, X, Shield, Navigation } from 'lucide-react';
import { useUserContext, User } from '../../contexts/UserContext';
import { useRouteContext } from '../../contexts/RouteContext';
import { routesApi } from '../../services/api';
import { cn } from '../../lib/utils';

type FormData = {
  fullName: string;
  username: string;
  phone: string;
  password: string;
  role: User['role'];
};

const EMPTY: FormData = { fullName: '', username: '', phone: '', password: '', role: 'MilkTester' };

const ROLES = [
  { value: 'Admin',       label: 'Admin',       color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'Accountant',  label: 'Accountant',  color: 'bg-blue-100 text-blue-700 border-blue-200'      },
  { value: 'MilkTester',  label: 'Milk Tester', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
] as const;

function roleStyle(role: string) {
  return ROLES.find(r => r.value === role)?.color ?? 'bg-slate-100 text-slate-600 border-slate-200';
}
function roleLabel(role: string) {
  return ROLES.find(r => r.value === role)?.label ?? role;
}

export default function UserManagement() {
  const { users, addUser, updateUser, deleteUser, toggleUserStatus } = useUserContext();
  const { routes, updateRoute } = useRouteContext();

  const [showModal,        setShowModal]        = useState(false);
  const [editingId,        setEditingId]        = useState<string | null>(null);
  const [search,           setSearch]           = useState('');
  const [form,             setForm]             = useState<FormData>(EMPTY);
  const [errors,           setErrors]           = useState<Partial<FormData>>({});
  const [assignedRouteIds, setAssignedRouteIds] = useState<string[]>([]);
  const [submitError,      setSubmitError]      = useState('');
  const [submitLoading,    setSubmitLoading]    = useState(false);

  const isMilkTester = form.role === 'MilkTester';

  const filtered = users.filter(u =>
    u.role !== 'Driver' && (
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
    )
  );

  function getAssignedRouteNames(userId: string) {
    return routes
      .filter(r => (r.assignedMilkTesterIds || []).includes(userId))
      .map(r => r.name);
  }

  function validate(): boolean {
    const e: Partial<FormData> = {};
    if (!form.fullName.trim())               e.fullName = 'Required';
    if (!form.username.trim())               e.username = 'Required';
    if (!form.password.trim())               e.password = 'Required';
    else if (form.password.trim().length < 6) e.password = 'Minimum 6 characters required';
    if (!form.phone.trim())                  e.phone    = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitLoading(true);

    try {
      if (editingId) {
        await new Promise<void>((resolve, reject) => {
          try { updateUser(editingId, form); resolve(); }
          catch (err: any) { reject(err); }
        });
        if (form.role === 'MilkTester') await applyRouteAssignments(editingId);
        closeModal();
      } else {
        const routesToAssign = form.role === 'MilkTester' ? [...assignedRouteIds] : [];

        // Direct API call — error clearly catch karo
        const { usersApi: uApi } = await import('../../services/api');
        const res: any = await uApi.create({ ...form, status: 'Active' });

        if (!res.success) {
          setSubmitError(res.message || 'User create nahi hua. Please try again.');
          setSubmitLoading(false);
          return;
        }

        // Context list mein add karo with real backend data
        const createdUser = {
          id: res.data._id,
          _id: res.data._id,
          fullName: res.data.fullName,
          username: res.data.username,
          phone: res.data.phone || '',
          role: res.data.role,
          status: res.data.status,
          cnic: res.data.cnic || '',
          openingBalance: res.data.openingBalance || 0,
          password: '', // password response mein nahi aata
        };
        addUser({ ...createdUser }, async () => {});

        // Route assignment
        if (routesToAssign.length > 0) {
          for (const route of routes) {
            if (routesToAssign.includes(route.id)) {
              const newTesters = [...(route.assignedMilkTesterIds || []), createdUser.id];
              try {
                await routesApi.assignTesters(route.id, newTesters);
                updateRoute(route.id, { assignedMilkTesterIds: newTesters });
              } catch (err) {
                console.error('Route assign failed:', err);
              }
            }
          }
        }

        closeModal();
      }
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function applyRouteAssignments(userId: string) {
    for (const route of routes) {
      const currentTesters  = route.assignedMilkTesterIds || [];
      const shouldAssign    = assignedRouteIds.includes(route.id);
      const isAssigned      = currentTesters.includes(userId);

      if (shouldAssign === isAssigned) continue; // no change needed

      // Deduplicate: remove userId first, then add if needed
      const newTesters = shouldAssign
        ? [...currentTesters.filter(id => id !== userId), userId]
        : currentTesters.filter(id => id !== userId);

      try {
        // Use assignTesters endpoint (PATCH) — falls back to PUT if needed
        try {
          await routesApi.assignTesters(route.id, newTesters);
        } catch {
          // Fallback: PUT with full route data
          await routesApi.update(route.id, {
            name: route.name,
            tankerNumber: route.tankerNumber || '',
            mtName: route.mtName || '',
            stops: route.stops,
            length: route.length || '',
            travelTime: route.travelTime || '',
            cost: route.cost || 0,
            assignedMilkTesterIds: newTesters,
          });
        }
        updateRoute(route.id, { assignedMilkTesterIds: newTesters });
      } catch (err) {
        console.error(`Failed to assign testers for route ${route.name}:`, err);
      }
    }
  }

  function openNew() {
    setEditingId(null); setForm(EMPTY); setErrors({}); setAssignedRouteIds([]); setShowModal(true);
  }

  function openEdit(u: User) {
    setEditingId(u.id);
    setForm({ fullName: u.fullName, username: u.username, password: u.password || '', phone: u.phone, role: u.role });
    setErrors({});
    // Check both u.id and u._id for matching (handles ObjectId vs string)
    const userIds = [u.id, u._id].filter(Boolean);
    setAssignedRouteIds(
      routes
        .filter(r => (r.assignedMilkTesterIds || []).some(tid => userIds.includes(tid)))
        .map(r => r.id)
    );
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditingId(null); setAssignedRouteIds([]); setSubmitError(''); setSubmitLoading(false); }

  function set(k: keyof FormData, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
    if (k === 'role' && v !== 'MilkTester') setAssignedRouteIds([]);
  }

  function toggleRoute(routeId: string) {
    setAssignedRouteIds(prev => prev.includes(routeId) ? prev.filter(id => id !== routeId) : [...prev, routeId]);
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> User Management
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openNew} className="btn btn-primary gap-1.5">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input type="search" placeholder="Search users…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input form-input-sm pl-8 w-52" aria-label="Search users" />
          </div>
          <span className="text-xs text-[var(--text-muted)]">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th><th>Username</th><th>Role</th>
                <th>Assigned Routes</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[var(--text-muted)] text-sm">
                  {search ? 'No users match your search.' : 'No users yet. Add your first user.'}
                </td></tr>
              ) : filtered.map(u => {
                const assignedNames = getAssignedRouteNames(u.id);
                return (
                  <tr key={u.id} className={u.status === 'Inactive' ? 'opacity-50' : ''}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black text-white uppercase flex-shrink-0">
                          {u.fullName.charAt(0)}
                        </div>
                        <span className="font-semibold text-[var(--text-primary)]">{u.fullName}</span>
                      </div>
                    </td>
                    <td><span className="font-mono text-[var(--text-secondary)]">{u.username}</span></td>
                    <td><span className={cn('badge border text-[10px]', roleStyle(u.role))}>{roleLabel(u.role)}</span></td>
                    <td>
                      {u.role === 'MilkTester' ? (
                        assignedNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedNames.map(name => (
                              <span key={name} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-indigo-200">
                                <Navigation className="w-2.5 h-2.5" />{name}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-[11px] text-slate-400 italic">No route assigned</span>
                      ) : <span className="text-[11px] text-slate-300">—</span>}
                    </td>
                    <td><span className={cn('badge', u.status === 'Active' ? 'badge-active' : 'badge-neutral')}>{u.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)} title="Edit" aria-label="Edit user"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-blue-50 hover:text-blue-600 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleUserStatus(u.id)} title={u.status === 'Active' ? 'Deactivate' : 'Activate'} aria-label="Toggle status"
                          className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                            u.status === 'Active' ? 'text-[var(--text-muted)] hover:bg-amber-50 hover:text-amber-600' : 'text-emerald-600 hover:bg-emerald-50')}>
                          {u.status === 'Active' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteUser(u.id)} title="Delete" aria-label="Delete user"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"
            style={{ maxWidth: isMilkTester ? 560 : 460 }}>

            {/* Modal Header */}
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <h2 id="modal-title" className="modal-title">{editingId ? 'Edit User' : 'Add New User'}</h2>
              </div>
              <button onClick={closeModal} aria-label="Close"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-alt)] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              <form id="user-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="form-label" htmlFor="fullName">Full Name</label>
                    <input id="fullName" className={cn('form-input mt-1', errors.fullName && 'error')}
                      value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Ali Ahmed" />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                  </div>
                  <div>
                    <label className="form-label" htmlFor="uUsername">Username</label>
                    <input id="uUsername" className={cn('form-input mt-1', errors.username && 'error')}
                      value={form.username} onChange={e => set('username', e.target.value)} placeholder="ali.ahmed" />
                    {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
                  </div>
                  <div>
                    <label className="form-label" htmlFor="uPhone">Phone</label>
                    <input id="uPhone" type="tel" className={cn('form-input mt-1', errors.phone && 'error')}
                      value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="03XX-XXXXXXX" />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="form-label" htmlFor="uPassword">Password</label>
                    <input id="uPassword" type="text" className={cn('form-input mt-1', errors.password && 'error')}
                      value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="form-label" htmlFor="uRole">Role</label>
                    <select id="uRole" className="form-input mt-1" value={form.role} onChange={e => set('role', e.target.value)}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Route Assignment panel (only for Milk Tester) ── */}
                {isMilkTester && (
                  <div className="border border-indigo-200 rounded-xl overflow-hidden">
                    <div className="bg-indigo-50 px-4 py-2.5 flex items-center gap-2 border-b border-indigo-200">
                      <Navigation className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <span className="text-sm font-bold text-indigo-800">Assign Route(s) to this Milk Tester</span>
                      {assignedRouteIds.length > 0 && (
                        <span className="ml-auto bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          {assignedRouteIds.length} selected
                        </span>
                      )}
                    </div>

                    {routes.length === 0 ? (
                      <div className="px-4 py-5 text-center">
                        <Navigation className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium">No routes created yet.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Go to <strong>Route Create</strong> page first.</p>
                      </div>
                    ) : (
                      <div className="p-3 grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto">
                        {routes.map(route => {
                          const isSelected = assignedRouteIds.includes(route.id);
                          return (
                            <label key={route.id}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all select-none',
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                              )}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleRoute(route.id)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{route.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">
                                  🚛 {route.tankerNumber || '—'}&nbsp;·&nbsp;{route.stops.length} customers
                                </p>
                              </div>
                              {isSelected && (
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                  ✓ Assigned
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400">
                        Only selected routes will appear in this Milk Tester's collection panel.
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              {submitError && (
                <div className="flex-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mr-2">
                  ❌ {submitError}
                </div>
              )}
              <button type="button" onClick={closeModal} className="btn btn-secondary" disabled={submitLoading}>Cancel</button>
              <button type="submit" form="user-form" className="btn btn-primary" disabled={submitLoading}>
                {submitLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{opacity:0.25}}/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{opacity:0.75}}/>
                    </svg>
                    Saving...
                  </span>
                ) : (editingId ? 'Save Changes' : 'Create User')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
