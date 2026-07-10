import React, { useState } from 'react';
import { Truck, Plus, Edit2, Trash2, Power, PowerOff, X, MapPin, Phone, Hash } from 'lucide-react';
import { useVehicleContext, Vehicle } from '../../contexts/VehicleContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageShell } from '../../components/ui/PageShell';
import { cn } from '../../lib/utils';

type FormData = {
  vehicleNumber: string; name: string; driverName: string; driverId: string;
  driverPhone: string; imei: string; routeInfo: string;
  status: Vehicle['status'];
};
const EMPTY: FormData = {
  vehicleNumber: '', name: '', driverName: '', driverId: '', driverPhone: '',
  imei: '', routeInfo: '', status: 'Available'
};

const STATUS_STYLES: Record<string, string> = {
  'Available': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Route': 'bg-blue-50 text-blue-700 border-blue-200',
  'Maintenance': 'bg-amber-50 text-amber-700 border-amber-200',
  'Inactive': 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function VehicleManagement() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useVehicleContext();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);

  function openNew() { setEditingId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(v: Vehicle) { setEditingId(v.id); setForm({ vehicleNumber: v.vehicleNumber, name: v.name, driverName: v.driverName || '', driverId: v.driverId, driverPhone: v.driverPhone, imei: v.imei, routeInfo: v.routeInfo || '', status: v.status }); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditingId(null); }
  function set(k: keyof FormData, val: string) { setForm(f => ({ ...f, [k]: val })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    editingId ? updateVehicle(editingId, form) : addVehicle(form);
    closeModal();
  }

  function toggleStatus(v: Vehicle) {
    updateVehicle(v.id, { status: v.status === 'Inactive' ? 'Available' : 'Inactive' });
  }

  const activeCount = vehicles.filter(v => v.status !== 'Inactive').length;

  return (
    <PageShell
      title="Vehicle Fleet"
      subtitle={`${vehicles.length} vehicles registered · ${activeCount} active`}
      icon={<Truck className="w-4.5 h-4.5" />}
      actions={isAdmin ? (
        <button onClick={openNew} className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap px-2.5 py-1.5 sm:px-3.5 cursor-pointer">
          <Plus className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Add Vehicle</span>
        </button>
      ) : undefined}
    >
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Fleet', value: vehicles.length, color: 'text-[var(--text-primary)]' },
          { label: 'Available', value: vehicles.filter(v => v.status === 'Available').length, color: 'text-emerald-600' },
          { label: 'On Route', value: vehicles.filter(v => v.status === 'On Route').length, color: 'text-blue-600' },
          { label: 'Inactive', value: vehicles.filter(v => v.status === 'Inactive').length, color: 'text-slate-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4 text-center shadow-sm"> <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p> <p className={cn('text-2xl font-black font-mono', color)}>{value}</p> </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper"> <div className="table-scroll"> <table className="data-table"> <thead> <tr> <th>Vehicle</th> <th>Driver</th> <th>Route / Info</th> <th>GPS / IMEI</th> <th>Status</th>
        {isAdmin && <th>Actions</th>}
      </tr> </thead> <tbody>
          {vehicles.length === 0 ? (
            <tr> <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-[var(--text-muted)] text-sm">
              No vehicles registered yet. Add your first vehicle.
            </td> </tr>
          ) : vehicles.map(v => (
            <tr key={v.id} className={v.status === 'Inactive' ? 'opacity-50' : ''}> <td> <div className="flex items-center gap-2.5"> <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0"> <Truck className="w-3.5 h-3.5 text-blue-600" /> </div> <div> <p className="font-bold text-[var(--text-primary)]">{v.vehicleNumber}</p> <p className="text-[11px] text-[var(--text-muted)]">{v.name}</p> </div> </div> </td> <td> <p className="font-semibold text-[var(--text-primary)]">{v.driverName || <span className="text-[var(--text-muted)] italic">Unassigned</span>}</p>
              {v.driverPhone && (
                <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5"> <Phone className="w-2.5 h-2.5" />{v.driverPhone}
                </p>
              )}
            </td> <td>
                {v.routeInfo ? (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]"> <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />{v.routeInfo}
                  </div>
                ) : <span className="text-[var(--text-muted)] text-xs">—</span>}
              </td> <td>
                {v.imei ? (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-mono"> <Hash className="w-3 h-3" />{v.imei}
                  </div>
                ) : <span className="text-[var(--text-muted)] text-xs">—</span>}
              </td> <td> <span className={cn('badge border text-[10px]', STATUS_STYLES[v.status] || STATUS_STYLES['Inactive'])}>
                {v.status}
              </span> </td>
              {isAdmin && (
                <td> <div className="flex items-center gap-1"> <button onClick={() => openEdit(v)} aria-label="Edit vehicle"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-blue-50 hover:text-blue-600 transition-all"> <Edit2 className="w-3.5 h-3.5" /> </button> <button onClick={() => toggleStatus(v)} aria-label="Toggle status"
                    className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                      v.status === 'Inactive'
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-[var(--text-muted)] hover:bg-amber-50 hover:text-amber-600')}>
                    {v.status === 'Inactive' ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                  </button> <button onClick={() => { if (confirm(`Delete vehicle ${v.vehicleNumber}?`)) deleteVehicle(v.id); }}
                    aria-label="Delete vehicle"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-all"> <Trash2 className="w-3.5 h-3.5" /> </button> </div> </td>
              )}
            </tr>
          ))}
        </tbody> </table> </div> </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}> <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vehicle-modal-title"> <div className="modal-header"> <div className="flex items-center gap-2"> <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"> <Truck className="w-4 h-4 text-blue-600" /> </div> <h2 id="vehicle-modal-title" className="modal-title">{editingId ? 'Edit Vehicle' : 'Register Vehicle'}</h2> </div> <button onClick={closeModal} aria-label="Close"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-alt)] transition-all"> <X className="w-4 h-4" /> </button> </div> <div className="modal-body"> <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-3"> <div className="grid grid-cols-2 gap-3"> <div> <label className="form-label" htmlFor="vNumber">Vehicle Number</label> <input id="vNumber" required className="form-input mt-1" value={form.vehicleNumber} onChange={e => set('vehicleNumber', e.target.value)} placeholder="e.g. ABC-123" /> </div> <div> <label className="form-label" htmlFor="vName">Model / Name</label> <input id="vName" required className="form-input mt-1" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Hino 500" /> </div> <div> <label className="form-label" htmlFor="vDriver">Driver Name</label> <input id="vDriver" className="form-input mt-1" value={form.driverName} onChange={e => set('driverName', e.target.value)} placeholder="Assigned driver" /> </div> <div> <label className="form-label" htmlFor="vPhone">Driver Phone</label> <input id="vPhone" type="tel" className="form-input mt-1" value={form.driverPhone} onChange={e => set('driverPhone', e.target.value)} placeholder="03XX-XXXXXXX" /> </div> <div className="col-span-2"> <label className="form-label" htmlFor="vRoute">Route & Info</label> <input id="vRoute" className="form-input mt-1" value={form.routeInfo} onChange={e => set('routeInfo', e.target.value)} placeholder="e.g. Sahiwal → Lahore" /> </div> <div className="col-span-2"> <label className="form-label" htmlFor="vImei">GPS IMEI Number</label> <input id="vImei" className="form-input mt-1 font-mono" value={form.imei} onChange={e => set('imei', e.target.value)} placeholder="15-digit IMEI" /> </div> <div className="col-span-2"> <label className="form-label" htmlFor="vStatus">Status</label> <select id="vStatus" className="form-input mt-1" value={form.status} onChange={e => set('status', e.target.value as Vehicle['status'])}> <option value="Available">Available</option> <option value="On Route">On Route</option> <option value="Maintenance">Maintenance</option> <option value="Inactive">Inactive</option> </select> </div> </div> </form> </div> <div className="modal-footer"> <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button> <button type="submit" form="vehicle-form" className="btn btn-primary">
            {editingId ? 'Save Changes' : 'Register Vehicle'}
          </button> </div> </div> </div>
      )}
    </PageShell>
  );
}
