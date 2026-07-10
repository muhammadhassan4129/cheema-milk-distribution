import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRouteCollectionContext } from '../../contexts/RouteCollectionContext';
import { RouteCollection, MilkCollectionStop } from '../../types';
import { Database, FileText, Search, MapPin, X, ArrowRight, ChevronLeft, Droplets } from 'lucide-react';
import { useMilkTransactionContext } from '../../contexts/MilkTransactionContext';
import { PageShell } from '../../components/ui/PageShell';
import { cn } from '../../lib/utils';

const STATUS_MAP: Record<string, string> = {
  'Draft':      'badge-neutral',
  'Submitted':  'badge-warning',
  'Received':   'badge-success',
  'Lab Tested': 'badge-info',
};

export default function AdminRouteCollections() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { collections } = useRouteCollectionContext();
  const { addRecords } = useMilkTransactionContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewCol, setViewCol] = useState<RouteCollection | null>(null);
  const [viewPurchase, setViewPurchase] = useState<MilkCollectionStop | null>(null);

  const handleTransferToPurchases = () => {
    if (!viewCol) return;
    const transferredRecords = viewCol.stops.map(stop => ({
      id: stop.id || Math.random().toString(36).substring(2, 9),
      name: stop.locationName,
      vol: Number(stop.milkLiter) || 0,
      fat: Number(stop.fat) || 0,
      lr: Number(stop.lr) || 0,
      snf: Number(stop.snf) || 0,
      tsr: Number(stop.totalSolids) || 0,
      totalTs: Number(stop.ts13) || 0,
      rate: stop.price || 150,
      pricePerLiter: stop.price || 0,
      amount: stop.totalPayable || 0,
      routeId: viewCol.id,
      routeName: viewCol.routeName,
    }));

    const destinationPath = user?.role === 'Admin' ? '/admin/farmer-purchases' : '/accountant/farmer-purchases';
    navigate(destinationPath, {
      state: {
        date: viewCol.date,
        routeId: viewCol.id,
        transferredRecords
      }
    });
  };

  const filteredCols = collections.filter(c => 
    c.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mtName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSummary = (col: RouteCollection) => {
    const totalLocations = col.stops.length;
    const totalMilkLiter = col.stops.reduce((acc, s) => acc + (Number(s.milkLiter) || 0), 0);
    const totalMilkKgs = col.stops.reduce((acc, s) => acc + (Number(s.milkKgs) || 0), 0);
    const totalTS13 = col.stops.reduce((acc, s) => acc + (Number(s.ts13) || 0), 0).toFixed(2);
    const totalPayable = col.stops.reduce((acc, s) => acc + (Number(s.totalPayable) || 0), 0).toFixed(2);
    const avgFat = totalLocations > 0 ? (col.stops.reduce((acc, s) => acc + (Number(s.fat) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    const avgLr = totalLocations > 0 ? (col.stops.reduce((acc, s) => acc + (Number(s.lr) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    const avgSnf = totalLocations > 0 ? (col.stops.reduce((acc, s) => acc + (Number(s.snf) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    const avgTsPercent = totalLocations > 0 ? (col.stops.reduce((acc, s) => acc + (Number(s.totalSolids) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    return { totalLocations, totalMilkLiter, totalMilkKgs, totalTS13, totalPayable, avgFat, avgLr, avgSnf, avgTsPercent };
  };

  return (
    <PageShell
      title="Route Collections"
      subtitle={viewCol ? `${viewCol.routeName} · ${viewCol.date}` : `${collections.length} collections recorded`}
      icon={<Database className="w-4.5 h-4.5" />}
      actions={viewCol ? (
        <button onClick={() => setViewCol(null)} className="btn btn-secondary btn-sm gap-1.5"> <ChevronLeft className="w-3.5 h-3.5" /> Back to list
        </button>
      ) : undefined}
    >

      {viewCol ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"> <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center"> <div> <h3 className="text-xl font-bold text-slate-800 flex items-center"> <FileText className="w-5 h-5 mr-2 text-indigo-500" /> Collection Details
               </h3> <p className="text-sm text-slate-500 mt-1">{viewCol.routeName} • {viewCol.date}</p> </div> <button onClick={() => setViewCol(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg text-sm">
               Back to list
             </button> </div> <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-2"> <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="block text-xs uppercase font-bold text-slate-500 mb-1">Status</span><span className={`font-bold ${viewCol.status === 'Lab Tested' ? 'text-green-600' : viewCol.status === 'Received' ? 'text-emerald-600' : viewCol.status === 'Submitted' ? 'text-amber-600' : 'text-slate-600'}`}>{viewCol.status}</span></div> <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="block text-xs uppercase font-bold text-slate-500 mb-1">Tanker</span><span className="font-bold text-slate-800">{viewCol.tankerNumber}</span></div> <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="block text-xs uppercase font-bold text-slate-500 mb-1">Milk Tester</span><span className="font-bold text-slate-800">{viewCol.mtName}</span></div> <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="block text-xs uppercase font-bold text-slate-500 mb-1">Total KGs</span><span className="font-bold text-indigo-700">{viewCol.stops.reduce((a,b)=>a+b.milkKgs,0)}</span></div> </div> <div className="overflow-x-auto border-t border-slate-200"> <table className="w-full text-xs text-left text-slate-600 whitespace-nowrap"> <thead className="bg-slate-100 text-slate-700"> <tr> <th className="px-2 py-1 border-b border-r border-slate-300 whitespace-nowrap">Serial number</th> <th className="px-2 py-1 border-b border-r border-slate-300 whitespace-nowrap">customer name</th> <th className="px-2 py-1 border-b border-r border-slate-300 whitespace-nowrap">Time</th> <th className="px-2 py-1 border-b border-r border-indigo-200 whitespace-nowrap bg-indigo-50/50">Milk  KG</th> <th className="px-2 py-1 border-b border-r border-indigo-350 bg-indigo-100 font-extrabold text-center whitespace-nowrap text-indigo-950">milk litr</th> <th className="px-2 py-1 border-b border-r border-indigo-200 whitespace-nowrap bg-indigo-50/50">Fat %</th> <th className="px-2 py-1 border-b border-r border-indigo-200 whitespace-nowrap bg-indigo-50/50">LR</th> <th className="px-2 py-1 border-b border-r border-indigo-200 whitespace-nowrap bg-indigo-50/50">Temp °C</th> <th className="px-2 py-1 border-b border-r border-indigo-300 whitespace-nowrap bg-indigo-100/30">SNF %</th> <th className="px-2 py-1 border-b border-r border-indigo-300 whitespace-nowrap bg-indigo-100/30">TS %</th> <th className="px-2 py-1 border-b border-r border-indigo-300 whitespace-nowrap bg-indigo-100/30">Total TS</th> <th className="px-2 py-1 border-b border-indigo-300 whitespace-nowrap bg-indigo-100/30 text-center">Action</th> </tr> </thead> <tbody>
                 {viewCol.stops.map((stop, index) => (
                   <tr key={stop.id} className="border-b border-slate-200 hover:bg-slate-50 text-center"> <td className="px-2 py-2 border-r border-slate-200">{index + 1}</td> <td className="px-2 py-2 border-r border-slate-200 font-medium text-slate-800 text-left">{stop.locationName}</td> <td className="px-2 py-2 border-r border-slate-200">{stop.time}</td> <td className="px-2 py-2 border-r border-indigo-100 bg-indigo-50/30 font-medium">{stop.milkKgs || 0}</td> <td className="px-2 py-2 border-r border-indigo-250 bg-indigo-100 text-indigo-950 font-bold">{stop.milkLiter || 0}</td> <td className="px-2 py-2 border-r border-indigo-100 bg-indigo-50/30">{stop.fat}</td> <td className="px-2 py-2 border-r border-indigo-100 bg-indigo-50/30">{stop.lr}</td> <td className="px-2 py-2 border-r border-indigo-100 bg-indigo-50/30">{stop.temperature || '-'}</td> <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-100/30 text-indigo-900 font-medium">{stop.snf}</td> <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-100/30 text-indigo-900 font-medium">{stop.totalSolids}</td> <td className="px-2 py-2 border-r text-indigo-700 font-bold">{stop.ts13}</td> <td className="px-2 py-2 border-r text-indigo-700"> <button onClick={() => setViewPurchase(stop)} className="hover:text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded text-xs bg-white text-indigo-600 font-bold shadow-sm">View</button> </td> </tr>
                 ))}
              </tbody>
              {viewCol && (() => {
                const summary = getSummary(viewCol);
                return (
                  <tfoot> <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 shadow-sm text-center"> <td className="px-2 py-2 border-r border-slate-200">Total</td> <td className="px-2 py-2 border-r border-slate-200 text-left">{summary.totalLocations} Customers</td> <td className="px-2 py-2 border-r border-slate-200">-</td> <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-50/50">{summary.totalMilkKgs}</td> <td className="px-2 py-2 border-r border-indigo-300 bg-indigo-100/50 text-indigo-950 font-bold">{summary.totalMilkLiter}</td> <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-50/50">{summary.avgFat}%</td> <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-50/50">{summary.avgLr}</td> <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-50/50">-</td> <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-100/30 text-indigo-900 font-bold">{summary.avgSnf}%</td> <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-100/30 text-indigo-900 font-bold">{summary.avgTsPercent}%</td> <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-100/50 text-indigo-800 font-bold">{summary.totalTS13}</td> <td className="px-2 py-2 text-emerald-800">{Number(summary.totalPayable) > 0 ? `Rs. ${Number(summary.totalPayable).toLocaleString()}` : ''}</td> </tr> </tfoot>
                );
              })()}
             </table> </div>

           {viewCol && (
               <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-end"> <button 
                   onClick={handleTransferToPurchases}
                   className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                 >
                   Transfer Entries to Purchases <ArrowRight className="w-4 h-4" /> </button> </div>
           )}

           {viewCol.receiving && (
             <div className="bg-emerald-50 p-6 border-t border-emerald-100"> <h4 className="font-bold text-emerald-900 mb-4 flex items-center"> <MapPin className="w-5 h-5 mr-2 text-emerald-600" /> Receiving Information
               </h4>
               {(() => {
                  const recLiters = Number(viewCol.receiving.milkLiter || 0);
                  const recKgs = Number(viewCol.receiving.milkKgs || 0);
                  const recFat = Number(viewCol.receiving.fat || 0);
                  const recSnf = Number(viewCol.receiving.snf || 0);
                  const recTsPercent = Number((recFat + recSnf).toFixed(2));
                  const recTotalTs = Number(((recLiters * recTsPercent) / 13).toFixed(2));
                  
                  return (
                    <> <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4 text-sm"> <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center flex flex-col justify-between"> <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Liters</span> <div className="font-extrabold text-base text-emerald-800">{recLiters.toFixed(2)} L</div> </div> <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center flex flex-col justify-between"> <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Avg SNF %</span> <div className="font-extrabold text-base text-emerald-800">{recSnf.toFixed(2)}%</div> </div> <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center flex flex-col justify-between"> <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Avg TS %</span> <div className="font-extrabold text-base text-emerald-800">{recTsPercent.toFixed(2)}%</div> </div> <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center flex flex-col justify-between"> <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total TS</span> <div className="font-extrabold text-base text-emerald-800">{recTotalTs.toFixed(2)}</div> </div> <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center flex flex-col justify-between"> <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total KGs</span> <div className="font-extrabold text-base text-emerald-800">{recKgs} KG</div> </div> <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm text-center flex flex-col justify-between"> <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Avg Fat</span> <div className="font-extrabold text-base text-emerald-800">{recFat.toFixed(2)}%</div> </div> </div> <div className="flex flex-wrap gap-x-6 gap-y-1 px-1 text-xs text-slate-500 font-medium pb-4"> <span>LR: <strong className="text-slate-700">{viewCol.receiving.lr}</strong></span> <span>Temp: <strong className="text-slate-700">{viewCol.receiving.temperature ? `${viewCol.receiving.temperature}°C` : '-'}</strong></span> </div> </>
                  );
               })()}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 text-sm hidden"> <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm"> <span className="block text-slate-500 text-xs font-semibold uppercase mb-1">Total Milk KGs</span> <div className="font-bold text-lg text-emerald-700">{viewCol.receiving.milkKgs} KG</div> </div> <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm"> <span className="block text-slate-500 text-xs font-semibold uppercase mb-1">Total Milk Ltrs</span> <div className="font-bold text-lg text-slate-800">{viewCol.receiving.milkLiter} L</div> </div> <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm"> <span className="block text-slate-500 text-xs font-semibold uppercase mb-1">Fat % | LR | SNF %</span> <div className="font-bold text-slate-800">{viewCol.receiving.fat}% | {viewCol.receiving.lr} | {viewCol.receiving.snf}%</div> </div> <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm"> <span className="block text-slate-500 text-xs font-semibold uppercase mb-1">Temp</span> <div className="font-bold text-slate-800">{viewCol.receiving.temperature || '-'}°C</div> </div> </div> <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50/10 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between"> <div> <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wide mb-1">Submitted Back Deductions Summary</h4> <p className="text-slate-500 text-sm">Remaining quantity that was submitted after deducting collected quantity.</p> </div> <div className="flex gap-8 mt-4 md:mt-0"> <div className="text-right"> <span className="block text-slate-500 text-xs font-medium uppercase mb-1">Remaining Submitted KGs</span> <span className={`font-black text-2xl ${(viewCol.receiving.milkKgs - getSummary(viewCol).totalMilkKgs) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{(viewCol.receiving.milkKgs - getSummary(viewCol).totalMilkKgs) >= 0 ? '+' : ''}{(viewCol.receiving.milkKgs - getSummary(viewCol).totalMilkKgs).toFixed(2)} KG</span> </div> <div className="text-right"> <span className="block text-slate-500 text-xs font-medium uppercase mb-1">Remaining Submitted Liters</span> <span className={`font-bold text-xl ${(viewCol.receiving.milkLiter - getSummary(viewCol).totalMilkLiter) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{(viewCol.receiving.milkLiter - getSummary(viewCol).totalMilkLiter) >= 0 ? '+' : ''}{(viewCol.receiving.milkLiter - getSummary(viewCol).totalMilkLiter).toFixed(2)} L</span> </div> </div> </div> </div>
           )}
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="relative max-w-sm"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" /> <input type="search" placeholder="Search routes or milk testers…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-input pl-9" /> </div> <div className="table-wrapper"> <div className="table-scroll"> <table className="data-table"> <thead> <tr> <th>Date</th><th>Route Name</th><th>Milk Tester / Tanker</th> <th className="text-center">Stops</th><th>Volume (Kg)</th><th>Status</th><th></th> </tr> </thead> <tbody>
                  {filteredCols.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">No route collections found.</td></tr>
                  ) : filteredCols.map(col => (
                    <tr key={col.id}> <td className="font-mono text-xs text-[var(--text-secondary)]">{col.date}</td> <td className="font-bold text-[var(--text-primary)]">{col.routeName}</td> <td> <p className="font-semibold text-[var(--text-primary)]">{col.mtName}</p> <p className="text-[11px] text-[var(--text-muted)] font-mono">{col.tankerNumber}</p> </td> <td className="text-center font-bold">{col.stops.length}</td> <td className="font-bold font-mono text-blue-600">{col.stops.reduce((a,b)=>a+b.milkKgs,0).toFixed(2)} Kg</td> <td><span className={cn('badge', STATUS_MAP[col.status] || 'badge-neutral')}>{col.status}</span></td> <td> <button onClick={() => setViewCol(col)} className="btn btn-ghost btn-sm text-blue-600 hover:text-blue-700">
                          View Details →
                        </button> </td> </tr>
                  ))}
                </tbody> </table> </div> </div> </>
      )}

      {viewPurchase && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setViewPurchase(null); }}> <div className="modal-panel" role="dialog" aria-modal="true"> <div className="modal-header"> <h2 className="modal-title flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500"/>Stop Details</h2> <button onClick={() => setViewPurchase(null)} aria-label="Close"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-alt)] transition-all"> <X className="w-4 h-4" /> </button> </div> <div className="modal-body space-y-4"> <div> <p className="form-label">Customer Name</p> <p className="text-lg font-black text-[var(--text-primary)]">{viewPurchase.locationName}</p> <p className="text-xs text-[var(--text-muted)] mt-0.5">{viewPurchase.time}</p> </div> <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['Milk (KG)',   viewPurchase.milkKgs],
                  ['Milk (L)',    viewPurchase.milkLiter],
                  ['Fat %',       viewPurchase.fat],
                  ['LR',          viewPurchase.lr],
                  ['SNF %',       viewPurchase.snf],
                  ['Total Solids',viewPurchase.totalSolids],
                  ['TS13',        viewPurchase.ts13],
                  ['Temp °C',     viewPurchase.temperature || '—'],
                ].map(([lbl, val]) => (
                  <div key={String(lbl)} className="bg-[var(--surface-alt)] p-3 rounded-xl border border-[var(--border)]"> <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{lbl}</p> <p className="font-black text-[var(--text-primary)]">{val}</p> </div>
                ))}
              </div> </div> <div className="modal-footer"> <button onClick={() => setViewPurchase(null)} className="btn btn-secondary">Close</button> </div> </div> </div>
      )}
    </PageShell>
  );
}
