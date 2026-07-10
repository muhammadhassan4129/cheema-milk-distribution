import React, { useState, useEffect } from 'react';
import { useRouteCollectionContext } from '../../contexts/RouteCollectionContext';
import { MilkCollectionStop, RouteCollection, Route } from '../../types';
import { Plus, Save, Trash2, Edit, X, Truck, Calendar, MapPin, Database, Download, GripVertical, Clock, SlidersHorizontal, History, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { routesApi } from '../../services/api';

export default function DriverRouteCollection() {
  const { user } = useAuth();
  const { collections, addCollection, updateCollection, deleteCollection } = useRouteCollectionContext();

  // Direct API se routes load karo - RouteContext bypass
  const [myRoutes, setMyRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);

  const loadMyRoutes = async () => {
    setRoutesLoading(true);
    try {
      const userId = user?.id;
      let routeData: any[] = [];

      // Try getMyRoutes first (backend filtered), fallback to getAll + client filter
      try {
        const result: any = await routesApi.getMyRoutes();
        if (result?.success && Array.isArray(result.data)) {
          routeData = result.data;
        }
      } catch {
        // Fallback: getAll + filter by assignedMilkTesterIds
        const all: any = await routesApi.getAll();
        if (all?.success && Array.isArray(all.data)) {
          routeData = all.data.filter((r: any) => {
            const ids: string[] = (r.assignedMilkTesterIds || []).map((t: any) =>
              typeof t === 'object' ? (t._id || t.id || String(t)) : String(t)
            );
            return ids.includes(String(userId));
          });
        }
      }

      // If getMyRoutes returned data, also filter client-side as double-check
      if (routeData.length === 0 && userId) {
        const all: any = await routesApi.getAll();
        if (all?.success && Array.isArray(all.data)) {
          routeData = all.data.filter((r: any) => {
            const ids: string[] = (r.assignedMilkTesterIds || []).map((t: any) =>
              typeof t === 'object' ? (t._id || t.id || String(t)) : String(t)
            );
            return ids.includes(String(userId));
          });
        }
      }

      const mapped: Route[] = routeData.map((r: any) => ({
        id: r._id || r.id,
        name: r.name,
        stops: (r.stops || []).map((s: any) => ({ id: s._id || s.id, name: s.name })),
        length: r.length || '',
        travelTime: r.travelTime || '',
        cost: r.cost || 0,
        tankerNumber: r.tankerNumber || '',
        mtName: r.mtName || '',
        assignedMilkTesterIds: r.assignedMilkTesterIds || [],
      }));
      setMyRoutes(mapped);
    } catch (err) {
      console.error('loadMyRoutes error:', err);
      setMyRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  };

  useEffect(() => {
    loadMyRoutes();
  }, [user?.id]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<RouteCollection, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    routeName: '',
    tankerNumber: '',
    mtName: '',
    stops: [],
    status: 'Draft'
  });

  const emptyStop: Omit<MilkCollectionStop, 'id'> = {
    time: '',
    locationName: '',
    milkLiter: 0,
    snf: 0,
    totalSolids: 0,
    ts13: 0,
    fat: 0,
    lr: 0,
    milkKgs: 0,
    temperature: 0,
    price: 0,
    totalPayable: 0,
    organoTest: '',
    glucoseTest: '',
    starchTest: '',
    aptTest: '',
    abTest: '',
    remarks: ''
  };

  const [currentStop, setCurrentStop] = useState<Omit<MilkCollectionStop, 'id'>>(emptyStop);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [showStopForm, setShowStopForm] = useState(false);
  const [filterRoute, setFilterRoute] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [receivingData, setReceivingData] = useState<any>({});
  const [receivingErrorMsg, setReceivingErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dialog state for creating a new custom route template - REMOVED (Admin only creates routes)
  const [showCreateRouteDialog, setShowCreateRouteDialog] = useState(false);
  const [newRouteTemplateName, setNewRouteTemplateName] = useState('');
  const [newRouteTemplateTanker, setNewRouteTemplateTanker] = useState('');
  const [newRouteTemplateMt, setNewRouteTemplateMt] = useState('');
  const [newRouteTemplateCustomers, setNewRouteTemplateCustomers] = useState<string[]>(['', '', '', '', '']);
  const [routeTemplateErrorMsg, setRouteTemplateErrorMsg] = useState('');

  // Drag and drop sorting state & handlers
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setFormData(prev => {
      const stops = [...prev.stops];
      const draggedItem = stops[draggedIndex];
      stops.splice(draggedIndex, 1);
      stops.splice(targetIndex, 0, draggedItem);
      return { ...prev, stops };
    });
    setDraggedIndex(targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Tabs for Dashboard view
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Dedicated history filters
  const [historyRouteFilter, setHistoryRouteFilter] = useState('');
  const [historyRange, setHistoryRange] = useState<'all' | '1day' | '2days' | '10days' | 'custom'>('all');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  const startReceiving = (colId: string) => {
    setReceivingId(colId);
    setReceivingErrorMsg('');
    setReceivingData({
      locationName: '',
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      milkKgs: '',
      milkLiter: '',
      fat: '',
      lr: '',
      snf: '',
      temperature: ''
    });
  };

  const cancelReceiving = () => {
    setReceivingId(null);
    setReceivingErrorMsg('');
    setReceivingData({});
  };

  const handleReceivingChange = (field: string, value: string | number) => {
    setReceivingData((prev: any) => {
      const next = { ...prev, [field]: value };
      if (field === 'milkKgs') {
        const kgs = Number(value);
        next.milkLiter = value !== '' && !isNaN(kgs) ? Number((kgs / 1.03).toFixed(2)) : '';
      }
      if (field === 'milkLiter') {
        const liters = Number(value);
        next.milkKgs = value !== '' && !isNaN(liters) ? Number((liters * 1.03).toFixed(2)) : '';
      }
      if (['lr', 'fat'].includes(field)) {
        const lr = next.lr !== '' ? Number(next.lr) : NaN;
        const fat = next.fat !== '' ? Number(next.fat) : NaN;
        next.snf = (!isNaN(lr) && !isNaN(fat)) ? calcSNF(lr, fat) : '';
      }
      return next;
    });
  };

  const submitReceiving = (col: RouteCollection) => {
    // Already received — dobara submit nahi hoga
    if (col.status === 'Received' || col.status === 'Lab Tested') {
      return;
    }
    setReceivingErrorMsg('');
    if (!receivingData.locationName || !receivingData.time || (!receivingData.milkKgs && !receivingData.milkLiter)) {
      setReceivingErrorMsg("Please enter Location, Time and Milk KGs/Liters.");
      return;
    }
    const updated = {
      ...col,
      status: 'Received',
      receiving: receivingData,
    } as any;
    updateCollection(col.id, updated);
    setReceivingId(null);
    setSuccessMsg('Receiving collection submitted successfully!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const calcSNF = (lr: number, fat: number) => {
    return Number(((0.25 * lr) + (0.22 * fat) + 0.72).toFixed(2));
  };

  const handleStopChange = (index: number, field: keyof MilkCollectionStop, value: any) => {
    setFormData(prev => {
      const newStops = [...prev.stops];
      const current = { ...newStops[index], [field]: value };

      if (['lr', 'fat', 'milkLiter', 'milkKgs', 'price'].includes(field)) {
        const lr = Number(current.lr) || 0;
        const fat = Number(current.fat) || 0;
        const price = Number(current.price) || 0;

        let milkKgs = Number(current.milkKgs) || 0;
        let milkLiter = Number(current.milkLiter) || 0;

        if (field === 'milkKgs') {
          // Input entered in kilograms: automatically convert kilograms to liters using standard density of 1.03
          milkLiter = Number((milkKgs / 1.03).toFixed(2));
        } else if (field === 'milkLiter') {
          milkKgs = Number((milkLiter * 1.03).toFixed(2));
        } else {
          if (milkKgs && !milkLiter) {
            milkLiter = Number((milkKgs / 1.03).toFixed(2));
          } else if (milkLiter && !milkKgs) {
            milkKgs = Number((milkLiter * 1.03).toFixed(2));
          }
        }

        const snf = (lr > 0 && fat > 0) ? calcSNF(lr, fat) : 0;
        const totalSolids = (snf > 0) ? Number((fat + snf).toFixed(2)) : 0;
        const ts13 = (milkLiter > 0 && totalSolids > 0) ? Number(((milkLiter * totalSolids) / 13).toFixed(2)) : 0;
        const totalPayable = Number((milkLiter * price).toFixed(2));

        newStops[index] = { ...current, snf, totalSolids, ts13, milkKgs, milkLiter, totalPayable };
      } else {
        newStops[index] = current;
      }
      return { ...prev, stops: newStops };
    });
  };

  const addEmptyStop = () => {
    setFormData(prev => ({
      ...prev,
      stops: [...prev.stops, { ...emptyStop, id: Date.now().toString() }]
    }));
  };

  const removeStop = (id: string) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.filter(s => s.id !== id)
    }));
  };

  const handleUpdateTemplateCustomer = (idx: number, val: string) => {
    setNewRouteTemplateCustomers(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleAddTemplateCustomerRow = () => {
    setNewRouteTemplateCustomers(prev => [...prev, '']);
  };

  const handleRemoveTemplateCustomerRow = (idx: number) => {
    setNewRouteTemplateCustomers(prev => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSaveCustomRouteTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    // Route creation is Admin-only. Milk Tester can only use assigned routes.
    setRouteTemplateErrorMsg('Route creation is only allowed by Admin. Please ask Admin to create and assign a route.');
  };

  const startNew = () => {
    setErrorMsg('');
    setIsEditing(true);
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      routeName: '',
      tankerNumber: '',
      mtName: '',
      stops: [{ ...emptyStop, id: Date.now().toString() }],
      status: 'Draft'
    });
    setShowStopForm(false);
  };

  const startEdit = (col: RouteCollection) => {
    if (col.status !== 'Draft') {
      return;
    }
    setErrorMsg('');
    setIsEditing(true);
    setEditingId(col.id);
    setFormData(col);
    setShowStopForm(false);
  };

  const [errorMsg, setErrorMsg] = useState('');

  const saveCollection = (submit: boolean) => {
    setErrorMsg('');
    if (submit && (!formData.routeName || !formData.tankerNumber)) {
      setErrorMsg("Please fill route name and tanker number before submitting.");
      return;
    }
    if (submit && formData.stops.length === 0) {
      setErrorMsg("Please add at least one stop location before submitting.");
      return;
    }
    if (submit) {
      const emptyStopIndex = formData.stops.findIndex(s => !s.locationName || (!s.milkKgs && !s.milkLiter));
      if (emptyStopIndex >= 0) {
        setErrorMsg(`Stop #${emptyStopIndex + 1} is missing Location Name or milk quantity.`);
        return;
      }
    }
    const finalData = { ...formData, status: submit ? 'Submitted' : 'Draft' } as const;
    if (editingId) {
      updateCollection(editingId, finalData);
    } else {
      addCollection(finalData);
    }

    setIsEditing(false);
    setEditingId(null);
    setSuccessMsg(submit ? 'Route Collection Submitted Successfully!' : 'Route Collection Saved as Draft!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const getSummary = (col: typeof formData) => {
    const totalLocations = col.stops.length;
    const totalMilkLiter = col.stops.reduce((acc, s) => acc + (Number(s.milkLiter) || 0), 0);
    const totalMilkKgs = col.stops.reduce((acc, s) => acc + (Number(s.milkKgs) || 0), 0);
    const totalTS13 = col.stops.reduce((acc, s) => acc + (Number(s.ts13) || 0), 0).toFixed(2);
    const totalPayable = col.stops.reduce((acc, s) => acc + (Number(s.totalPayable) || 0), 0).toFixed(2);
    const avgFat = totalLocations > 0 ? (col.stops.reduce((acc, s) => acc + (Number(s.fat) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    const avgLr = totalLocations > 0 ? (col.stops.reduce((acc, s) => acc + (Number(s.lr) || 0), 0) / totalLocations).toFixed(1) : '0.0';
    const avgSnf = totalLocations > 0 ? (col.stops.reduce((acc, s) => acc + (Number(s.snf) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    const avgTsPercent = totalLocations > 0 ? (col.stops.reduce((acc, s) => acc + (Number(s.totalSolids) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    return { totalLocations, totalMilkLiter, totalMilkKgs, totalTS13, totalPayable, avgFat, avgLr, avgSnf, avgTsPercent };
  };

  const isDriverOrLab = user?.role === 'MilkTester';

  // MilkTester ke liye sirf apne collections dikhao — driverId se match karo
  // Backend already filter kar ke deta hai, ye frontend double-check hai
  const isAssignedCollection = (col: RouteCollection) => {
    if (!isDriverOrLab) return true; // Admin/Accountant sab dekhein
    if (!user?.id) return false;

    // driverId field available ho toh us se match karo (most reliable)
    if ((col as any).driverId) {
      const driverId = typeof (col as any).driverId === 'object'
        ? ((col as any).driverId._id || (col as any).driverId.id)
        : (col as any).driverId;
      return String(driverId) === String(user.id);
    }

    // driverId nahi hai — apni hi collection ho to dikhao (naya collection create ka)
    // Agar koi bhi driverId assign nahi toh MilkTester ko nahi dikhana chahiye
    return false;
  };

  const isAssignedRoute = (route: { tankerNumber?: string; mtName?: string; name: string; assignedMilkTesterIds?: string[] }) => {
    if (!isDriverOrLab) return true;
    // Backend se already filtered hain - sabhi routes show karo
    return true;
  };

  const filteredCollections = collections
    .filter(isAssignedCollection)
    .filter(c => (filterRoute ? c.routeName === filterRoute : true))
    .filter(c => (filterDate ? c.date === filterDate : true))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportToCSV = () => {
    const headers = [
      'Date', 'Route Name', 'Tanker Number', 'Milk Tester Name', 'Status',
      'Stop Serial number', 'Location name', 'Time', 'KG per liter', 'Fat %', 'LR',
      'Temp C', 'SNF %', 'TS %', 'Total TS', 'Milk per KG', 'Price', 'Payable'
    ];

    let csvContent = headers.join(',') + '\n';

    filteredCollections.forEach(col => {
      if (col.stops.length === 0) {
        const row = [
          col.date, `"${col.routeName || ''}"`, `"${col.tankerNumber || ''}"`, `"${col.mtName || ''}"`, col.status,
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ];
        csvContent += row.join(',') + '\n';
      } else {
        col.stops.forEach((stop, idx) => {
          const row = [
            col.date, `"${col.routeName || ''}"`, `"${col.tankerNumber || ''}"`, `"${col.mtName || ''}"`, col.status,
            idx + 1, `"${stop.locationName || ''}"`, stop.time || '', stop.milkLiter || 0, stop.fat || 0, stop.lr || 0,
            stop.temperature || '', stop.snf || 0, stop.totalSolids || 0,
            stop.ts13 || 0, stop.milkKgs || 0, stop.price || '', stop.price ? (stop.totalPayable || 0) : ''
          ];
          csvContent += row.join(',') + '\n';
        });
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `route_collection_${filterDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilteredHistory = () => {
    return collections.filter(c => {
      if (!isAssignedCollection(c)) return false;
      // 1. Route filter
      if (historyRouteFilter && c.routeName !== historyRouteFilter) {
        return false;
      }

      // 2. Date ranges
      const cDateString = c.date; // e.g. "2026-06-15"
      const colDate = new Date(cDateString);
      colDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (historyRange === '1day') {
        return colDate.getTime() === today.getTime();
      } else if (historyRange === '2days') {
        const diffTime = Math.abs(today.getTime() - colDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 2;
      } else if (historyRange === '10days') {
        const diffTime = Math.abs(today.getTime() - colDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 10;
      } else if (historyRange === 'custom') {
        if (historyStartDate && cDateString < historyStartDate) return false;
        if (historyEndDate && cDateString > historyEndDate) return false;
      }
      return true;
    });
  };

  const downloadHistoryCSV = (filteredCols: RouteCollection[]) => {
    const csvContent = [
      ["Date", "Route Name", "Customer Name", "Serial", "Time", "Milk KGs", "Milk Liters", "Fat %", "LR", "SNF %", "TS %", "Total Solids Volume", "Temperature °C", "Status"],
      ...filteredCols.flatMap(c =>
        c.stops.map((s, idx) => [
          c.date,
          c.routeName,
          s.locationName || '',
          (idx + 1).toString(),
          s.time || '',
          s.milkKgs?.toString() || '0',
          s.milkLiter?.toString() || '0',
          s.fat?.toString() || '0',
          s.lr?.toString() || '0',
          s.snf?.toString() || '0',
          s.totalSolids?.toString() || '0',
          s.ts13?.toString() || '0',
          s.temperature?.toString() || '0',
          c.status
        ])
      )
    ]
      .map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute('download', `route_history_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // myRoutes directly API se loaded hain - assigned routes only
  const activeRoutes = myRoutes;
  const matchingRoute = activeRoutes.find(r => r.name === formData.routeName);
  const selectValue = matchingRoute ? `tpl:${matchingRoute.id}` : '';

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-0 rounded-xl sm:bg-transparent">
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
          <Database className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
          <span className="whitespace-nowrap">Route Collection</span>
        </h2>

        {!isEditing && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={startNew}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 sm:py-2 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-colors text-xs sm:text-sm whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4 sm:w-5 h-5 flex-shrink-0" />
              <span>New Collection</span>
            </button>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 animate-fade-in" id="route-collection-form"> <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-3 border-b border-slate-100"> <div> <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2"> <Truck className="w-5 h-5 text-indigo-600" /> <span>{editingId ? 'Edit Collection Details' : 'New Route Collection Entry'}</span> </h3> <p className="text-[11px] text-slate-500 font-sans">Record customer milk volumes and chemical quality specs</p> </div> <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-650 hover:bg-slate-100 border border-slate-250 rounded-lg transition-all bg-white shadow-xs"
          id="btn-back-to-collections"
        > <X className="w-4 h-4 text-slate-500" /> <span>Back to Collections</span> </button> </div> <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            {errorMsg && (
              <div className="col-span-1 md:col-span-5 bg-red-50 text-red-600 p-3 rounded-md text-sm mb-2 border border-red-200">
                {errorMsg}
              </div>
            )}
            <div> <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label> <div className="relative"> <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /> <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            /> </div> </div> <div> <div className="flex justify-between items-center mb-1"> <label className="text-xs font-bold text-indigo-700 flex items-center gap-1"> <span>Select Saved Route</span> <span className="text-[9px] bg-indigo-150 text-indigo-700 px-1 py-0.2 rounded font-black font-mono">Preset</span> </label> </div> <select
              value={selectValue}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setFormData(prev => ({
                    ...prev,
                    routeName: '',
                    tankerNumber: '',
                    mtName: '',
                    stops: [{
                      ...emptyStop,
                      id: Date.now().toString()
                    }]
                  }));
                  return;
                }

                if (val.startsWith('tpl:')) {
                  const rId = val.replace('tpl:', '');
                  const selectedRoute = activeRoutes.find(r => r.id === rId);
                  if (selectedRoute) {
                    setFormData(prev => ({
                      ...prev,
                      routeName: selectedRoute.name,
                      tankerNumber: selectedRoute.tankerNumber || '',
                      mtName: selectedRoute.mtName || '',
                      stops: selectedRoute.stops.map((stopItem, idx) => ({
                        ...emptyStop,
                        id: Date.now().toString() + '-' + idx + '-' + Math.floor(Math.random() * 1000),
                        locationName: stopItem.name,
                        organoTest: 'Pending',
                        glucoseTest: 'Pending',
                        starchTest: 'Pending',
                        aptTest: 'Pending',
                        abTest: 'Pending'
                      }))
                    }));
                  }
                }
              }}
              className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/75 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-900 text-xs"
            > <option value="">-- Choose saved route --</option> <optgroup label="Saved Routes">
                {routesLoading ? (
                  <option disabled value="">Loading your routes...</option>
                ) : activeRoutes.length > 0 ? (
                  activeRoutes.map(r => (
                    <option key={r.id} value={`tpl:${r.id}`}>{r.name} ({r.stops.length} customers)</option>
                  ))
                ) : (
                  <option disabled value="">No routes assigned. Please contact Admin.</option>
                )}
              </optgroup> </select> </div> <div> <label className="block text-sm font-semibold text-slate-700 mb-1">Route Name</label> <input
                type="text"
                value={formData.routeName}
                onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                placeholder="Enter Route Name"
              /> </div> <div> <label className="block text-sm font-semibold text-slate-700 mb-1">Trunk Name</label> <input
                type="text"
                value={formData.tankerNumber}
                onChange={(e) => setFormData({ ...formData, tankerNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-semibold font-mono"
                placeholder="e.g. TNK-123"
              /> </div> <div> <label className="block text-sm font-semibold text-slate-700 mb-1">Milk Tester Name</label> <input
                type="text"
                value={formData.mtName}
                onChange={(e) => setFormData({ ...formData, mtName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                placeholder="Enter Milk Tester Name"
              /> </div> </div> <div className="mb-6"> <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4"> <div className="flex flex-wrap items-center gap-2.5"> <h4 className="font-bold text-slate-800 text-sm">Collection Locations & Quality Log</h4> </div> <button type="button" onClick={addEmptyStop} className="text-indigo-600 font-medium flex items-center text-sm bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100"> <Plus className="w-4 h-4 mr-1" /> Add Row
              </button> </div> <div className="overflow-x-auto border border-slate-200 rounded-lg"> <table className="w-full text-xs text-left text-slate-600 whitespace-nowrap"> <thead className="bg-slate-100 text-slate-705"> <tr> <th className="px-1 py-2 border-b border-r border-slate-300 w-10 text-center font-bold">Move</th> <th className="px-2 py-2 border-b border-r border-slate-300 whitespace-nowrap text-center font-bold">Serial number</th> <th className="px-2 py-2 border-b border-r border-slate-300 whitespace-nowrap min-w-[200px] font-bold text-left">customer name</th> <th className="px-2 py-2 border-b border-r border-slate-300 whitespace-nowrap font-bold text-center">Time</th> <th className="px-2 py-2 border-b border-r border-indigo-200 bg-indigo-50/50 font-bold text-center whitespace-nowrap">Milk  KG</th> <th className="px-2 py-2 border-b border-r border-indigo-350 bg-indigo-100 font-extrabold text-center whitespace-nowrap text-indigo-950">milk litr</th> <th className="px-2 py-2 border-b border-r border-indigo-200 bg-indigo-50/50 font-bold text-center whitespace-nowrap">Fat %</th> <th className="px-2 py-2 border-b border-r border-indigo-200 bg-indigo-50/50 font-bold text-center whitespace-nowrap">LR</th> <th className="px-2 py-2 border-b border-r border-indigo-200 bg-indigo-50/50 font-bold text-center whitespace-nowrap">Temp °C</th> <th className="px-2 py-2 border-b border-r border-indigo-300 bg-indigo-100/30 font-bold text-center whitespace-nowrap">SNF %</th> <th className="px-2 py-2 border-b border-r border-indigo-300 bg-indigo-100/30 font-bold text-center whitespace-nowrap">TS %</th> <th className="px-2 py-2 border-b border-r border-indigo-300 bg-indigo-100/30 font-bold text-center whitespace-nowrap">Total TS</th> <th className="px-2 py-2 border-b text-center font-bold">Actions</th> </tr> </thead> <tbody>
                {formData.stops.map((stop, index) => (
                  <tr
                    key={stop.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`border-b border-slate-200 hover:bg-indigo-50/20 text-center transition-all duration-150 ${draggedIndex === index ? 'opacity-40 bg-indigo-50 border-2 border-dashed border-indigo-300' : ''
                      }`}
                  > <td className="px-1 py-1 border-r border-slate-200 text-center cursor-move text-slate-400 hover:text-indigo-600 transition-colors"> <GripVertical className="w-3.5 h-3.5 mx-auto" /> </td> <td className="px-2 py-1 border-r border-slate-200 font-medium text-slate-500">{index + 1}</td> <td className="px-1 py-1 border-r border-slate-200"> <input type="text" placeholder="customer name" value={stop.locationName} onChange={e => handleStopChange(index, 'locationName', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none text-left" /> </td> <td className="px-1 py-1 border-r border-slate-200"> <input type="time" value={stop.time || ''} onChange={e => handleStopChange(index, 'time', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded px-1 py-1 text-xs focus:outline-none" /> </td> <td className="px-1 py-1 border-r border-indigo-100 bg-indigo-50/30"> <input type="number" placeholder="KGs" value={stop.milkKgs || ''} onChange={e => handleStopChange(index, 'milkKgs', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white rounded px-1 py-1 text-xs text-center w-16 focus:outline-none font-medium" /> </td> <td className="px-1 py-1 border-r border-indigo-250 bg-indigo-100 font-bold text-indigo-950"> <input type="number" step="0.01" placeholder="Liters" value={stop.milkLiter || ''} onChange={e => handleStopChange(index, 'milkLiter', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white rounded px-1 py-1 text-xs text-center w-16 focus:outline-none font-extrabold text-indigo-950" /> </td> <td className="px-1 py-1 border-r border-indigo-100 bg-indigo-50/30"> <input type="number" step="0.01" placeholder="Fat" value={stop.fat || ''} onChange={e => handleStopChange(index, 'fat', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white rounded px-1 py-1 text-xs text-center w-14 focus:outline-none" /> </td> <td className="px-1 py-1 border-r border-indigo-100 bg-indigo-50/30"> <input type="number" step="0.01" placeholder="LR" value={stop.lr || ''} onChange={e => handleStopChange(index, 'lr', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white rounded px-1 py-1 text-xs text-center w-14 focus:outline-none" /> </td> <td className="px-1 py-1 border-r border-indigo-100 bg-indigo-50/30"> <input type="number" placeholder="°C" value={stop.temperature || ''} onChange={e => handleStopChange(index, 'temperature', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white rounded px-1 py-1 text-xs text-center w-12 focus:outline-none" /> </td> <td className="px-2 py-1 border-r border-indigo-200 bg-indigo-100/30 font-medium text-indigo-900">{stop.snf || '-'}</td> <td className="px-2 py-1 border-r border-indigo-200 bg-indigo-100/30 font-medium text-indigo-900">{stop.totalSolids || '-'}</td> <td className="px-2 py-1 border-r border-indigo-200 bg-indigo-100/30 font-bold text-indigo-700">{stop.ts13 || '-'}</td> <td className="px-2 py-1 text-center font-bold"> <button onClick={() => removeStop(stop.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button> </td> </tr>
                ))}
              </tbody> <tfoot>
                  {(() => {
                    const stopsCount = formData.stops.length;
                    const totalMilkKgs = formData.stops.reduce((sum, s) => sum + (Number(s.milkKgs) || 0), 0);
                    const totalMilkLiter = formData.stops.reduce((sum, s) => sum + (Number(s.milkLiter) || 0), 0);
                    const stopsWithFat = formData.stops.filter(s => s.fat && Number(s.fat) > 0);
                    const averageFat = stopsWithFat.length > 0 ? (stopsWithFat.reduce((sum, s) => sum + Number(s.fat), 0) / stopsWithFat.length).toFixed(2) : '0.00';
                    const stopsWithLr = formData.stops.filter(s => s.lr && Number(s.lr) > 0);
                    const averageLr = stopsWithLr.length > 0 ? (stopsWithLr.reduce((sum, s) => sum + Number(s.lr), 0) / stopsWithLr.length).toFixed(1) : '0.0';
                    const stopsWithSnf = formData.stops.filter(s => s.snf && Number(s.snf) > 0);
                    const averageSnf = stopsWithSnf.length > 0 ? (stopsWithSnf.reduce((sum, s) => sum + Number(s.snf), 0) / stopsWithSnf.length).toFixed(2) : '0.00';
                    const stopsWithTS = formData.stops.filter(s => s.totalSolids && Number(s.totalSolids) > 0);
                    const averageTS = stopsWithTS.length > 0 ? (stopsWithTS.reduce((sum, s) => sum + Number(s.totalSolids), 0) / stopsWithTS.length).toFixed(2) : '0.00';
                    const totalTS13 = formData.stops.reduce((sum, s) => sum + (Number(s.ts13) || 0), 0);

                    return (
                      <tr className="bg-indigo-50/70 text-indigo-950 font-black border-t-2 border-indigo-200 text-[11px] hover:bg-indigo-100/50 transition-colors"> <td className="border-r border-slate-200"></td> <td className="px-1 py-1 border-r border-slate-200 text-center font-bold text-slate-500">Totals</td> <td className="px-2 py-1.5 border-r border-slate-200 text-left font-extrabold text-slate-900 bg-indigo-50/20"> <span className="text-[10px] text-slate-400 font-normal mr-1">Total Customers:</span> <span className="text-indigo-900 font-black">{stopsCount}</span> </td>
                        {/* Time */}
                        <td className="border-r border-slate-200"></td>
                        {/* Milk KG */}
                        <td className="px-1 py-1.5 border-r border-indigo-200 bg-indigo-50/40 text-center text-indigo-950"> <span className="block text-[9px] text-slate-400 font-normal">Milk KGs:</span> <strong>{totalMilkKgs.toFixed(1)} kg</strong> </td>
                        {/* Milk Liter */}
                        <td className="px-1 py-1.5 border-r border-indigo-300 bg-indigo-100/80 text-center text-indigo-950"> <span className="block text-[9px] text-indigo-800 font-normal">Milk Liter:</span> <strong>{totalMilkLiter.toFixed(1)} L</strong> </td>
                        {/* Fat */}
                        <td className="px-1 py-1.5 border-r border-indigo-200 bg-indigo-50/40 text-center text-indigo-900 font-bold"> <span className="block text-[9px] text-slate-400 font-normal">Fat:</span> <strong>{averageFat}%</strong> </td>
                        {/* LR */}
                        <td className="px-1 py-1.5 border-r border-indigo-200 bg-indigo-50/40 text-center text-indigo-900 font-bold"> <span className="block text-[9px] text-slate-400 font-normal">LR:</span> <strong>{averageLr}</strong> </td>
                        {/* Temp */}
                        <td className="border-r border-indigo-200"></td>
                        {/* SNF */}
                        <td className="px-1 py-1.5 border-r border-indigo-200 bg-indigo-100/40 text-center text-indigo-900 font-semibold"> <span className="block text-[9px] text-indigo-800/60 font-normal">SNF:</span> <strong>{averageSnf}%</strong> </td>
                        {/* TS */}
                        <td className="px-1 py-1.5 border-r border-indigo-200 bg-indigo-100/40 text-center text-indigo-900 font-semibold"> <span className="block text-[9px] text-indigo-800/60 font-normal">TS:</span> <strong>{averageTS}%</strong> </td>
                        {/* Total TS */}
                        <td className="px-1 py-1.5 border-r border-indigo-200 bg-indigo-100/50 text-center text-emerald-800 font-black"> <span className="block text-[9px] text-emerald-700/60 font-normal">Total TS:</span> <strong>{totalTS13.toFixed(2)}</strong> </td>
                        {/* Actions */}
                        <td></td> </tr>
                    );
                  })()}
                </tfoot> </table> </div>
            {formData.stops.length === 0 && (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-300 rounded-b-lg"> <p className="text-slate-500">No locations added yet. Click "Add Row" to start.</p> </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 mb-6 flex space-x-6 text-sm">
            {(() => {
              const summary = getSummary(formData);
              return (
                <div className="w-full bg-amber-50/60 p-3 rounded-xl border border-amber-100/80 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">

                  {/* Total Locations */}
                  <div className="bg-white/70 p-2 rounded-lg border border-amber-100/50 shadow-sm">
                    <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider mb-0.5 leading-tight">Total Locations</span>
                    <span className="font-bold text-amber-900 text-base">{summary.totalLocations}</span>
                  </div>

                  {/* Total Liters */}
                  <div className="bg-white/70 p-2 rounded-lg border border-amber-100/50 shadow-sm">
                    <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider mb-0.5 leading-tight">Total Liters</span>
                    <span className="font-bold text-amber-900 text-base">{Number(summary.totalMilkLiter || 0).toFixed(2)} L</span>
                  </div>

                  {/* Total KGs */}
                  <div className="bg-white/70 p-2 rounded-lg border border-amber-100/50 shadow-sm">
                    <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider mb-0.5 leading-tight">Total KGs</span>
                    <span className="font-bold text-amber-900 text-base">{Number(summary.totalMilkKgs || 0).toFixed(2)} KG</span>
                  </div>

                  {/* Avg Fat */}
                  <div className="bg-white/70 p-2 rounded-lg border border-amber-100/50 shadow-sm">
                    <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider mb-0.5 leading-tight">Avg Fat</span>
                    <span className="font-bold text-amber-900 text-base">{Number(summary.avgFat || 0).toFixed(2)}%</span>
                  </div>

                  {/* Avg LR */}
                  <div className="bg-white/70 p-2 rounded-lg border border-amber-100/50 shadow-sm">
                    <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider mb-0.5 leading-tight">Avg LR</span>
                    <span className="font-bold text-amber-900 text-base">{Number(summary.avgLr || 0).toFixed(1)}</span>
                  </div>

                  {/* Avg SNF % */}
                  <div className="bg-white/70 p-2 rounded-lg border border-amber-100/50 shadow-sm">
                    <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider mb-0.5 leading-tight">Avg SNF %</span>
                    <span className="font-bold text-amber-900 text-base">{Number(summary.avgSnf || 0).toFixed(2)}%</span>
                  </div>

                  {/* Avg TS % */}
                  <div className="bg-white/70 p-2 rounded-lg border border-amber-100/50 shadow-sm">
                    <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider mb-0.5 leading-tight">Avg TS %</span>
                    <span className="font-bold text-amber-900 text-base">{Number(summary.avgTsPercent || 0).toFixed(2)}%</span>
                  </div>

                  {/* Total TS */}
                  <div className="bg-white/70 p-2 rounded-lg border border-amber-100/50 shadow-sm">
                    <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider mb-0.5 leading-tight">Total TS</span>
                    <span className="font-bold text-amber-900 text-base">{Number(summary.totalTS13 || 0).toFixed(2)}</span>
                  </div>

                </div>
              );
            })()}
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 p-4 rounded-lg gap-3 sm:gap-0">

            <button
              onClick={() => setIsEditing(false)}
              className="w-full sm:w-auto order-last sm:order-first text-slate-600 hover:text-slate-900 font-medium px-4 py-2 text-center text-sm"
            >
              Cancel
            </button>

            {/* Action Buttons Group */}
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3 sm:gap-0">
              <button
                onClick={() => saveCollection(false)}
                className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2.5 sm:py-2 rounded-md font-medium text-sm transition-colors"
              >
                Save as Draft
              </button>

              <button
                onClick={() => saveCollection(true)}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 sm:py-2 rounded-md font-medium shadow-sm text-sm transition-colors"
              >
                Submit Route
              </button>
            </div>

          </div>

        </div>
      )}

      {/* List Collections */}
      {!isEditing && (
        <>
          {/* Visual Tab Switcher */}
          <div className="flex border border-indigo-100 mb-6 bg-slate-50 p-1 rounded-xl gap-2 max-w-md"> <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-xs transition-all duration-155 focus:outline-none ${activeTab === 'active'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-white'
              }`}
          > <Database className="w-4 h-4" /> <span>Live Dashboard</span> </button> <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-xs transition-all duration-155 focus:outline-none ${activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-indigo-610 hover:bg-white'
              }`}
          > <History className="w-4 h-4" /> <span>History & Reports</span> </button> </div>

          {activeTab === 'active' ? (
            <>
              {successMsg && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center space-x-2 shadow-sm font-semibold animate-fade-in" id="driver-success-toast"> <span>{successMsg}</span> </div>
              )}
              <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"> <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"> <select
                value={filterRoute}
                onChange={e => setFilterRoute(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
              > <option value="">All Route Types</option>
                {Array.from(new Set(collections.map(c => c.routeName))).filter(Boolean).map((routeName, idx) => (
                  <option key={idx} value={routeName}>{routeName}</option>
                ))}
              </select> <div className="flex items-center gap-2"> <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate('')}
                      className="text-slate-500 hover:text-slate-700 font-medium px-2"
                    >
                      Clear Date
                    </button>
                  )}
                </div> </div> <button
                  onClick={exportToCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center space-x-2 transition-colors whitespace-nowrap"
                > <Download className="w-4 h-4" /> <span>Export to Excel</span> </button> </div> <div className="space-y-8">
                {filteredCollections.map(col => {
                  const summary = getSummary(col);
                  return (
                    <div key={col.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:border-indigo-300 transition-colors"> <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center"> <div> <h3 className="font-bold text-slate-800 text-lg flex items-center mb-1"> <Truck className="w-5 h-5 mr-2 text-indigo-500" /> {col.routeName}
                    </h3> <p className="text-sm text-slate-500">
                        {col.date} | Tanker: <span className="font-medium text-slate-700">{col.tankerNumber}</span> | Milk Tester: <span className="font-medium text-slate-700">{col.mtName}</span> </p> </div> <div className="text-right"> <span className={`inline-block px-3 py-1 rounded text-xs font-bold mb-2 ${col.status === 'Draft' ? 'bg-slate-200 text-slate-700' :
                            col.status === 'Submitted' ? 'bg-amber-100 text-amber-700' :
                              col.status === 'Received' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-green-100 text-green-700'
                          }`}>
                          {col.status}
                        </span> <div className="flex gap-2 justify-end">
                          {col.status === 'Draft' ? (
                            <> <button onClick={() => startEdit(col)} className="text-indigo-600 text-sm font-medium hover:text-indigo-800 flex items-center bg-indigo-50 px-2 py-1 rounded"> <Edit className="w-4 h-4 mr-1" /> Edit Draft
                            </button>
                              {user?.role === 'Admin' && (
                                <button onClick={() => deleteCollection(col.id)} className="text-red-500 text-sm font-medium hover:text-red-700 flex items-center bg-red-50 px-2 py-1 rounded"> <Trash2 className="w-4 h-4 mr-1" /> Delete
                                </button>
                              )}
                            </>
                          ) : col.status === 'Submitted' && receivingId !== col.id ? (
                            <button onClick={() => startReceiving(col.id)} className="bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center px-3 py-1 rounded shadow-sm">
                              Receive Collection
                            </button>
                          ) : (
                            <span className="text-slate-400 text-sm italic">Locked</span>
                          )}
                        </div> </div> </div>

                      {/* ── 1. TABLE SECTION WITH FIXED FOOTER ── */}
                      <div className="overflow-x-auto font-sans">
                        <table className="w-full text-xs text-left text-slate-600 whitespace-nowrap">
                          <thead className="bg-slate-100/50 text-slate-700">
                            <tr>
                              <th className="px-2 py-1 border-b border-r border-slate-300 whitespace-nowrap">Serial number</th>
                              <th className="px-2 py-1 border-b border-r border-slate-300 whitespace-nowrap">customer name</th>
                              <th className="px-2 py-1 border-b border-r border-slate-300 whitespace-nowrap">Time</th>
                              <th className="px-2 py-1 border-b border-r border-indigo-200 whitespace-nowrap bg-indigo-50/50">Milk KG</th>
                              <th className="px-2 py-1 border-b border-r border-indigo-250 bg-indigo-100 font-semibold text-center whitespace-nowrap text-indigo-950">milk litr</th>
                              <th className="px-2 py-1 border-b border-r border-indigo-200 whitespace-nowrap bg-indigo-50/50">Fat %</th>
                              <th className="px-2 py-1 border-b border-r border-indigo-200 whitespace-nowrap bg-indigo-50/50">LR</th>
                              <th className="px-2 py-1 border-b border-r border-indigo-200 whitespace-nowrap bg-indigo-50/50">Temp °C</th>
                              <th className="px-2 py-1 border-b border-r border-indigo-300 whitespace-nowrap bg-indigo-100/50">SNF %</th>
                              <th className="px-2 py-1 border-b border-r border-indigo-300 whitespace-nowrap bg-indigo-100/50">TS %</th>
                              <th className="px-2 py-1 border-b border-r border-indigo-300 whitespace-nowrap bg-indigo-100/50">Total TS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {col.stops.map((stop, index) => (
                              <tr key={stop.id} className="border-b border-slate-200 hover:bg-slate-50 text-center">
                                <td className="px-2 py-2 border-r border-slate-200">{index + 1}</td>
                                <td className="px-2 py-2 border-r border-slate-200 font-medium text-slate-800 text-left">{stop.locationName}</td>
                                <td className="px-2 py-2 border-r border-slate-200">{stop.time}</td>
                                <td className="px-2 py-2 border-r border-indigo-100 bg-indigo-50/30 font-medium">{stop.milkKgs || 0}</td>
                                <td className="px-2 py-2 border-r border-indigo-250 bg-indigo-100 text-indigo-950 font-bold">{stop.milkLiter || 0}</td>
                                <td className="px-2 py-2 border-r border-indigo-100 bg-indigo-50/30">{stop.fat}</td>
                                <td className="px-2 py-2 border-r border-indigo-100 bg-indigo-50/30">{stop.lr}</td>
                                <td className="px-2 py-2 border-r border-indigo-100 bg-indigo-50/30">{stop.temperature || '-'}</td>
                                <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-100/30 text-indigo-900 font-medium">{stop.snf}</td>
                                <td className="px-2 py-2 border-r border-indigo-200 bg-indigo-100/30 text-indigo-900 font-medium">{stop.totalSolids}</td>
                                <td className="px-2 py-2 border-r text-indigo-700 font-bold">{stop.ts13}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-indigo-50/40 text-indigo-950 font-bold border-t border-indigo-200">
                            <tr className="text-center text-[11px] h-8 font-sans">
                              {/* 1. Serial Number */}
                              <td className="px-2 py-1.5 border-r border-slate-200 font-mono text-[10px] text-slate-400">Total</td>
                              {/* 2. Customer Name */}
                              <td className="px-2 py-1.5 border-r border-slate-200 text-left font-black text-slate-800">
                                {summary.totalLocations} Customers
                              </td>
                              {/* 3. Time */}
                              <td className="border-r border-slate-200"></td>
                              {/* 4. Milk KG (Fixed precision to 2 decimal places) */}
                              <td className="px-2 py-1.5 border-r border-indigo-200 font-extrabold bg-indigo-50/10 text-indigo-900">
                                {Number(summary.totalMilkKgs).toFixed(2)} kg
                              </td>
                              {/* 5. Milk Liter */}
                              <td className="px-2 py-1.5 border-r border-indigo-250 bg-indigo-100 text-indigo-950 font-black">
                                {Number(summary.totalMilkLiter).toFixed(2)} L
                              </td>
                              {/* 6. Fat % */}
                              <td className="px-2 py-1.5 border-r border-indigo-200 font-semibold">
                                {Number(summary.avgFat).toFixed(2)}%
                              </td>
                              {/* 7. LR */}
                              <td className="px-2 py-1.5 border-r border-indigo-200 font-mono">
                                {col.stops.filter(s => s.lr && Number(s.lr) > 0).length > 0
                                  ? (col.stops.reduce((sum, s) => sum + Number(s.lr || 0), 0) / col.stops.filter(s => s.lr && Number(s.lr) > 0).length).toFixed(1)
                                  : '-'}
                              </td>
                              {/* 8. Temp °C */}
                              <td className="border-r border-indigo-200"></td>
                              {/* 9. SNF % */}
                              <td className="px-2 py-1.5 border-r border-indigo-200 font-semibold bg-indigo-100/10">
                                {Number(summary.avgSnf).toFixed(2)}%
                              </td>
                              {/* 10. TS % */}
                              <td className="px-2 py-1.5 border-r border-indigo-200 font-semibold bg-indigo-100/10">
                                {Number(summary.avgTsPercent).toFixed(2)}%
                              </td>
                              {/* 11. Total TS */}
                              <td className="px-2 py-1.5 border-indigo-200 text-emerald-800 font-extrabold">
                                {Number(summary.totalTS13).toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* ── YELLOW SUMMARY CARDS SECTION (MOBILE PAR 2 CARDS PER ROW) ── */}
                      <div className="bg-amber-50 p-3 border-t border-amber-200 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-sm">

                        {/* Card 1 */}
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between">
                          <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider leading-tight mb-1">Total Locations</span>
                          <span className="font-bold text-amber-900 text-base leading-none">{summary.totalLocations}</span>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between">
                          <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider leading-tight mb-1">Total Liters</span>
                          <span className="font-bold text-amber-900 text-base leading-none">{Number(summary.totalMilkLiter).toFixed(2)} L</span>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between">
                          <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider leading-tight mb-1">Total KGs</span>
                          <span className="font-bold text-amber-900 text-base leading-none">{Number(summary.totalMilkKgs).toFixed(2)} KG</span>
                        </div>

                        {/* Card 4 */}
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between">
                          <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider leading-tight mb-1">Avg Fat</span>
                          <span className="font-bold text-amber-900 text-base leading-none">{Number(summary.avgFat).toFixed(2)}%</span>
                        </div>

                        {/* Card 5 */}
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between">
                          <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider leading-tight mb-1">Avg LR</span>
                          <span className="font-bold text-amber-900 text-base leading-none">{Number(summary.avgLr).toFixed(1)}</span>
                        </div>

                        {/* Card 6 */}
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between">
                          <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider leading-tight mb-1">Avg SNF %</span>
                          <span className="font-bold text-amber-900 text-base leading-none">{Number(summary.avgSnf).toFixed(2)}%</span>
                        </div>

                        {/* Card 7 */}
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between">
                          <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider leading-tight mb-1">Avg TS %</span>
                          <span className="font-bold text-amber-900 text-base leading-none">{Number(summary.avgTsPercent).toFixed(2)}%</span>
                        </div>

                        {/* Card 8 */}
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between">
                          <span className="text-amber-800 font-semibold block uppercase text-[10px] tracking-wider leading-tight mb-1">Total TS</span>
                          <span className="font-bold text-amber-900 text-base leading-none">{Number(summary.totalTS13).toFixed(2)}</span>
                        </div>

                      </div>


                      {/* Receiving Form */}
                      {receivingId === col.id && (
                        <div className="bg-slate-50 p-5 border-t border-slate-200"> <h4 className="font-bold text-slate-800 mb-4 flex items-center"> <Download className="w-5 h-5 mr-2 text-emerald-600" /> Plant / Chilling Center Receiving
                        </h4>
                          {receivingErrorMsg && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4 border border-red-200 font-bold" id="receiving-error">
                              {receivingErrorMsg}
                            </div>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4 text-sm"> <div className="col-span-2"> <label className="block text-xs font-semibold text-slate-600 mb-1">Receiving Location Name</label> <input type="text" value={receivingData.locationName || ''} onChange={e => handleReceivingChange('locationName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500" placeholder="e.g. Main Plant" /> </div> <div> <label className="block text-xs font-semibold text-slate-600 mb-1">Time</label> <input type="time" value={receivingData.time || ''} onChange={e => handleReceivingChange('time', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500" /> </div> <div> <label className="block text-xs font-semibold text-slate-600 mb-1">Milk KGs <span className="text-red-500">*</span></label> <input type="number" step="0.01" value={receivingData.milkKgs || ''} onChange={e => handleReceivingChange('milkKgs', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-bold bg-amber-50" placeholder="KGs" /> </div> <div> <label className="block text-xs font-semibold text-slate-600 mb-1">Milk Liters <span className="text-red-500">*</span></label> <input type="number" step="0.01" value={receivingData.milkLiter || ''} onChange={e => handleReceivingChange('milkLiter', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-bold bg-amber-50" placeholder="Liters" /> </div> <div> <label className="block text-xs font-semibold text-slate-600 mb-1">Fat %</label> <input type="number" step="0.01" value={receivingData.fat || ''} onChange={e => handleReceivingChange('fat', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500" /> </div> <div> <label className="block text-xs font-semibold text-slate-600 mb-1">LR</label> <input type="number" step="0.01" value={receivingData.lr || ''} onChange={e => handleReceivingChange('lr', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500" /> </div> <div> <label className="block text-xs font-semibold text-slate-600 mb-1">SNF % (Auto)</label> <input type="number" value={receivingData.snf || ''} disabled className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-100 text-slate-500" /> </div> <div> <label className="block text-xs font-semibold text-slate-600 mb-1">Temp °C</label> <input type="number" step="0.1" value={receivingData.temperature || ''} onChange={e => handleReceivingChange('temperature', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500" /> </div> </div> <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200"> <button onClick={cancelReceiving} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancel</button> <button onClick={() => submitReceiving(col)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-sm flex items-center"> <Save className="w-4 h-4 mr-2" /> Submit Receiving
                          </button> </div> </div>
                      )}

                      {/* Received Data & Loss Summary */}
                      {(col.status === 'Received' || col.status === 'Lab Tested') && col.receiving && (
                        <div className="bg-emerald-50 p-5 border-t border-emerald-100">
                          <h4 className="font-bold text-emerald-900 mb-3 flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-emerald-600" />
                            Received at {col.receiving.locationName}
                            <span className="ml-2 text-emerald-700 text-sm font-normal">({col.receiving.time})</span>
                          </h4>

                          {(() => {
                            const recLiters = Number(col.receiving.milkLiter || 0);
                            const recKgs = Number(col.receiving.milkKgs || 0);
                            const recFat = Number(col.receiving.fat || 0);
                            const recLr = Number(col.receiving.lr || 0);
                            const recSnf = Number(col.receiving.snf || 0);
                            const recTsPct = Number((recFat + recSnf).toFixed(2));
                            const recTotalTs = Number(((recLiters * recTsPct) / 13).toFixed(2));

                            // Collection averages (from stops)
                            const colLiters = summary.totalMilkLiter;
                            const colKgs = summary.totalMilkKgs;
                            const colFat = Number(summary.avgFat);
                            const colLr = col.stops.filter(s => Number(s.lr) > 0).length > 0
                              ? Number((col.stops.reduce((a, s) => a + Number(s.lr || 0), 0) / col.stops.filter(s => Number(s.lr) > 0).length).toFixed(1))
                              : 0;
                            const colSnf = Number(summary.avgSnf);
                            const colTsPct = Number(summary.avgTsPercent);
                            const colTotalTs = Number(summary.totalTS13);

                            // Differences (received - collected)
                            const diffLiters = Number((recLiters - colLiters).toFixed(2));
                            const diffKgs = Number((recKgs - colKgs).toFixed(2));
                            const diffFat = Number((recFat - colFat).toFixed(2));
                            const diffLr = Number((recLr - colLr).toFixed(1));
                            const diffSnf = Number((recSnf - colSnf).toFixed(2));
                            const diffTsPct = Number((recTsPct - colTsPct).toFixed(2));
                            const diffTotalTs = Number((recTotalTs - colTotalTs).toFixed(2));

                            const diffStyle = (v: number) =>
                              v > 0 ? 'text-emerald-600 font-bold' :
                                v < 0 ? 'text-red-600 font-bold' :
                                  'text-slate-500 font-medium';

                            const diffLabel = (v: number, unit = '') =>
                              (v > 0 ? '+' : '') + v.toFixed(unit === 'LR' ? 1 : 2) + (unit && unit !== 'LR' ? unit : '');

                            return (
                              <>
                                {/* ── Comparison Table ── */}
                                <div className="overflow-x-auto mb-4">
                                  <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">
                                        <th className="px-3 py-2 text-left border-r border-slate-200">Metric</th>
                                        <th className="px-3 py-2 text-center border-r border-slate-200 bg-indigo-50 text-indigo-700">Collected (Stops)</th>
                                        <th className="px-3 py-2 text-center border-r border-slate-200 bg-emerald-50 text-emerald-700">Received (Plant)</th>
                                        <th className="px-3 py-2 text-center text-slate-700">Difference</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                      {[
                                        { label: 'Milk Liters', col: `${colLiters.toFixed(2)} L`, rec: `${recLiters.toFixed(2)} L`, diff: diffLiters, unit: ' L' },
                                        { label: 'Milk KGs', col: `${colKgs.toFixed(2)} KG`, rec: `${recKgs.toFixed(2)} KG`, diff: diffKgs, unit: ' KG' },
                                        { label: 'Fat %', col: `${colFat.toFixed(2)}%`, rec: `${recFat.toFixed(2)}%`, diff: diffFat, unit: '%' },
                                        { label: 'LR', col: `${colLr.toFixed(1)}`, rec: `${recLr.toFixed(1)}`, diff: diffLr, unit: 'LR' },
                                        { label: 'SNF %', col: `${colSnf.toFixed(2)}%`, rec: `${recSnf.toFixed(2)}%`, diff: diffSnf, unit: '%' },
                                        { label: 'TS %', col: `${colTsPct.toFixed(2)}%`, rec: `${recTsPct.toFixed(2)}%`, diff: diffTsPct, unit: '%' },
                                        { label: 'Total TS', col: `${colTotalTs.toFixed(2)}`, rec: `${recTotalTs.toFixed(2)}`, diff: diffTotalTs, unit: '' },
                                      ].map(row => (
                                        <tr key={row.label} className="hover:bg-slate-50">
                                          <td className="px-3 py-2 font-semibold text-slate-700 border-r border-slate-100">{row.label}</td>
                                          <td className="px-3 py-2 text-center text-indigo-800 font-mono border-r border-slate-100 bg-indigo-50/40">{row.col}</td>
                                          <td className="px-3 py-2 text-center text-emerald-800 font-mono border-r border-slate-100 bg-emerald-50/40">{row.rec}</td>
                                          <td className={`px-3 py-2 text-center font-mono ${diffStyle(row.diff)}`}>
                                            {diffLabel(row.diff, row.unit)}
                                            {row.diff < 0 && <span className="ml-1 text-[9px] text-red-400">(loss)</span>}
                                            {row.diff > 0 && <span className="ml-1 text-[9px] text-emerald-500">(gain)</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* ── Milk KG / Liter Loss Summary Cards ── */}
                                <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm">
                                  <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wide mb-3 flex items-center justify-between">
                                    <span>Submitted Back Deductions Summary</span>
                                    <span className="text-xs text-indigo-500 font-normal">Remaining Quantity After Deducting Collected Stops</span>
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                                      <span className="block text-slate-500 text-[10px] font-bold uppercase mb-0.5">Total Submitted Back (at Plant)</span>
                                      <div className="font-black text-base text-emerald-700">{recKgs.toLocaleString()} KG</div>
                                      <div className="text-[10px] text-slate-400">({recLiters.toLocaleString()} L)</div>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                                      <span className="block text-slate-500 text-[10px] font-bold uppercase mb-0.5">Total Collected (from stops)</span>
                                      <div className="font-black text-base text-indigo-700">{colKgs.toLocaleString()} KG</div>
                                      <div className="text-[10px] text-slate-400">({colLiters.toLocaleString()} L)</div>
                                    </div>
                                    <div className={`p-2.5 rounded border shadow-inner ${diffKgs >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'
                                      }`}>
                                      <span className="block text-slate-500 text-[10px] font-bold uppercase mb-0.5">Remaining Submitted Quantity</span>
                                      <div className="font-extrabold text-lg">
                                        {diffKgs >= 0 ? '+' : ''}{diffKgs.toFixed(2)} KG
                                      </div>
                                      <div className="text-[10px] font-medium opacity-80">
                                        ({diffLiters >= 0 ? '+' : ''}{diffLiters.toFixed(2)} L equivalent)
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )
                })}
                {filteredCollections.length === 0 && (
                  <div className="col-span-full py-12 text-center"> <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" /> <p className="text-slate-500 font-medium">No route collections recorded yet.</p> </div>
                )}
              </div> </>
          ) : (
            /* History & report tab component */
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6"> <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center pb-4 border-b border-slate-100 animate-fade-in font-sans"> <div> <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5"> <History className="w-4 h-4 text-indigo-600" /> <span>Historical Report Extractor</span> </h3> <p className="text-[11px] text-slate-500">Filter, analyze and extract custom multi-day historical collection logs</p> </div> <button
              onClick={() => downloadHistoryCSV(getFilteredHistory())}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all duration-150 shadow-xs"
            > <FileSpreadsheet className="w-4 h-4" /> <span>Download History File</span> </button> </div>

              {/* Extraction Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs"> <div> <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">Route Group Filter</label> <select
                value={historyRouteFilter}
                onChange={(e) => setHistoryRouteFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg text-xs"
              > <option value="">-- All Route Presets --</option>
                {Array.from(new Set(collections.map(c => c.routeName))).filter(Boolean).map((rt, idx) => (
                  <option key={idx} value={rt}>{rt}</option>
                ))}
              </select> </div> <div> <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">Select Custom Range Duration</label> <select
                value={historyRange}
                onChange={(e) => setHistoryRange(e.target.value as any)}
                className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg text-xs"
              > <option value="all">All Days (Show Full Index)</option> <option value="1day">1 Day (Today)</option> <option value="2days">2 Days (Last 48 Hours)</option> <option value="10days">10 Days history</option> <option value="custom">Custom Date Range...</option> </select> </div>

                {historyRange === 'custom' && (
                  <> <div> <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">Start Date</label> <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg text-xs"
                  /> </div> <div> <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">End Date</label> <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg text-xs"
                  /> </div> </>
                )}
              </div>

              {/* Matched Reports Summary */}
              {(() => {
                const hist = getFilteredHistory();
                const totalMatStops = hist.reduce((acc, c) => acc + c.stops.length, 0);
                const totalLiters = hist.reduce((acc, c) => acc + c.stops.reduce((sum, s) => sum + (Number(s.milkLiter) || 0), 0), 0);
                const totalKgs = hist.reduce((acc, c) => acc + c.stops.reduce((sum, s) => sum + (Number(s.milkKgs) || 0), 0), 0);
                const totalFlatFat = hist.reduce((acc, c) => acc + c.stops.reduce((sum, s) => sum + (Number(s.fat) || 0), 0), 0);
                const avgFat = totalMatStops > 0 ? (totalFlatFat / totalMatStops).toFixed(2) : '0.00';

                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"> <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100/55 flex flex-col justify-center"> <span className="text-[9px] uppercase font-bold text-indigo-700 tracking-wider">Matched Sheets</span> <span className="text-sm font-black text-indigo-950 mt-1">{hist.length} route runs</span> </div> <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100/55 flex flex-col justify-center"> <span className="text-[9px] uppercase font-bold text-indigo-700 tracking-wider">Matched Stops</span> <span className="text-sm font-black text-indigo-950 mt-1">{totalMatStops} locations</span> </div> <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100/55 flex flex-col justify-center"> <span className="text-[9px] uppercase font-bold text-indigo-700 tracking-wider">Extracted Volume</span> <span className="text-sm font-black text-indigo-950 mt-1">{totalLiters.toFixed(1)} L <span className="text-[10px] font-normal text-slate-500">({totalKgs.toFixed(1)} KG)</span></span> </div> <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100/55 flex flex-col justify-center"> <span className="text-[9px] uppercase font-bold text-indigo-700 tracking-wider">Overall Avg Fat %</span> <span className="text-sm font-black text-indigo-950 mt-1">{avgFat}%</span> </div> </div>
                );
              })()}

              {/* Grouped results view */}
              <div className="space-y-4 pt-2 font-sans"> <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Historical Records Detail List</h4>
                {getFilteredHistory().length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 border border-slate-150 rounded-xl"> <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" /> <p className="text-xs text-slate-500 font-medium font-sans">No historical records match your current filters.</p> </div>
                ) : (
                  getFilteredHistory().map((col) => {
                    const sum = getSummary(col);
                    return (
                      <div key={col.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-indigo-200 transition-colors bg-white"> <div className="p-3 bg-slate-50/85 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-2 border-b"> <div> <span className="text-xs font-black text-indigo-900 uppercase tracking-tight flex items-center gap-1"> <Truck className="w-3.5 h-3.5 text-indigo-600" /> <span>{col.routeName}</span> </span> <span className="text-[10px] text-slate-500 ml-2">Date: <strong className="text-slate-700">{col.date}</strong> • Tanker: <strong className="text-slate-700">{col.tankerNumber || '-'}</strong> • Milk Tester: <strong className="text-slate-700">{col.mtName || '-'}</strong></span> </div> <div> <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${col.status === 'Draft' ? 'bg-slate-200 text-slate-700' :
                          col.status === 'Submitted' ? 'bg-amber-100 text-amber-700' :
                            col.status === 'Received' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-green-100 text-green-800'
                        }`}>{col.status}</span> </div> </div> <div className="overflow-x-auto text-[11px]"> <table className="w-full text-left text-slate-600 whitespace-nowrap"> <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider"> <tr> <th className="px-3 py-1.5 font-bold">#</th> <th className="px-3 py-1.5 font-bold">customer name</th> <th className="px-3 py-1.5 font-bold text-center">Time</th> <th className="px-3 py-1.5 font-bold text-center">Milk Liters</th> <th className="px-3 py-1.5 font-bold text-center">Milk KG</th> <th className="px-3 py-1.5 font-bold text-center">Fat %</th> <th className="px-3 py-1.5 font-bold text-center">LR</th> <th className="px-3 py-1.5 font-bold text-center">SNF %</th> <th className="px-3 py-1.5 font-bold text-center">TS %</th> <th className="px-3 py-1.5 font-bold text-center">Total TS</th> </tr> </thead> <tbody>
                          {col.stops.map((stop, sidx) => (
                            <tr key={stop.id} className="border-b border-slate-100 hover:bg-slate-50/50"> <td className="px-3 py-1.5 text-slate-400 font-mono">{sidx + 1}</td> <td className="px-3 py-1.5 text-slate-900 font-bold">{stop.locationName || ''}</td> <td className="px-3 py-1.5 text-center font-mono text-slate-500">{stop.time || '-'}</td> <td className="px-3 py-1.5 text-center font-bold text-indigo-900 bg-indigo-50/10">{stop.milkLiter || 0} L</td> <td className="px-3 py-1.5 text-center font-mono">{stop.milkKgs || 0} kg</td> <td className="px-3 py-1.5 text-center text-amber-800 font-semibold">{stop.fat}%</td> <td className="px-3 py-1.5 text-center font-mono">{stop.lr}</td> <td className="px-3 py-1.5 text-center font-mono">{stop.snf}%</td> <td className="px-3 py-1.5 text-center font-mono">{stop.totalSolids}%</td> <td className="px-3 py-1.5 text-center font-bold text-emerald-800">{stop.ts13}</td> </tr>
                          ))}
                        </tbody> <tfoot className="bg-slate-100/50 text-slate-800 font-bold border-t border-slate-200 text-[10px]"> <tr className="text-center font-sans"> <td className="px-3 py-2 font-mono text-slate-400 text-[10px]">Total</td> <td className="px-3 py-2 text-left text-indigo-950 font-black">
                          {sum.totalLocations} Customers
                        </td> <td></td> <td className="px-3 py-2 text-indigo-900 font-extrabold">{sum.totalMilkLiter} L</td> <td className="px-3 py-2 text-slate-800 font-semibold">{sum.totalMilkKgs} kg</td> <td className="px-3 py-2 text-amber-800 font-semibold">{sum.avgFat}%</td> <td className="px-3 py-2 font-mono">
                            {(() => {
                              const stopsWithLr = col.stops.filter(s => s.lr && Number(s.lr) > 0);
                              return stopsWithLr.length > 0 ? (stopsWithLr.reduce((tot, s) => tot + Number(s.lr), 0) / stopsWithLr.length).toFixed(1) : '-';
                            })()}
                          </td> <td className="px-3 py-2 font-mono">{sum.avgSnf}%</td> <td className="px-3 py-2 font-mono">{sum.avgTsPercent}%</td> <td className="px-3 py-2 text-emerald-800 font-extrabold">{sum.totalTS13}</td> </tr> </tfoot> </table> </div> </div>
                    );
                  })
                )}
              </div> </div>
          )}
        </>
      )}

      {showCreateRouteDialog && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="route-template-modal"> <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
          {/* Banner header */}
          <div className="bg-indigo-600 px-6 py-4 text-white flex justify-between items-center"> <div> <h3 className="font-black text-base tracking-tight flex items-center gap-2"> <Truck className="w-5 h-5" /> <span>Create New Route Template</span> </h3> <p className="text-xs text-indigo-100 mt-0.5">Define custom route names and prefill customer names</p> </div> <button
            type="button"
            onClick={() => setShowCreateRouteDialog(false)}
            className="text-indigo-100 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          > <X className="w-5 h-5" /> </button> </div> <form onSubmit={handleSaveCustomRouteTemplate} className="p-6 space-y-4">
            {routeTemplateErrorMsg && (
              <div className="bg-red-50 text-red-650 border border-red-200 p-3 rounded-lg text-xs font-semibold">
                {routeTemplateErrorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3"> <div> <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Route Name</label> <input
              type="text"
              value={newRouteTemplateName}
              onChange={(e) => setNewRouteTemplateName(e.target.value)}
              placeholder="e.g. Route 11, Sialkot milk run"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800"
              required
            /> </div> <div> <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Trunk Name</label> <input
              type="text"
              value={newRouteTemplateTanker}
              onChange={(e) => setNewRouteTemplateTanker(e.target.value)}
              placeholder="e.g. TNK-789"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800"
              required
            /> </div> <div> <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Milk Tester Name</label> <input
              type="text"
              value={newRouteTemplateMt}
              onChange={(e) => setNewRouteTemplateMt(e.target.value)}
              placeholder="e.g. Ali Ahmed"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800"
              required
            /> </div> </div> <div> <div className="flex justify-between items-center mb-1.5"> <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Customer Names</label> <button
              type="button"
              onClick={handleAddTemplateCustomerRow}
              className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-black"
            > <Plus className="w-3.5 h-3.5" /> <span>Add Customer</span> </button> </div> <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 border border-slate-150 p-2 rounded-lg bg-slate-50/50">
                {newRouteTemplateCustomers.map((customer, idx) => (
                  <div key={idx} className="flex items-center gap-2"> <span className="text-[10px] font-mono font-bold text-slate-400 w-5 text-right">{idx + 1}.</span> <input
                    type="text"
                    value={customer}
                    onChange={(e) => handleUpdateTemplateCustomer(idx, e.target.value)}
                    placeholder={`Enter customer name`}
                    className="flex-1 px-3 py-1.5 border border-slate-250 bg-white rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
                  /> <button
                    type="button"
                    onClick={() => handleRemoveTemplateCustomerRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                    title="Remove customer row"
                  > <Trash2 className="w-3.5 h-3.5" /> </button> </div>
                ))}
              </div> <p className="text-[10px] text-slate-400 font-sans mt-1.5">Note: Empty lines are automatically excluded when saving.</p> </div> <div className="flex justify-end gap-3 pt-3 border-t border-slate-150"> <button
                type="button"
                onClick={() => setShowCreateRouteDialog(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button> <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
              > <Save className="w-4 h-4" /> <span>Save & Apply Route</span> </button> </div> </form> </div> </div>
      )}
    </div>
  );
}
