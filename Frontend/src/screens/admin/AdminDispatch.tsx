import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatchContext, RouteCollectionEntry, DispatchRecord } from '../../contexts/DispatchContext';
import { useVehicleContext } from '../../contexts/VehicleContext';
import { Plus, Save, Truck, ArrowRight, X, FileText, Search, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDispatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatches, addDispatch, markDispatchAsSold, receiveDispatch } = useDispatchContext();
  const { vehicles } = useVehicleContext();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedDispatchId, setSelectedDispatchId] = useState('');

  // History Filter States
  const [filterMode, setFilterMode] = useState<'day' | 'month' | 'custom'>('day');
  const [dateFilter, setDateFilter] = useState({
    date: new Date().toISOString().split('T')[0],
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [newDispatch, setNewDispatch] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    vehicleNumber: '',
    roadName: '',
    trunkName: '',
    driverName: '',
    driverPhone: '',
  });

  const getEmptyEntry = (): RouteCollectionEntry => ({
    id: Math.random().toString(36).substring(7),
    customerName: '',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    milkKg: '',
    milkLiter: '',
    fat: '',
    lr: '',
    temp: '',
    snf: '',
    ts: '',
    totalTs: ''
  });

  const [entries, setEntries] = useState<RouteCollectionEntry[]>([getEmptyEntry()]);

  const calculateFields = (ent: RouteCollectionEntry) => {
    const fat = Number(ent.fat) || 0;
    const lr = Number(ent.lr) || 0;
    const liter = Number(ent.milkLiter) || 0;

    let snf = 0;
    let ts = 0;
    let totalTs = 0;

    if (fat > 0 && lr > 0) {
      snf = (0.25 * lr) + (0.22 * fat) + 0.72;
      ts = fat + snf;
    }
    if (liter > 0 && ts > 0) {
      totalTs = (liter * ts) / 13;
    }

    return {
      ...ent,
      snf: snf > 0 ? parseFloat(snf.toFixed(2)) : ('' as const),
      ts: ts > 0 ? parseFloat(ts.toFixed(2)) : ('' as const),
      totalTs: totalTs > 0 ? parseFloat(totalTs.toFixed(2)) : ('' as const)
    };
  };

  const updateEntry = (id: string, field: keyof RouteCollectionEntry, value: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id === id) {
        let updated: RouteCollectionEntry = { ...e, [field]: value };

        // Auto-convert liter to kg and vice versa
        if (field === 'milkLiter') {
          const liters = Number(value);
          updated.milkKg = value !== '' && !isNaN(liters) ? parseFloat((liters * 1.03).toFixed(2)) : '';
        } else if (field === 'milkKg') {
          const kgs = Number(value);
          updated.milkLiter = value !== '' && !isNaN(kgs) ? parseFloat((kgs / 1.03).toFixed(2)) : '';
        }

        if (['fat', 'lr', 'milkLiter', 'milkKg'].includes(field)) {
          return calculateFields(updated);
        }
        return updated;
      }
      return e;
    }));
  };

  const handleCreateDispatch = (e: React.FormEvent, status: 'Draft' | 'Completed' = 'Completed') => {
    e.preventDefault();
    if (!newDispatch.vehicleNumber || !newDispatch.driverName) {
      alert('Please select transport and enter Driver Name');
      return;
    }

    const totalReceive = entries.reduce((sum, ent) => sum + (Number(ent.milkLiter) || 0), 0);
    const totalKg = entries.reduce((sum, ent) => sum + (Number(ent.milkKg) || 0), 0);
    const generatedId = 'disp-' + Date.now().toString();

    const recordToSave = {
      id: generatedId,
      date: newDispatch.date,
      time: newDispatch.time,
      transportType: newDispatch.vehicleNumber,
      vehicleNumber: newDispatch.vehicleNumber,
      driverName: newDispatch.driverName,
      driverPhone: newDispatch.driverPhone,
      roadName: newDispatch.roadName,
      trunkName: newDispatch.trunkName,
      liters: totalReceive,
      kg: totalKg,
      destination: newDispatch.roadName || 'Dispatch Route',
      status: (status === 'Draft' ? 'Pending' : 'On Route') as 'Pending' | 'On Route',
      entries: entries,
      isSold: false
    };

    addDispatch(recordToSave);

    setNewDispatch({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      vehicleNumber: '',
      roadName: '',
      trunkName: '',
      driverName: '',
      driverPhone: '',
    });
    setEntries([getEmptyEntry()]);
    setIsAddModalOpen(false);
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    receiveDispatch(selectedDispatchId, entries);
    setEntries([getEmptyEntry()]);
    setIsReceiveModalOpen(false);
    setSelectedDispatchId('');
    alert('Dispatch received successfully. Awaiting transfer to sale.');
  };

  const openReceiveModal = (dispatch: any) => {
    // Start with empty entries but pre-fill customer names from original dispatch
    if (dispatch.entries && dispatch.entries.length > 0) {
      setEntries(dispatch.entries.map((e: any) => ({
        ...getEmptyEntry(),
        id: Math.random().toString(36).substring(7),
        customerName: e.customerName || ''
      })));
    } else {
      setEntries([getEmptyEntry()]);
    }
    setSelectedDispatchId(dispatch.id);
    setIsReceiveModalOpen(true);
  };

  const handleTransferToSale = (dispatchId: string) => {
    const item = dispatches.find(d => d.id === dispatchId);
    if (!item) return;

    markDispatchAsSold(item.id, true);

    const targetEntries = item.receivedEntries && item.receivedEntries.length > 0
      ? item.receivedEntries
      : (item.entries || []);

    const importedRows = targetEntries.map((ent) => ({
      id: Math.random().toString(36).substring(7),
      name: ent.customerName || 'Walk-in Sale',
      vol: Number(ent.milkLiter) || '',
      fat: Number(ent.fat) || '',
      lr: Number(ent.lr) || '',
      snf: Number(ent.snf) || 0,
      tsr: Number(ent.ts) || 0,
      totalTs: Number(ent.totalTs) || 0,
      rate: '',
      pricePerLiter: 0,
      amount: 0
    }));

    if (location.pathname.includes('/accountant')) {
      navigate('/accountant/sales', { state: { importedRows } });
    } else {
      navigate('/admin/sales', { state: { importedRows } });
    }
  };

  const getSummary = (ents: RouteCollectionEntry[]) => {
    const validEnts = ents.filter(e => Number(e.milkLiter) > 0 || Number(e.milkKg) > 0 || e.customerName);
    const totalLocations = validEnts.length;
    const totalMilkLiter = validEnts.reduce((acc, s) => acc + (Number(s.milkLiter) || 0), 0);
    const totalMilkKgs = validEnts.reduce((acc, s) => acc + (Number(s.milkKg) || 0), 0);
    const avgFat = totalLocations > 0 ? (validEnts.reduce((acc, s) => acc + (Number(s.fat) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    const avgLr = totalLocations > 0 ? (validEnts.reduce((acc, s) => acc + (Number(s.lr) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    const avgSnf = totalLocations > 0 ? (validEnts.reduce((acc, s) => acc + (Number(s.snf) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    const avgTs = totalLocations > 0 ? (validEnts.reduce((acc, s) => acc + (Number(s.ts) || 0), 0) / totalLocations).toFixed(2) : '0.00';
    const totalTsAmount = validEnts.reduce((acc, s) => acc + (Number(s.totalTs) || 0), 0).toFixed(2);
    return { totalLocations, totalMilkLiter, totalMilkKgs, avgFat, avgLr, avgSnf, avgTs, totalTsAmount };
  };

  const filteredDispatches = dispatches.filter(d => {
    const dispatchDate = new Date(d.date);
    if (filterMode === 'day') {
      return d.date === dateFilter.date;
    } else if (filterMode === 'month') {
      return d.date.startsWith(dateFilter.month);
    } else if (filterMode === 'custom') {
      return dispatchDate >= new Date(dateFilter.startDate) && dispatchDate <= new Date(dateFilter.endDate);
    }
    return true;
  });

  const generatePDFForHistory = () => {
    const doc = new jsPDF();
    doc.text(`Dispatch Loss History (${filterMode})`, 14, 15);

    let y = 25;

    const received = filteredDispatches.filter(d => d.status === 'Received' || d.status === 'Completed');
    if (received.length === 0) {
      doc.text("No received dispatches found for this period.", 14, y);
      doc.save(`dispatch_loss_history_${new Date().getTime()}.pdf`);
      return;
    }

    const tableData: any[][] = [];

    received.forEach((d, i) => {
      const originalSum = getSummary(d.entries || []);
      const receivedSum = getSummary(d.receivedEntries || []);

      const literLoss = (Number(originalSum.totalMilkLiter) - Number(receivedSum.totalMilkLiter)).toFixed(2);
      const kgLoss = (Number(originalSum.totalMilkKgs) - Number(receivedSum.totalMilkKgs)).toFixed(2);
      const diffFat = (Number(originalSum.avgFat) - Number(receivedSum.avgFat)).toFixed(2);
      const tsLoss = (Number(originalSum.totalTsAmount) - Number(receivedSum.totalTsAmount)).toFixed(2);

      tableData.push([
        i + 1,
        d.date,
        `${d.vehicleNumber}\n${d.driverName}`,
        `${originalSum.totalMilkLiter} L\n${originalSum.totalMilkKgs} Kg`,
        `${receivedSum.totalMilkLiter} L\n${receivedSum.totalMilkKgs} Kg`,
        `${literLoss} L\n${kgLoss} Kg`,
        `${diffFat} %`,
        tsLoss
      ]);
    });

    autoTable(doc, {
      startY: y,
      head: [['Sr.', 'Date', 'Vehicle/Driver', 'Sent (Total)', 'Received (Total)', 'Loss (L/Kg)', 'Fat Diff', 'TS Diff']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    });

    doc.save(`dispatch_loss_history_${new Date().getTime()}.pdf`);
  };

  const generateDispatchPDF = (d: DispatchRecord) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header Banner
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, 210, 40, 'F');

    // Title Text Style
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MILK DISPATCH CHALLAN', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Official Driver Copy & Dispatch Receipt', 15, 25);
    doc.text(`Challan ID: ${d.id}`, 15, 32);

    // Right-aligned header info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 145, 18);
    doc.text(`Status: ${d.status.toUpperCase()}`, 145, 25);
    if (d.isSold) {
      doc.text(`Sale Status: SOLD`, 145, 32);
    }

    doc.setTextColor(31, 41, 55);

    // Section 1: Dispatch Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. DISPATCH DETAILS', 15, 50);

    // Heading divider line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(15, 52, 195, 52);

    // Specific detail blocks (grid layout simulation)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);

    // Left side column
    doc.setTextColor(100, 116, 139);
    doc.text('Date:', 15, 60);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(d.date || 'N/A', 30, 60);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Time:', 15, 67);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(d.time || 'N/A', 30, 67);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Road Name:', 15, 74);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(d.roadName || 'N/A', 40, 74);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Trunk Name:', 15, 81);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(d.trunkName || 'N/A', 42, 81);

    // Right side column
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Vehicle/Tanker:', 110, 60);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(d.vehicleNumber || 'N/A', 142, 60);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Driver Name:', 110, 67);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(d.driverName || 'N/A', 135, 67);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Driver Phone:', 110, 74);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(d.driverPhone || 'N/A', 135, 74);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Destination:', 110, 81);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(d.destination || 'N/A', 132, 81);

    // Section 2: Load Summary Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('2. LOAD QUALITY SUMMARY', 15, 93);
    doc.line(15, 95, 195, 95);

    const sum = getSummary(d.entries || []);
    const recSum = d.receivedEntries ? getSummary(d.receivedEntries) : null;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 100, 180, 28, 3, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Sent Volume (Litres)', 20, 106);
    doc.text('Sent Weight (KGs)', 75, 106);
    doc.text('Average Fat %', 130, 106);
    doc.text('Average LR', 170, 106);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // primary color
    doc.text(`${sum.totalMilkLiter} L`, 20, 114);
    doc.text(`${sum.totalMilkKgs} Kg`, 75, 114);
    doc.text(`${sum.avgFat}%`, 130, 114);
    doc.text(`${sum.avgLr}`, 170, 114);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total SNF: ${sum.avgSnf}%`, 20, 123);
    doc.text(`Avg TS: ${sum.avgTs}%`, 75, 123);
    doc.text(`Total TS Volume: ${sum.totalTsAmount} kg`, 130, 123);

    // Section 3: Table of Entries
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text('3. CUSTOMER QUALITY LOG / STOP CHRONOLOGY', 15, 137);
    doc.line(15, 139, 195, 139);

    const columns = [
      { header: 'Sr.', dataKey: 'sr' },
      { header: 'Customer Name', dataKey: 'customerName' },
      { header: 'Time', dataKey: 'time' },
      { header: 'Milk KG', dataKey: 'milkKg' },
      { header: 'Milk Ltr', dataKey: 'milkLiter' },
      { header: 'Fat %', dataKey: 'fat' },
      { header: 'LR', dataKey: 'lr' },
      { header: 'Temp °C', dataKey: 'temp' },
      { header: 'SNF %', dataKey: 'snf' },
      { header: 'TS %', dataKey: 'ts' },
      { header: 'Total TS', dataKey: 'totalTs' },
    ];

    const rows = (d.entries || []).map((ent, idx) => ({
      sr: idx + 1,
      customerName: ent.customerName || 'N/A',
      time: ent.time || 'N/A',
      milkKg: ent.milkKg || '0.00',
      milkLiter: ent.milkLiter || '0.00',
      fat: ent.fat || '0.0',
      lr: ent.lr || '0.0',
      temp: ent.temp || '0.0',
      snf: ent.snf || '0.00',
      ts: ent.ts || '0.00',
      totalTs: ent.totalTs || '0.00',
    }));

    autoTable(doc, {
      columns: columns,
      body: rows,
      startY: 143,
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold', textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        customerName: { cellWidth: 35 },
        milkKg: { halign: 'right' },
        milkLiter: { halign: 'right', fontStyle: 'bold' },
        fat: { halign: 'right' },
        lr: { halign: 'right' },
        temp: { halign: 'right' },
        snf: { halign: 'right' },
        ts: { halign: 'right' },
        totalTs: { halign: 'right' },
      },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    if (finalY > 240) {
      doc.addPage();
      finalY = 25;
    }

    if (recSum) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('4. RECEIVING STATUS & OUTCOME', 15, finalY);
      doc.line(15, finalY + 2, 195, finalY + 2);
      finalY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Received on Route Status: ${d.status}`, 15, finalY);
      doc.text(`Received Litres: ${recSum.totalMilkLiter} L`, 15, finalY + 5);
      doc.text(`Received KG Weight: ${recSum.totalMilkKgs} Kg`, 15, finalY + 10);

      const literLoss = (Number(sum.totalMilkLiter) - Number(recSum.totalMilkLiter)).toFixed(2);
      const kgLoss = (Number(sum.totalMilkKgs) - Number(recSum.totalMilkKgs)).toFixed(2);

      doc.setFont('helvetica', 'bold');
      doc.text(`Net Litre Loss/Gain: ${literLoss} L`, 110, finalY);
      doc.text(`Net Weight Loss/Gain: ${kgLoss} Kg`, 110, finalY + 5);

      finalY += 18;
    }

    if (finalY > 245) {
      doc.addPage();
      finalY = 25;
    }

    // Driver & Authority lines
    doc.setDrawColor(209, 213, 219);
    doc.line(15, finalY + 20, 80, finalY + 20);
    doc.line(130, finalY + 20, 195, finalY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Driver Signature / Fingerprint', 25, finalY + 25);
    doc.text('Dispatch Authority Sign & Stamp', 135, finalY + 25);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Disclaimer: This is a system generated delivery challan valid for milk transit and quality verification.', 15, finalY + 35);
    doc.text('All measurements taken at ambient scales, certified by legal logistics standards.', 15, finalY + 39);

    doc.save(`milk_dispatch_challan_${d.id}_${d.date}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-full mx-auto">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5 tracking-tight">
          <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
          <span className="whitespace-nowrap">Dispatch Record</span>
        </h1>

        <button
          onClick={() => {
            setEntries([getEmptyEntry()]);
            setIsAddModalOpen(true);
          }}
          className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-colors text-xs sm:text-sm whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>New Dispatch</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"> <div className="p-4 bg-slate-50 border-b border-slate-200"> <h3 className="font-bold text-slate-700">Milk dispatch record</h3> </div> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse"> <thead> <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 whitespace-nowrap"> <th className="p-4">Date, Info</th> <th className="p-4">Road / Trunk</th> <th className="p-4">Driver Details</th> <th className="p-4">Dispatch Sent</th> <th className="p-4 text-center">Status</th> <th className="p-4 text-right">Actions</th> </tr> </thead> <tbody className="divide-y divide-slate-100 text-sm">
        {dispatches.map(d => {
          const totalSentLiters = (d.entries || []).reduce((acc, e) => acc + (Number(e.milkLiter) || 0), 0);
          const isReceived = d.status === 'Received' || d.status === 'Completed';

          return (
            <tr key={d.id} className="hover:bg-slate-50 transition-colors"> <td className="p-4"> <p className="font-bold text-slate-800">{d.date}</p> <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{d.vehicleNumber}</p> </td> <td className="p-4"> <p className="font-bold text-slate-800">{d.roadName || '-'}</p> <p className="text-xs text-slate-500 mt-1">{d.trunkName || '-'}</p> </td> <td className="p-4"> <p className="font-bold text-slate-800">{d.driverName}</p> </td> <td className="p-4"> <div className="flex items-center text-xs w-32"> <strong className="font-mono text-indigo-600 font-bold text-sm bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100">{totalSentLiters} L</strong> </div> </td> <td className="p-4 text-center"> <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${d.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                d.status === 'On Route' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
              }`}>
              {d.status}
            </span> </td> <td className="p-4 text-right"> <div className="flex items-center justify-end gap-2.5"> <button
              onClick={() => generateDispatchPDF(d)}
              className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded shadow-sm inline-flex items-center gap-1 transition-colors"
              title="Download Driver Dispatch PDF"
            > <Download className="w-3.5 h-3.5" /> PDF
            </button>

              {!isReceived ? (
                <button
                  onClick={() => openReceiveModal(d)}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded shadow-sm inline-flex items-center transition-colors"
                >
                  Receive
                </button>
              ) : (
                <div className="flex flex-col gap-1 items-end">
                  {d.isSold ? (
                    <span className="inline-flex items-center text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      ✓ Sold
                    </span>
                  ) : (
                    <button
                      onClick={() => handleTransferToSale(d.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm inline-flex items-center gap-1.5 transition-colors"
                    >
                      Transfer to sale <ArrowRight className="w-3 h-3" /> </button>
                  )}

                  {/* Loss Calculation Display */}
                  {d.receivedEntries && (
                    <div className="text-[10px] text-right bg-red-50 px-1.5 py-0.5 rounded border border-red-100 text-red-800"> <span className="font-bold text-[9px]">Loss: </span> <span className="font-mono text-[9px]">
                      {(totalSentLiters - d.receivedEntries.reduce((acc, e) => acc + (Number(e.milkLiter) || 0), 0)).toFixed(2)} L
                    </span> </div>
                  )}
                </div>
              )}
            </div> </td> </tr>
          );
        })}
        {dispatches.length === 0 && (
          <tr> <td colSpan={6} className="p-8 text-center text-slate-500">No dispatch records found</td> </tr>
        )}
      </tbody> </table> </div> </div>

      {/* History and Loss Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"> <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"> <h3 className="font-bold text-slate-700 flex items-center gap-2"> <FileText className="w-5 h-5 text-indigo-600" /> Dispatch Loss History
      </h3> <div className="flex flex-wrap items-center gap-3"> <div className="flex border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm"> <button
        onClick={() => setFilterMode('day')}
        className={`px-3 py-1.5 text-xs font-bold transition-colors ${filterMode === 'day' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
      >
        Day
      </button> <button
        onClick={() => setFilterMode('month')}
        className={`px-3 py-1.5 text-xs font-bold border-l border-r border-slate-300 transition-colors ${filterMode === 'month' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
      >
          Month
        </button> <button
          onClick={() => setFilterMode('custom')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors ${filterMode === 'custom' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Custom
        </button> </div>

          {filterMode === 'day' && (
            <input type="date" value={dateFilter.date} onChange={e => setDateFilter({ ...dateFilter, date: e.target.value })} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-medium" />
          )}
          {filterMode === 'month' && (
            <input type="month" value={dateFilter.month} onChange={e => setDateFilter({ ...dateFilter, month: e.target.value })} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-medium" />
          )}
          {filterMode === 'custom' && (
            <div className="flex items-center gap-2"> <input type="date" title="Start Date" value={dateFilter.startDate} onChange={e => setDateFilter({ ...dateFilter, startDate: e.target.value })} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-medium" /> <span className="text-slate-400 text-xs font-medium">to</span> <input type="date" title="End Date" value={dateFilter.endDate} onChange={e => setDateFilter({ ...dateFilter, endDate: e.target.value })} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-medium" /> </div>
          )}

          <button
            onClick={generatePDFForHistory}
            className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-slate-700 transition flex items-center gap-1.5"
          > <Download className="w-3.5 h-3.5" /> PDF
          </button> </div> </div> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse text-sm"> <thead> <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 whitespace-nowrap"> <th className="p-3 w-12 text-center">Sr.</th> <th className="p-3">Date</th> <th className="p-3">Vehicle / Driver</th> <th className="p-3">Sent Totals</th> <th className="p-3 border-l border-slate-200 text-emerald-700 bg-emerald-50/30">Received Totals</th> <th className="p-3 border-l border-slate-200 text-red-700 bg-red-50/50">Loss / Variation</th> </tr> </thead> <tbody className="divide-y divide-slate-100">
            {filteredDispatches.filter(d => d.status === 'Received' || d.status === 'Completed').length > 0 ? (
              filteredDispatches.filter(d => d.status === 'Received' || d.status === 'Completed').map((d, index) => {
                const originalSum = getSummary(d.entries || []);
                const receivedSum = getSummary(d.receivedEntries || []);
                const literLoss = (Number(originalSum.totalMilkLiter) - Number(receivedSum.totalMilkLiter)).toFixed(2);
                const kgLoss = (Number(originalSum.totalMilkKgs) - Number(receivedSum.totalMilkKgs)).toFixed(2);
                const diffFat = (Number(originalSum.avgFat) - Number(receivedSum.avgFat)).toFixed(2);
                const tsLoss = (Number(originalSum.totalTsAmount) - Number(receivedSum.totalTsAmount)).toFixed(2);
                return (
                  <tr key={'hist-' + d.id} className="hover:bg-slate-50"> <td className="p-3 font-mono text-center text-slate-400">{index + 1}</td> <td className="p-3 font-bold text-slate-700">{d.date}</td> <td className="p-3"> <div className="font-bold text-slate-800 text-xs">{d.vehicleNumber}</div> <div className="text-xs text-slate-500">{d.driverName}</div> </td> <td className="p-3"> <div className="flex flex-col gap-0.5 text-xs"> <div className="flex gap-2 justify-between"> <span className="text-slate-500 font-medium w-12">Liters:</span> <span className="font-mono font-bold text-indigo-700">{originalSum.totalMilkLiter} <span className="text-[9px]">L</span></span> </div> <div className="flex gap-2 justify-between"> <span className="text-slate-500 font-medium w-12">Kgs:</span> <span className="font-mono font-bold">{originalSum.totalMilkKgs} <span className="text-[9px]">kg</span></span> </div> <div className="flex gap-2 justify-between mt-1 pt-1 border-t border-slate-100"> <span className="text-slate-500 font-medium w-12">Fat:</span> <span className="font-mono font-bold">{originalSum.avgFat}%</span> </div> </div> </td> <td className="p-3 border-l border-slate-200 bg-emerald-50/10"> <div className="flex flex-col gap-0.5 text-xs"> <div className="flex gap-2 justify-between"> <span className="text-emerald-600 font-medium w-12">Liters:</span> <span className="font-mono font-bold text-emerald-700">{receivedSum.totalMilkLiter} <span className="text-[9px]">L</span></span> </div> <div className="flex gap-2 justify-between"> <span className="text-emerald-600 font-medium w-12">Kgs:</span> <span className="font-mono font-bold text-emerald-700">{receivedSum.totalMilkKgs} <span className="text-[9px]">kg</span></span> </div> <div className="flex gap-2 justify-between mt-1 pt-1 border-t border-emerald-100/50"> <span className="text-emerald-600 font-medium w-12">Fat:</span> <span className="font-mono font-bold text-emerald-700">{receivedSum.avgFat}%</span> </div> </div> </td> <td className="p-3 border-l border-slate-200 bg-red-50/30"> <div className="flex flex-col gap-0.5 text-xs"> <div className="flex gap-2 justify-between"> <span className="text-red-500 font-medium w-12">Liters:</span> <span className="font-mono font-bold text-red-600">{literLoss} <span className="text-[9px]">L</span></span> </div> <div className="flex gap-2 justify-between"> <span className="text-red-500 font-medium w-12">Kgs:</span> <span className="font-mono font-bold text-red-600">{kgLoss} <span className="text-[9px]">kg</span></span> </div> <div className="flex gap-2 justify-between mt-1 pt-1 border-t border-red-100/50"> <span className="text-red-500 font-medium w-12">Fat:</span> <span className="font-mono font-bold text-red-600">{diffFat}%</span> </div> </div> </td> </tr>
                );
              })
            ) : (
              <tr> <td colSpan={6} className="p-6 text-center text-slate-500 text-sm">No received dispatches found for the selected period.</td> </tr>
            )}
          </tbody> </table> </div> </div>

      {/* Shared Modal UI for Add and Receive */}
      {(isAddModalOpen || isReceiveModalOpen) && (() => {
        const isReceive = isReceiveModalOpen;
        const sum = getSummary(entries);
        const originalDispatch = isReceive ? dispatches.find(d => d.id === selectedDispatchId) : null;
        const originalSum = originalDispatch ? getSummary(originalDispatch.entries || []) : null;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300] overflow-y-auto"> <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto"> <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white"> <h3 className="font-bold flex items-center gap-2">
            {isReceive ? <FileText className="w-5 h-5 text-emerald-400" /> : <Truck className="w-5 h-5 text-purple-400" />}
            {isReceive ? 'Receive Dispatch' : 'New dispatch'}
          </h3> <button onClick={() => isReceive ? setIsReceiveModalOpen(false) : setIsAddModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-700/50 p-1 rounded-md transition-colors"> <X className="w-4 h-4" /> </button> </div> <form onSubmit={isReceive ? handleReceiveSubmit : (e) => handleCreateDispatch(e, 'Completed')} className="p-5 space-y-5 max-h-[85vh] overflow-y-auto flex flex-col">

              {/* Header Inputs (Only for Add) */}
              {!isReceive && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200"> <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> <div> <label className="block text-xs font-bold text-slate-500 mb-1">Date</label> <input type="date" required value={newDispatch.date} onChange={e => setNewDispatch({ ...newDispatch, date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-slate-700" /> </div> <div> <label className="block text-xs font-bold text-slate-500 mb-1">Select Saved trank</label> <select required value={newDispatch.vehicleNumber} onChange={e => setNewDispatch({ ...newDispatch, vehicleNumber: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-slate-700"> <option value="">-- Choose saved trank --</option>
                  {vehicles.map(v => <option key={v.id} value={v.vehicleNumber}>{v.vehicleNumber} ({v.name})</option>)}
                </select> </div> <div> <label className="block text-xs font-bold text-slate-500 mb-1">Route Name</label> <input type="text" placeholder="Enter Route Name" value={newDispatch.roadName} onChange={e => setNewDispatch({ ...newDispatch, roadName: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-slate-700" /> </div> <div> <label className="block text-xs font-bold text-slate-500 mb-1">Trunk Name</label> <input type="text" placeholder="e.g. TNK-123" value={newDispatch.trunkName} onChange={e => setNewDispatch({ ...newDispatch, trunkName: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-slate-700" /> </div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div> <label className="block text-xs font-bold text-slate-500 mb-1">Milk Tester Name</label> <input type="text" required value={newDispatch.driverName} onChange={e => setNewDispatch({ ...newDispatch, driverName: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-slate-700" placeholder="Enter Milk Tester Name" /> </div> <div> <label className="block text-xs font-bold text-slate-500 mb-1">Driver Phone</label> <input type="text" value={newDispatch.driverPhone} onChange={e => setNewDispatch({ ...newDispatch, driverPhone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-slate-700" placeholder="Enter Phone Number" /> </div> </div> </div>
              )}
              {isReceive && originalDispatch && (
                <div className="space-y-4"> <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-wrap gap-6 items-center"> <div> <span className="block text-[10px] uppercase font-bold text-emerald-800 mb-1">Trunk/Vehicle</span> <strong className="text-slate-800 text-sm">{originalDispatch.vehicleNumber}</strong> </div> <div> <span className="block text-[10px] uppercase font-bold text-emerald-800 mb-1">Driver Name</span> <strong className="text-slate-800 text-sm">{originalDispatch.driverName}</strong> </div> <div> <span className="block text-[10px] uppercase font-bold text-emerald-800 mb-1">Original Sent List Ltrs</span> <strong className="text-indigo-700 text-lg">{originalSum?.totalMilkLiter} L</strong> </div> </div> <div className="border border-indigo-100 rounded-xl shadow-sm overflow-x-auto bg-indigo-50/50"> <h4 className="font-bold text-indigo-900 px-3 py-2 text-sm border-b border-indigo-100">Previously Submitted Entries</h4> <table className="w-full text-xs text-left whitespace-nowrap opacity-80"> <thead className="bg-indigo-100/50 text-indigo-800 border-b border-indigo-100"> <tr> <th className="p-2 border-r border-indigo-100 font-bold w-12">Serial</th> <th className="p-2 border-r border-indigo-100 font-bold min-w-[120px]">customer name</th> <th className="p-2 border-r border-indigo-100 font-bold w-20">Time</th> <th className="p-2 border-r border-indigo-100 font-bold w-20">Milk KG</th> <th className="p-2 border-r border-indigo-100 font-extrabold w-20">milk litr</th> <th className="p-2 border-r border-indigo-100 font-bold w-16">Fat %</th> <th className="p-2 border-r border-indigo-100 font-bold w-16">LR</th> <th className="p-2 border-r border-indigo-100 font-bold w-16">Temp °C</th> <th className="p-2 border-r border-indigo-100 font-bold w-16">SNF %</th> <th className="p-2 border-r border-indigo-100 font-bold w-16">TS %</th> <th className="p-2 border-r border-indigo-100 font-bold w-20">Total TS</th> </tr> </thead> <tbody className="divide-y divide-indigo-50">
                  {originalDispatch.entries?.map((ent: any, idx: number) => (
                    <tr key={ent.id} className="hover:bg-indigo-50"> <td className="p-1 border-r border-indigo-50 text-center font-mono text-indigo-500">{idx + 1}</td> <td className="p-1 border-r border-indigo-50 px-2 font-medium">{ent.customerName || '-'}</td> <td className="p-1 border-r border-indigo-50 px-2">{ent.time || '-'}</td> <td className="p-1 border-r border-indigo-50 px-2 font-mono">{ent.milkKg || '0'}</td> <td className="p-1 border-r border-indigo-50 px-2 font-mono font-bold">{ent.milkLiter || '0'}</td> <td className="p-1 border-r border-indigo-50 px-2 font-mono">{ent.fat || '0'}</td> <td className="p-1 border-r border-indigo-50 px-2 font-mono">{ent.lr || '0'}</td> <td className="p-1 border-r border-indigo-50 px-2 font-mono">{ent.temp || '0'}</td> <td className="p-1 border-r border-indigo-50 px-2 font-mono text-right">{ent.snf || '0.00'}</td> <td className="p-1 border-r border-indigo-50 px-2 font-mono text-right">{ent.ts || '0.00'}</td> <td className="p-1 border-r border-indigo-50 px-2 font-mono font-bold text-right">{ent.totalTs || '0.00'}</td> </tr>
                  ))}
                </tbody> <tfoot className="bg-indigo-100/50 border-t border-indigo-100"> <tr> <td className="p-2 font-bold text-indigo-900 text-center" colSpan={2}>SUBMITTED TOTAL</td> <td className="p-2"></td> <td className="p-2 font-bold font-mono text-indigo-900">{originalSum?.totalMilkKgs} <span className="text-[10px]">kg</span></td> <td className="p-2 font-black font-mono text-indigo-900">{originalSum?.totalMilkLiter} <span className="text-[10px]">L</span></td> <td className="p-2 font-mono text-indigo-900">{originalSum?.avgFat}%</td> <td className="p-2 font-mono text-indigo-900">{originalSum?.avgLr}</td> <td className="p-2"></td> <td className="p-2 font-mono text-indigo-900 text-right">{originalSum?.avgSnf}%</td> <td className="p-2 font-mono text-indigo-900 text-right">{originalSum?.avgTs}%</td> <td className="p-2 font-bold font-mono text-indigo-900 text-right">{originalSum?.totalTsAmount}</td> </tr> </tfoot> </table> </div> </div>
              )}

              {/* Table Section */}
              <div className="flex-1 min-h-[300px]"> <h4 className="font-bold text-slate-700 mb-2 px-1 text-sm">{isReceive ? 'Review & Receive Locations & Quality Log' : 'dispatch Locations & Quality Log'}</h4> <div className="border border-slate-200 rounded-xl shadow-sm overflow-x-auto bg-white"> <table className="w-full text-xs text-left whitespace-nowrap"> <thead className="bg-[#f8f9fa] text-slate-600 border-b border-slate-200"> <tr> <th className="p-2 border-r border-slate-200 font-bold text-center w-8">Move</th> <th className="p-2 border-r border-slate-200 font-bold w-12">Serial</th> <th className="p-2 border-r border-slate-200 font-bold min-w-[120px]">customer name</th> <th className="p-2 border-r border-slate-200 font-bold w-20">Time</th> <th className="p-2 border-r border-slate-200 font-bold w-20 bg-indigo-50/50">Milk KG</th> <th className="p-2 border-r border-slate-200 font-extrabold w-20 bg-indigo-100 text-indigo-900">milk litr</th> <th className="p-2 border-r border-slate-200 font-bold w-16">Fat %</th> <th className="p-2 border-r border-slate-200 font-bold w-16">LR</th> <th className="p-2 border-r border-slate-200 font-bold w-16">Temp °C</th> <th className="p-2 border-r border-slate-200 font-bold w-16 bg-slate-50">SNF %</th> <th className="p-2 border-r border-slate-200 font-bold w-16 bg-slate-50">TS %</th> <th className="p-2 border-r border-slate-200 font-bold w-20 bg-slate-50">Total TS</th> <th className="p-2 text-center font-bold">Actions</th> </tr> </thead> <tbody className="divide-y divide-slate-100">
                {entries.map((ent, idx) => (
                  <tr key={ent.id} className="hover:bg-slate-50"> <td className="p-1 border-r border-slate-100 text-center"><span className="text-slate-300 cursor-grab">⋮⋮</span></td> <td className="p-1 border-r border-slate-100 text-center font-mono text-slate-500">{idx + 1}</td> <td className="p-1 border-r border-slate-100"> <input type="text" value={ent.customerName} onChange={e => updateEntry(ent.id, 'customerName', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Name..." /> </td> <td className="p-1 border-r border-slate-100"> <input type="time" value={ent.time} onChange={e => updateEntry(ent.id, 'time', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" /> </td> <td className="p-1 border-r border-slate-100 bg-indigo-50/20"> <input type="number" value={ent.milkKg} onChange={e => updateEntry(ent.id, 'milkKg', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-mono" placeholder="0" /> </td> <td className="p-1 border-r border-slate-100 bg-indigo-50"> <input type="number" value={ent.milkLiter} onChange={e => updateEntry(ent.id, 'milkLiter', e.target.value)} className="w-full px-2 py-1.5 border-2 border-indigo-200 rounded text-xs focus:border-indigo-500 outline-none font-mono font-bold text-indigo-900" placeholder="0" /> </td> <td className="p-1 border-r border-slate-100"> <input type="number" step="0.1" value={ent.fat} onChange={e => updateEntry(ent.id, 'fat', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-mono" placeholder="0" /> </td> <td className="p-1 border-r border-slate-100"> <input type="number" step="0.1" value={ent.lr} onChange={e => updateEntry(ent.id, 'lr', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-mono" placeholder="0" /> </td> <td className="p-1 border-r border-slate-100"> <input type="number" step="0.1" value={ent.temp} onChange={e => updateEntry(ent.id, 'temp', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-mono" placeholder="0" /> </td> <td className="p-2 border-r border-slate-100 bg-slate-50 font-mono text-slate-700 text-right">{ent.snf || '0.00'}</td> <td className="p-2 border-r border-slate-100 bg-slate-50 font-mono text-slate-700 text-right">{ent.ts || '0.00'}</td> <td className="p-2 border-r border-slate-100 bg-slate-50 font-mono text-indigo-700 font-bold text-right">{ent.totalTs || '0.00'}</td> <td className="p-1 text-center"> <button type="button" onClick={() => setEntries(entries.filter(e => e.id !== ent.id))} className="text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 p-1.5 rounded shadow-sm border border-slate-200 transition-colors"> <X className="w-4 h-4" /> </button> </td> </tr>
                ))}
              </tbody> <tfoot className="bg-[#f8f9fa] border-t border-slate-200"> <tr> <td className="p-2 font-bold text-slate-700 text-center" colSpan={2}>TOTAL</td> <td className="p-2 font-bold text-slate-800 text-xs text-center">{sum.totalLocations} loc</td> <td className="p-2"></td> <td className="p-2 font-bold text-indigo-700 font-mono bg-indigo-50/20">{sum.totalMilkKgs} <span className="text-[10px]">kg</span></td> <td className="p-2 font-black text-indigo-900 font-mono bg-indigo-50 border-r border-indigo-100">{sum.totalMilkLiter} <span className="text-[10px]">L</span></td> <td className="p-2 font-mono text-slate-700">{sum.avgFat}%</td> <td className="p-2 font-mono text-slate-700">{sum.avgLr}</td> <td className="p-2"></td> <td className="p-2 font-mono text-slate-700 text-right bg-slate-50">{sum.avgSnf}%</td> <td className="p-2 font-mono text-slate-700 text-right bg-slate-50">{sum.avgTs}%</td> <td className="p-2 font-bold text-indigo-700 font-mono text-right bg-slate-50">{sum.totalTsAmount}</td> <td className="p-2"></td> </tr>
                  {isReceive && originalSum && (
                    <tr className="bg-red-50 text-red-700 border-t border-red-100"> <td className="p-2 font-bold text-center" colSpan={2}>LOSS</td> <td className="p-2 text-xs text-center text-red-500 font-bold uppercase tracking-wider">Variation</td> <td className="p-2"></td> <td className="p-2 font-bold font-mono">{(originalSum.totalMilkKgs - sum.totalMilkKgs).toFixed(2)} <span className="text-[10px]">kg</span></td> <td className="p-2 font-black font-mono">{(originalSum.totalMilkLiter - sum.totalMilkLiter).toFixed(2)} <span className="text-[10px]">L</span></td> <td className="p-2 font-mono">{(Number(originalSum.avgFat) - Number(sum.avgFat)).toFixed(2)}%</td> <td className="p-2"></td> <td className="p-2"></td> <td className="p-2"></td> <td className="p-2"></td> <td className="p-2 font-bold font-mono text-right">{(Number(originalSum.totalTsAmount) - Number(sum.totalTsAmount)).toFixed(2)}</td> <td className="p-2"></td> </tr>
                  )}
                </tfoot> </table> <div className="p-2 bg-[#f8f9fa] border-t border-slate-200 flex justify-between items-center"> <button type="button" onClick={() => setEntries([...entries, getEmptyEntry()])} className="px-3 py-1.5 bg-white text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-slate-200 shadow-sm rounded flex items-center gap-1 transition-colors"> <Plus className="w-3.5 h-3.5" /> Add Row
                </button> </div> </div> </div>

              {/* Submission actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3  mt-auto border-t border-slate-100 w-full">

                <button
                  type="button"
                  onClick={() => isReceive ? setIsReceiveModalOpen(false) : setIsAddModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
                >
                  Cancel
                </button>

                {!isReceive && (
                  <button
                    type="button"
                    onClick={(e) => handleCreateDispatch(e, 'Draft')}
                    className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors text-center"
                  >
                    Save as Draft
                  </button>
                )}

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 sm:py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isReceive ? 'Submit Received Data' : 'Submit dispatch'}
                </button>
              </div>

            </form> </div> </div>
        );
      })()}
    </div>
  );
}
