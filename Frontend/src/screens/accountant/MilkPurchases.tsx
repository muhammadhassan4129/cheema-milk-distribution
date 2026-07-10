import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Save, Droplets, Trash2, Calendar, User, X, Download } from 'lucide-react';
import { useMilkTransactionContext, MilkRecord } from '../../contexts/MilkTransactionContext';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { syncSetting, syncDeletePurchaseEntry } from '../../services/ledgerSync';
import { settingsApi, isOnline } from '../../services/api';

interface PurchaseRow {
  id: string;
  name: string;
  vol: number;
  fat: number;
  lr: number;
  snf: number;
  tsr: number;
  totalTs: number;
  rate: number;
  pricePerLiter: number;
  amount: number;
  routeId?: string;
  routeName?: string;
}

const defaultRow: PurchaseRow = {
  id: '1', name: '', vol: 0, fat: 0, lr: 0, snf: 0, tsr: 0, totalTs: 0, rate: 0, pricePerLiter: 0, amount: 0
};

export default function MilkPurchases() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [bulkRate, setBulkRate] = useState<string>('');
  const rateLoadedRef = useRef(false);

  const [date, setDate] = useState(() => {
    if (location.state?.date) return location.state.date;
    return new Date().toISOString().split('T')[0];
  });

  const calculateSNF = (lr: number, fat: number) => {
    const snf = (0.25 * lr) + (0.22 * fat) + 0.72;
    return snf > 0 ? snf : 0;
  };

  const calculateTSR = (fat: number, snf: number) => fat + snf;
  const calculateTotalTS = (tsr: number, vol: number) => (tsr * vol) / 13;
  const calculateAmount = (totalTs: number, rate: number) => totalTs * rate;

  const [rows, setRows] = useState<PurchaseRow[]>(() => {
    if (location.state?.transferredRecords) {
      const recordsToLoad = location.state.transferredRecords as PurchaseRow[];
      return recordsToLoad.map(row => ({ ...row, rate: 0, amount: 0, pricePerLiter: 0 }));
    }
    return [{ ...defaultRow, id: Math.random().toString(36).substring(7), rate: 0 }];
  });

  // ── Load fixed purchase rate from backend on mount ──────────────────────
  useEffect(() => {
    if (rateLoadedRef.current) return;
    rateLoadedRef.current = true;
    // Apply local cache immediately for snappy UX
    const localRate = Number(localStorage.getItem('dairy_fixed_purchase_rate') || '') || 0;
    if (localRate > 0) applyRateToRows(localRate);
    if (!isOnline()) return;
    settingsApi.get('dairy_fixed_purchase_rate').then((res: any) => {
      if (res.success && res.data?.value !== undefined && res.data.value !== null) {
        const rate = Number(res.data.value) || 0;
        setBulkRate(String(rate || ''));
        localStorage.setItem('dairy_fixed_purchase_rate', String(rate));
        applyRateToRows(rate);
      }
    }).catch(() => {
      if (localRate > 0) setBulkRate(String(localRate));
    });
  }, []);

  const applyRateToRows = (rate: number) => {
    setBulkRate(String(rate || ''));
    setRows(prev => prev.map(row => {
      const amount = calculateAmount(row.totalTs, rate);
      const pricePerLiter = row.vol > 0 ? amount / row.vol : 0;
      return { ...row, rate, amount, pricePerLiter };
    }));
  };

  const { records, addRecords, removeRecord } = useMilkTransactionContext();

  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [areExtendedFiltersRemoved, setAreExtendedFiltersRemoved] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const getDaysDifference = (recordDateStr: string) => {
    if (!recordDateStr) return 999;
    const [ry, rm, rd] = recordDateStr.split('-').map(Number);
    const rDate = new Date(ry, rm - 1, rd);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    rDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - rDate.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const getFilteredRecords = () => {
    const purchaseRecords = records.filter(r => r.type === 'Purchase');
    return purchaseRecords.filter(record => {
      if (filterPeriod === 'one-day') {
        const diffDays = getDaysDifference(record.date);
        return diffDays === 0;
      }
      if (filterPeriod === 'yesterday') {
        const diffDays = getDaysDifference(record.date);
        return diffDays === 1;
      }
      if (filterPeriod === 'two-day') {
        const diffDays = getDaysDifference(record.date);
        return diffDays >= 0 && diffDays <= 1;
      }
      if (filterPeriod === 'three-day') {
        const diffDays = getDaysDifference(record.date);
        return diffDays >= 0 && diffDays <= 2;
      }
      if (filterPeriod === 'five-day') {
        const diffDays = getDaysDifference(record.date);
        return diffDays >= 0 && diffDays <= 4;
      }
      if (filterPeriod === 'seven-day') {
        const diffDays = getDaysDifference(record.date);
        return diffDays >= 0 && diffDays <= 6;
      }
      if (filterPeriod === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        return record.date >= customStartDate && record.date <= customEndDate;
      }
      return true;
    });
  };

  const downloadPDF = () => {
    const filtered = getFilteredRecords();
    if (filtered.length === 0) {
      alert("No records to export.");
      return;
    }

    const doc = new jsPDF();

    // Header Section
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Milk Purchases Statement", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Sub-header details
    let dateRangeText = "All Records";
    if (filterPeriod === 'one-day') dateRangeText = "One Day (Today)";
    else if (filterPeriod === 'yesterday') dateRangeText = "Yesterday";
    else if (filterPeriod === 'two-day') dateRangeText = "Two Days";
    else if (filterPeriod === 'three-day') dateRangeText = "Three Days";
    else if (filterPeriod === 'five-day') dateRangeText = "Five Days";
    else if (filterPeriod === 'seven-day') dateRangeText = "Seven Days";
    else if (filterPeriod === 'custom') dateRangeText = `Custom Date Range: ${customStartDate} to ${customEndDate}`;

    doc.text(`Period: ${dateRangeText}`, 14, 27);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 33);

    // Prepare table columns and rows
    const columns = [
      "S.No.",
      "Date",
      "Party Name",
      "Volume (L)",
      "Fat (%)",
      "LR",
      "SNF (%)",
      "TS (%)",
      "Total TS",
      "Rate (Rs)",
      "Amount (Rs)"
    ];

    const tableRows = filtered.map((record, index) => [
      index + 1,
      record.date,
      record.partyName,
      record.vol.toFixed(2),
      (record.fat || 0).toFixed(1),
      (record.lr || 0).toFixed(1),
      (record.snf || 0).toFixed(2),
      (record.tsr || 0).toFixed(2),
      record.totalTs.toFixed(2),
      record.rate.toFixed(2),
      record.amount.toFixed(2)
    ]);

    // Calculate Totals for PDF
    const totalVol = filtered.reduce((sum, r) => sum + r.vol, 0);
    const totalTs = filtered.reduce((sum, r) => sum + r.totalTs, 0);
    const totalAmount = filtered.reduce((sum, r) => sum + r.amount, 0);

    // Add Totals row at the bottom of the PDF table
    tableRows.push([
      "Total",
      "",
      "",
      totalVol.toFixed(2),
      "",
      "",
      "",
      "",
      totalTs.toFixed(2),
      "",
      `Rs. ${totalAmount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [columns],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }, // blue color
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 0) {
            data.cell.styles.halign = 'left';
          }
        }
      }
    });

    doc.save(`Milk_Purchases_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  useEffect(() => {
    if (areExtendedFiltersRemoved && ['three-day', 'five-day', 'seven-day'].includes(filterPeriod)) {
      setFilterPeriod('two-day');
    }
  }, [areExtendedFiltersRemoved, filterPeriod]);

  // Note: location.state is intentionally NOT cleared — the useState initializer
  // reads it once on mount. Clearing it via navigate() would trigger a second
  // mount via AnimatePresence and lose the transferred rows.

  const handleRowChange = (id: string, field: keyof PurchaseRow, value: string) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.id === id) {
        const numValue = field === 'name' ? value : Number(value) || 0;
        const newRow = { ...row, [field]: numValue } as PurchaseRow;

        if (field === 'fat' || field === 'lr') {
          newRow.snf = calculateSNF(newRow.lr, newRow.fat);
          newRow.tsr = calculateTSR(newRow.fat, newRow.snf);
          newRow.totalTs = calculateTotalTS(newRow.tsr, newRow.vol);
        }

        if (field === 'vol') {
          newRow.totalTs = calculateTotalTS(newRow.tsr, newRow.vol);
        }

        if (field === 'fat' || field === 'lr' || field === 'vol' || field === 'rate') {
          newRow.amount = calculateAmount(newRow.totalTs, newRow.rate);
          newRow.pricePerLiter = newRow.vol > 0 ? newRow.amount / newRow.vol : 0;
        }

        return newRow;
      }
      return row;
    }));
  };

  const handleBulkRateChange = (newRate: string) => {
    setBulkRate(newRate);
    localStorage.setItem('dairy_fixed_purchase_rate', newRate);
    // Backend sync
    syncSetting('dairy_fixed_purchase_rate', newRate).catch(() => { });
    const rateVal = Number(newRate) || 0;
    setRows(prevRows => prevRows.map(row => {
      const updatedRow = { ...row, rate: rateVal };
      updatedRow.amount = calculateAmount(updatedRow.totalTs, rateVal);
      updatedRow.pricePerLiter = updatedRow.vol > 0 ? updatedRow.amount / updatedRow.vol : 0;
      return updatedRow;
    }));
  };

  const addRow = () => {
    setRows(prev => [
      ...prev,
      {
        ...defaultRow,
        id: Math.random().toString(36).substring(7),
        rate: Number(bulkRate) || 0,
      }
    ]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    setAreExtendedFiltersRemoved(true);
  };

  const saveAll = () => {
    const validRows = rows.filter(r => r.name.trim() !== '' && (r.vol > 0 || r.amount > 0));
    if (validRows.length === 0) {
      alert("Please add at least one valid entry (Name, Volume/Amount required).");
      return;
    }

    // Fat% validation — 0 to 15%
    const badFatRow = validRows.find(r => r.fat > 15);
    if (badFatRow) {
      alert(`Invalid Fat% for "${badFatRow.name}": ${badFatRow.fat}%\nFat% should be between 0 and 15%. Please correct and try again.`);
      return;
    }
    // LR validation — 15 to 40
    const badLrRow = validRows.find(r => r.lr > 0 && (r.lr < 15 || r.lr > 40));
    if (badLrRow) {
      alert(`Invalid LR for "${badLrRow.name}": ${badLrRow.lr}\nLR should be between 15 and 40. Please correct and try again.`);
      return;
    }

    const newRecords: MilkRecord[] = validRows.map(r => ({
      id: r.id && !r.id.startsWith('1') ? r.id : Math.random().toString(36).substring(7),
      date: date,
      type: 'Purchase',
      partyName: r.name,
      vol: r.vol,
      fat: r.fat,
      lr: r.lr,
      snf: r.snf,
      tsr: r.tsr,
      totalTs: r.totalTs,
      rate: r.rate,
      pricePerLiter: r.pricePerLiter,
      amount: r.amount,
      routeId: r.routeId,
      routeName: r.routeName
    }));

    addRecords(newRecords);
    alert("Purchase entries saved successfully!");
    const currentFixedRate = Number(localStorage.getItem('dairy_fixed_purchase_rate') || '') || 0;
    setRows([{ ...defaultRow, id: Math.random().toString(36).substring(7), rate: currentFixedRate }]);
  };

  const totals = rows.reduce(
    (acc, row) => {
      acc.vol += row.vol;
      acc.fat += row.fat * row.vol;
      acc.lr += row.lr * row.vol;
      acc.snf += row.snf * row.vol;
      acc.tsr += row.tsr * row.vol;
      acc.totalTs += row.totalTs;
      acc.amount += row.amount;
      return acc;
    },
    { vol: 0, fat: 0, lr: 0, snf: 0, tsr: 0, totalTs: 0, amount: 0 }
  );

  const avgFat = totals.vol > 0 ? (totals.fat / totals.vol) : 0;
  const avgLr = totals.vol > 0 ? (totals.lr / totals.vol) : 0;
  const avgSnf = totals.vol > 0 ? (totals.snf / totals.vol) : 0;
  const avgTsr = totals.vol > 0 ? (totals.tsr / totals.vol) : 0;
  const avgPricePerLiter = totals.vol > 0 ? (totals.amount / totals.vol) : 0;

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl p-5 shadow-sm"> <div> <h1 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2 tracking-tight"> <Droplets className="w-5 h-5 text-blue-500" /> Milk Purchases
      </h1> <p className="text-sm text-[var(--text-muted)] mt-0.5">SNF, TS &amp; payment amounts calculate automatically</p> </div> <div className="flex flex-wrap gap-2.5 items-center">
          {/* Date */}
          <div className="flex items-center gap-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl px-3 py-1.5"> <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" /> <input type="date" value={date} aria-label="Purchase date"
            onChange={e => { setDate(e.target.value); const r = Number(localStorage.getItem('dairy_fixed_purchase_rate') || '') || 0; setRows([{ ...defaultRow, id: Math.random().toString(36).substring(7), rate: r }]); }}
            className="bg-transparent text-sm font-semibold text-[var(--text-primary)] outline-none border-none" /> </div>
          {/* Rate */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5"> <span className="text-xs font-black text-blue-700 whitespace-nowrap">Rate/TS:</span> <input id="bulk-purchase-rate" type="number" step="0.01" placeholder="—" value={bulkRate}
            onChange={e => handleBulkRateChange(e.target.value)}
            className="w-20 bg-transparent text-xs font-bold font-mono text-blue-900 outline-none border-none" aria-label="Fixed purchase rate" /> </div> <button onClick={addRow} className="btn btn-secondary btn-sm gap-1.5"><Plus className="w-3.5 h-3.5" />Add Row</button> <button onClick={saveAll} className="btn btn-primary btn-sm gap-1.5"><Save className="w-3.5 h-3.5" />Save All</button> </div> </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Liters', value: `${totals.vol.toFixed(2)} L` },
          { label: 'Avg SNF%', value: `${avgSnf.toFixed(2)}%` },
          { label: 'Avg TS%', value: `${avgTsr.toFixed(2)}%` },
          { label: 'Total TS', value: totals.totalTs.toFixed(2) },
          { label: 'Avg Price/L', value: `Rs.${avgPricePerLiter.toFixed(2)}` },
          { label: 'Total Payable', value: `Rs.${totals.amount.toFixed(2)}`, highlight: true },
        ].map(({ label, value, highlight }) => (
          <div key={label} className={`rounded-xl border p-3 flex flex-col gap-1 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-[var(--surface-raised)] border-[var(--border)]'}`}> <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</span> <span className={`text-base font-black font-mono ${highlight ? 'text-blue-700' : 'text-[var(--text-primary)]'}`}>{value}</span> </div>
        ))}
      </div>

      {/* ── Entry table ── */}
      <div className="table-wrapper w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
        <div className="table-scroll overflow-x-auto scrollbar-thin">
          <table className="data-table w-full text-left text-xs text-slate-600 border-collapse table-auto">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 min-w-[140px] whitespace-nowrap">Name / Party</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Vol (L)</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Fat%</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">LR</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">SNF%</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">TS%</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Total TS</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Rate/TS</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Price/L</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition">

                  {/* Party Name */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <input
                      type="text"
                      placeholder="Party Name"
                      value={row.name}
                      onChange={e => handleRowChange(row.id, 'name', e.target.value)}
                      size={row.name ? Math.max(20, row.name.length) : 20}
                      className="form-input form-input-sm w-auto min-w-[130px] font-bold text-slate-800 px-3 inline-block"
                      aria-label="Party name"
                    />
                  </td>

                  {/* Volume */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={row.vol || ''}
                      onChange={e => handleRowChange(row.id, 'vol', e.target.value)}
                      size={row.vol ? Math.max(5, String(row.vol).length) : 5}
                      style={{ width: `${row.vol ? Math.max(5, String(row.vol).length) * 9 + 20 : 70}px` }}
                      className="form-input form-input-sm font-mono font-bold text-center px-1 inline-block"
                      aria-label="Volume"
                    />
                  </td>

                  {/* Fat% */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={row.fat || ''}
                      onChange={e => handleRowChange(row.id, 'fat', e.target.value)}
                      size={row.fat ? Math.max(4, String(row.fat).length) : 4}
                      style={{ width: `${row.fat ? Math.max(4, String(row.fat).length) * 9 + 20 : 60}px` }}
                      className="form-input form-input-sm font-mono text-center px-1 inline-block"
                      aria-label="Fat percentage"
                    />
                  </td>

                  {/* LR */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={row.lr || ''}
                      onChange={e => handleRowChange(row.id, 'lr', e.target.value)}
                      size={row.lr ? Math.max(4, String(row.lr).length) : 4}
                      style={{ width: `${row.lr ? Math.max(4, String(row.lr).length) * 9 + 20 : 60}px` }}
                      className="form-input form-input-sm font-mono text-center px-1 inline-block"
                      aria-label="LR value"
                    />
                  </td>

                  {/* SNF% */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <div style={{ width: `${Math.max(4, row.snf.toFixed(2).length) * 9 + 20}px` }} className="form-input form-input-sm form-input-readonly font-mono bg-slate-50 text-slate-500 text-center px-1 inline-block select-none">
                      {row.snf.toFixed(2)}
                    </div>
                  </td>

                  {/* TS% */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <div style={{ width: `${Math.max(4, row.tsr.toFixed(2).length) * 9 + 20}px` }} className="form-input form-input-sm form-input-readonly font-mono bg-slate-50 text-slate-500 text-center px-1 inline-block select-none">
                      {row.tsr.toFixed(2)}
                    </div>
                  </td>

                  {/* Total TS */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <div style={{ width: `${Math.max(5, row.totalTs.toFixed(2).length) * 9 + 20}px` }} className="form-input form-input-sm bg-blue-50 border-blue-200 text-blue-800 font-bold font-mono text-center px-1 inline-block select-none">
                      {row.totalTs.toFixed(2)}
                    </div>
                  </td>

                  {/* Rate/TS */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={row.rate || ''}
                      onChange={e => handleRowChange(row.id, 'rate', e.target.value)}
                      size={row.rate ? Math.max(5, String(row.rate).length) : 5}
                      style={{ width: `${row.rate ? Math.max(5, String(row.rate).length) * 9 + 20 : 70}px` }}
                      className="form-input form-input-sm font-mono font-bold text-center text-emerald-700 px-1 inline-block"
                      aria-label="Rate per TS"
                    />
                  </td>

                  {/* Price/L */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <div style={{ width: `${Math.max(5, row.pricePerLiter.toFixed(2).length) * 9 + 20}px` }} className="form-input form-input-sm form-input-readonly font-mono bg-slate-50 text-slate-500 text-center px-1 inline-block select-none">
                      {row.pricePerLiter.toFixed(2)}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-right">
                    <div style={{ width: `${Math.max(6, row.amount.toFixed(2).length) * 9 + 24}px` }} className="form-input form-input-sm form-input-readonly font-black font-mono bg-emerald-50/50 border-emerald-100 text-emerald-800 text-right px-2 inline-block select-none">
                      {row.amount.toFixed(2)}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    <button
                      onClick={() => removeRow(row.id)}
                      aria-label="Remove row"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer border border-transparent hover:border-rose-100 mx-auto"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 sticky bottom-0">
              <tr>
                <td className="px-3 py-3 font-black text-slate-700 whitespace-nowrap">TOTAL ({rows.length})</td>
                <td className="px-3 py-3 font-bold font-mono text-slate-800 text-center whitespace-nowrap">{totals.vol.toFixed(2)}</td>
                <td className="px-3 py-3 text-slate-400 text-[10px] font-medium text-center whitespace-nowrap">avg {avgFat.toFixed(2)}</td>
                <td className="px-3 py-3 text-slate-400 text-[10px] font-medium text-center whitespace-nowrap">avg {avgLr.toFixed(2)}</td>
                <td className="px-3 py-3 text-slate-400 text-[10px] font-medium text-center whitespace-nowrap">avg {avgSnf.toFixed(2)}</td>
                <td className="px-3 py-3 text-slate-450 text-[10px] font-medium text-center whitespace-nowrap">avg {avgTsr.toFixed(2)}</td>
                <td className="px-3 py-3 font-black text-blue-700 font-mono text-center whitespace-nowrap">{totals.totalTs.toFixed(2)}</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-slate-400 text-[10px] font-medium text-center whitespace-nowrap">avg {avgPricePerLiter.toFixed(2)}</td>
                <td className="px-3 py-3 font-black font-mono text-emerald-800 text-sm text-right whitespace-nowrap">{totals.amount.toFixed(2)}</td>
                <td className="px-3 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── History section ── */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-3">

          {/* Title & PDF Button Container */}
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
              Purchase History
            </h2>
            <button onClick={downloadPDF} className="btn btn-primary btn-sm gap-1.5 shrink-0">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {/* Filter Period responsive */}
          <div className="w-full sm:w-auto">

            <div className="block sm:hidden w-full">
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
              >
                {([
                  ['all', 'All Periods'],
                  ['one-day', 'Today'],
                  ['yesterday', 'Yesterday'],
                  ['two-day', '2 Days'],
                  ...(!areExtendedFiltersRemoved ? [['three-day', '3 Days'], ['five-day', '5 Days'], ['seven-day', '7 Days']] as const : []),
                  ['custom', 'Custom Range'] as const
                ] as [string, string][]).map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="filter-tabs"
              style={{ display: typeof window !== 'undefined' && window.innerWidth < 640 ? 'none' : undefined }}
            >
              {([
                ['all', 'All'], ['one-day', 'Today'], ['yesterday', 'Yesterday'], ['two-day', '2 Days'],
                ...(!areExtendedFiltersRemoved ? [['three-day', '3 Days'], ['five-day', '5 Days'], ['seven-day', '7 Days']] as const : []),
                ['custom', 'Custom'] as const
              ] as [string, string][]).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setFilterPeriod(val)}
                  className={`filter-tab${filterPeriod === val ? ' active' : ''}`}
                >
                  {lbl}
                </button>
              ))}
            </div>

          </div>
        </div>

        {filterPeriod === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl px-4 py-3 mb-3 animate-slide-down"> <div className="flex items-center gap-2"> <label className="form-label mb-0">From</label> <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="form-input form-input-sm" /> </div> <div className="flex items-center gap-2"> <label className="form-label mb-0">To</label> <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="form-input form-input-sm" /> </div> </div>
        )}

        <div className="table-wrapper"> <div className="table-scroll"> <table className="data-table"> <thead> <tr> <th>#</th><th>Date</th><th>Name / Party</th> <th>Vol (L)</th><th>TS%</th><th>Total TS</th><th>Amount</th> <th className="text-center">Action</th> </tr> </thead> <tbody>
          {(() => {
            const filtered = getFilteredRecords();
            return filtered.length > 0 ? filtered.map((record, index) => (
              <tr key={record.id}> <td className="text-[var(--text-muted)] font-mono">{index + 1}</td> <td className="font-mono text-[var(--text-secondary)]">{record.date}</td> <td> <button onClick={() => navigate(user?.role === 'Admin' ? '/admin/purchase-ledger' : '/accountant/purchase-ledger', { state: { preselectProfileName: record.partyName } })}
                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline text-left">
                {record.partyName}
              </button> </td> <td className="font-mono">{record.vol.toFixed(2)} L</td> <td className="font-mono text-[var(--text-secondary)]">{record.tsr.toFixed(2)}%</td> <td className="font-bold font-mono text-blue-700">{record.totalTs.toFixed(2)}</td> <td className="font-black font-mono">Rs. {record.amount.toFixed(2)}</td> <td className="text-center">
                  {user?.role === 'Admin' && (
                    <button onClick={() => {
                      if (confirm(`Delete purchase for ${record.partyName}?`)) {
                        // localStorage se bhi hatao
                        const lsKey = `cheema_purchase_ledger_${record.date}`;
                        try {
                          const entries = JSON.parse(localStorage.getItem(lsKey) || '[]');
                          localStorage.setItem(lsKey, JSON.stringify(entries.filter((e: any) => e.id !== record.id)));
                        } catch (e) { }
                        // Context state se hatao
                        removeRecord(record.id);
                        // Backend ledger + milkRecord delete
                        syncDeletePurchaseEntry(record.id).catch(() => { });
                        setAreExtendedFiltersRemoved(true);
                      }
                    }}
                      aria-label="Delete record"
                      className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-all"> <Trash2 className="w-3.5 h-3.5" /> </button>
                  )}
                </td> </tr>
            )) : (
              <tr><td colSpan={8} className="text-center py-10 text-[var(--text-muted)] text-sm">No purchase records found for this period.</td></tr>
            );
          })()}
        </tbody> </table> </div> </div> </section> </div>
  );
}
