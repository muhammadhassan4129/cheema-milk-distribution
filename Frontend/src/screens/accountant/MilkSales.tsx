import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Save, Activity, Trash2, Calendar, Scale, Info, Download, BookOpen, Search, User } from 'lucide-react';
import { useMilkTransactionContext, MilkRecord } from '../../contexts/MilkTransactionContext';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { syncSetting } from '../../services/ledgerSync';
import { settingsApi, ledgerApi, isOnline } from '../../services/api';

interface SaleRow {
  id: string;
  name: string;
  vol: number | string;
  fat: number | string;
  lr: number | string;
  snf: number;
  tsr: number;
  totalTs: number;
  rate: number | string;
  pricePerLiter: number;
  amount: number;
}

interface KgSaleRow {
  id: string;
  name: string;
  qtyKg: number | string;
  vol: number; // Converted back to liters: qtyKg / 1.03
  fat: number | string;
  lr: number | string;
  snf: number;
  tsr: number;
  totalTs: number | string;
  rate: number | string;
  pricePerLiter: number;
  amount: number;
  chargeUnit?: 'Kg' | 'L';
}

const defaultRow: SaleRow = {
  id: '1', name: '', vol: '', fat: '', lr: '', snf: 0, tsr: 0, totalTs: 0, rate: '', pricePerLiter: 0, amount: 0
};

const defaultKgRow: KgSaleRow = {
  id: 'kg-1', name: '', qtyKg: '', vol: 0, fat: 0, lr: 0, snf: 0, tsr: 0, totalTs: '', rate: '', pricePerLiter: 0, amount: 0, chargeUnit: 'Kg'
};

export default function MilkSales() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeSaleType, setActiveSaleType] = useState<'L' | 'Kg'>('L');

  const [bulkRate, setBulkRate] = useState<string>('');
  const rateLoadedRef = useRef(false);

  const [rows, setRows] = useState<SaleRow[]>(() => {
    if (location.state?.importedRows && location.state.importedRows.length > 0) {
      return location.state.importedRows.map((r: any) => {
        const safeNum = (v: any) => Number(v) || 0;
        const vol = safeNum(r.vol);
        const fat = safeNum(r.fat);
        const lr = safeNum(r.lr);
        let snf = 0;
        if (lr > 0 && fat > 0) snf = (0.25 * lr) + (0.22 * fat) + 0.72;
        const tsr = fat + snf;
        const totalTs = (tsr * vol) / 13;
        return { ...r, rate: '', snf: snf > 0 ? snf : 0, tsr: tsr > 0 ? tsr : 0, totalTs: totalTs > 0 ? totalTs : 0, amount: 0, pricePerLiter: 0 };
      });
    }
    return [{ ...defaultRow, id: Math.random().toString(36).substring(7), rate: '' }];
  });

  const [kgRows, setKgRows] = useState<KgSaleRow[]>(
    [{ ...defaultKgRow, id: Math.random().toString(36).substring(7), rate: '' }]
  );

  // ── Load fixed rate from backend on mount ──────────────────────────────────
  useEffect(() => {
    if (rateLoadedRef.current) return;
    rateLoadedRef.current = true;
    const localRate = localStorage.getItem('dairy_fixed_sales_rate') || '';
    if (localRate) {
      setBulkRate(localRate);
      applyRateToRows(localRate);
    }
    if (!isOnline()) return;
    settingsApi.get('dairy_fixed_sales_rate').then((res: any) => {
      if (res.success && res.data?.value !== undefined && res.data.value !== null) {
        const rate = String(res.data.value);
        setBulkRate(rate);
        localStorage.setItem('dairy_fixed_sales_rate', rate);
        applyRateToRows(rate);
      }
    }).catch(() => { });
  }, []);

  const applyRateToRows = (rate: string) => {
    const numRate = Number(rate) || 0;
    setRows(prev => prev.map(row => {
      const safeNum = (v: any) => Number(v) || 0;
      const amount = row.totalTs * numRate;
      return { ...row, rate, amount, pricePerLiter: safeNum(row.vol) > 0 ? amount / safeNum(row.vol) : 0 };
    }));
    setKgRows(prev => prev.map(row => {
      const safeNum = (v: any) => Number(v) || 0;
      const unit = row.chargeUnit || 'Kg';
      const amount = unit === 'Kg' ? safeNum(row.qtyKg) * numRate : row.vol * numRate;
      return { ...row, rate, amount, pricePerLiter: row.vol > 0 ? amount / row.vol : 0 };
    }));
  };

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  // Quick Account Ledger Lookup States
  const [showQuickLookModal, setShowQuickLookModal] = useState<boolean>(false);
  const [quickLookType, setQuickLookType] = useState<'customer' | 'supplier'>('customer');
  const [quickLookProfileId, setQuickLookProfileId] = useState<string | null>(null);
  const [quickLookSearch, setQuickLookSearch] = useState<string>('');
  const [customerProfiles, setCustomerProfiles] = useState<any[]>([]);
  const [supplierProfiles, setSupplierProfiles] = useState<any[]>([]);

  const { records, setSaleRecordsForDate } = useMilkTransactionContext();

  const [filterPeriod, setFilterPeriod] = useState<string>('all');
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
    const saleRecords = records.filter(r => r.type === 'Sale');
    return saleRecords.filter(record => {
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
    doc.text("Milk Sales Statement", 14, 20);

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
      "Unit",
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
      record.soldUnit || 'L',
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
      headStyles: { fillColor: [16, 185, 129] }, // emerald / green color
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

    doc.save(`Milk_Sales_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const [profilesResetCount, setProfilesResetCount] = useState<number>(0);

  useEffect(() => {
    // Load profiles: backend first, localStorage as fallback
    const loadProfiles = async () => {
      // --- Customers ---
      try {
        if (isOnline()) {
          const res: any = await ledgerApi.getCustomers();
          if (res.success && Array.isArray(res.data)) {
            const mapped = res.data.map((p: any) => ({
              id: p._id || p.id, customerName: p.customerName,
              phoneNumber: p.phoneNumber || '', openingBalance: p.openingBalance || 0,
              driverId: p.driverId || 'DIRECT', driverName: p.driverName || 'Direct',
            }));
            setCustomerProfiles(mapped);
            setCustomers(mapped.map((p: any) => ({ id: p.id, name: p.customerName })));
            localStorage.setItem('cheema_saved_customers', JSON.stringify(mapped));
            return;
          }
        }
      } catch (e) { }
      // Fallback to localStorage
      const stored = localStorage.getItem('cheema_saved_customers');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomerProfiles(parsed);
            setCustomers(parsed.map((p: any) => ({ id: p.id, name: p.customerName })));
          }
        } catch (e) { console.error(e); }
      }
    };

    const loadSuppliers = async () => {
      // --- Suppliers ---
      try {
        if (isOnline()) {
          const res: any = await ledgerApi.getSuppliers();
          if (res.success && Array.isArray(res.data)) {
            const mapped = res.data.map((p: any) => ({
              id: p._id || p.id, supplierName: p.supplierName,
              phoneNumber: p.phoneNumber || '', openingBalance: p.openingBalance || 0,
              driverId: p.driverId || 'DIRECT', driverName: p.driverName || 'Direct',
            }));
            setSupplierProfiles(mapped);
            localStorage.setItem('cheema_saved_suppliers', JSON.stringify(mapped));
            return;
          }
        }
      } catch (e) { }
      // Fallback
      const raw = localStorage.getItem('cheema_saved_suppliers');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSupplierProfiles(parsed);
        } catch (e) { console.error(e); }
      }
    };

    loadProfiles();
    loadSuppliers();
  }, [profilesResetCount]);

  useEffect(() => {
    const handleUpdate = () => {
      setProfilesResetCount(prev => prev + 1);
    };
    window.addEventListener('dairy-suppliers-updated', handleUpdate);
    window.addEventListener('dairy-customers-updated', handleUpdate);
    window.addEventListener('dairy-reset', handleUpdate);
    return () => {
      window.removeEventListener('dairy-suppliers-updated', handleUpdate);
      window.removeEventListener('dairy-customers-updated', handleUpdate);
      window.removeEventListener('dairy-reset', handleUpdate);
    };
  }, []);

  // Ledger Lookup Handlers & Calculations
  const handleQuickLookByName = (name: string) => {
    if (!name) return;
    const cleanName = name.trim().toLowerCase();

    // Check customers first
    const matchedCust = customerProfiles.find(c => c.customerName?.trim().toLowerCase() === cleanName);
    if (matchedCust) {
      setQuickLookType('customer');
      setQuickLookProfileId(matchedCust.id);
      setQuickLookSearch('');
      setShowQuickLookModal(true);
      return;
    }

    // Check suppliers second
    const matchedSupp = supplierProfiles.find(s => s.supplierName?.trim().toLowerCase() === cleanName);
    if (matchedSupp) {
      setQuickLookType('supplier');
      setQuickLookProfileId(matchedSupp.id);
      setQuickLookSearch('');
      setShowQuickLookModal(true);
      return;
    }

    // Fallback search
    setQuickLookType('customer');
    setQuickLookProfileId(null);
    setQuickLookSearch(name);
    setShowQuickLookModal(true);
  };

  const getAllCustomerEntries = async (name: string): Promise<any[]> => {
    if (!name) return [];
    try {
      // Find customer profile by name to get ID
      const profile = customerProfiles.find(c =>
        (c.customerName || '').trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (profile && isOnline()) {
        const res: any = await ledgerApi.getSaleByCustomer(profile.id);
        if (res.success && Array.isArray(res.data)) {
          return res.data.map((e: any) => ({
            ...e,
            date: e.date,
            totalAmount: Number(e.totalAmount) || 0,
            advanceAmount: Number(e.advanceAmount) || 0,
            paymentReceived: Number(e.paymentReceived) || 0,
          })).sort((a: any, b: any) => a.date.localeCompare(b.date));
        }
      }
    } catch (err) { }
    // Fallback: localStorage
    const all: any[] = [];
    const cleanName = name.trim().toLowerCase();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cheema_sale_ledger_')) {
        try {
          const entries = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(entries)) {
            entries.forEach((e: any) => {
              const n = (e.customerName || e.partyName || '').trim().toLowerCase();
              if (n === cleanName) {
                all.push({ ...e, totalAmount: Number(e.totalAmount) || 0, advanceAmount: Number(e.advanceAmount) || 0, paymentReceived: Number(e.paymentReceived) || 0 });
              }
            });
          }
        } catch (err) { }
      }
    }
    return all.sort((a, b) => a.date.localeCompare(b.date));
  };

  const getAllSupplierEntries = async (name: string): Promise<any[]> => {
    if (!name) return [];
    try {
      const profile = supplierProfiles.find(s =>
        (s.supplierName || '').trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (profile && isOnline()) {
        const res: any = await ledgerApi.getPurchaseBySupplier(profile.id);
        if (res.success && Array.isArray(res.data)) {
          return res.data.map((e: any) => ({
            ...e,
            date: e.date,
            totalAmount: Number(e.totalAmount) || 0,
            advanceAmount: Number(e.advanceAmount) || 0,
            paymentReceived: Number(e.paymentReceived) || 0,
          })).sort((a: any, b: any) => a.date.localeCompare(b.date));
        }
      }
    } catch (err) { }
    // Fallback: localStorage
    const all: any[] = [];
    const cleanName = name.trim().toLowerCase();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cheema_purchase_ledger_')) {
        try {
          const entries = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(entries)) {
            entries.forEach((e: any) => {
              if ((e.supplierName || '').trim().toLowerCase() === cleanName) {
                all.push({ ...e, totalAmount: Number(e.totalAmount) || 0, advanceAmount: Number(e.advanceAmount) || 0, paymentReceived: Number(e.paymentReceived) || 0 });
              }
            });
          }
        } catch (err) { }
      }
    }
    return all.sort((a, b) => a.date.localeCompare(b.date));
  };

  const getCustomerTimelineWithRunning = async (profileName: string, openingBalance: number) => {
    const list = await getAllCustomerEntries(profileName);
    let running = Number(openingBalance) || 0;
    return list.map(item => {
      const start = running;
      const end = start + item.totalAmount - item.advanceAmount - item.paymentReceived;
      running = end;
      return { ...item, openingBalanceState: start, remainingBalanceState: end };
    });
  };

  const getSupplierTimelineWithRunning = async (profileName: string, openingBalance: number) => {
    const list = await getAllSupplierEntries(profileName);
    let running = Number(openingBalance) || 0;
    return list.map(item => {
      const start = running;
      const end = start - item.totalAmount + item.advanceAmount + item.paymentReceived;
      running = end;
      return { ...item, openingBalanceState: start, remainingBalanceState: end };
    });
  };

  const calculateSNF = (lr: number, fat: number) => {
    const snf = (0.25 * lr) + (0.22 * fat) + 0.72;
    return snf > 0 ? snf : 0;
  };

  const calculateTSR = (fat: number, snf: number) => {
    return fat + snf;
  };

  const calculateTotalTS = (tsr: number, vol: number) => {
    return (tsr * vol) / 13;
  };

  const calculateAmount = (totalTs: number, rate: number) => {
    return totalTs * rate;
  };

  // --- Liters Row Change Handler ---
  const handleRowChange = (id: string, field: keyof SaleRow, value: string) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.id === id) {
        const numValue = field === 'name' ? value : (value === '' ? '' : value);
        const newRow = { ...row, [field]: numValue } as SaleRow;

        const safeNum = (v: any) => Number(v) || 0;

        if (field === 'fat' || field === 'lr') {
          newRow.snf = calculateSNF(safeNum(newRow.lr), safeNum(newRow.fat));
          newRow.tsr = calculateTSR(safeNum(newRow.fat), newRow.snf);
          newRow.totalTs = calculateTotalTS(newRow.tsr, safeNum(newRow.vol));
        }

        if (field === 'vol') {
          newRow.totalTs = calculateTotalTS(newRow.tsr, safeNum(newRow.vol));
        }

        if (field === 'fat' || field === 'lr' || field === 'vol' || field === 'rate') {
          newRow.amount = calculateAmount(newRow.totalTs, safeNum(newRow.rate));
          newRow.pricePerLiter = safeNum(newRow.vol) > 0 ? newRow.amount / safeNum(newRow.vol) : 0;
        }

        return newRow;
      }
      return row;
    }));
  };

  // --- Kilograms Row Change Handler ---
  const handleKgRowChange = (id: string, field: keyof KgSaleRow, value: string) => {
    setKgRows(prevRows => prevRows.map(row => {
      if (row.id === id) {
        const numValue = field === 'name' ? value : (value === '' ? '' : value);
        const newRow = { ...row, [field]: numValue } as KgSaleRow;

        const safeNum = (v: any) => Number(v) || 0;

        if (field === 'qtyKg') {
          // Standard auto-conversion: volumes (Liters) = Kg / 1.03
          newRow.vol = Number((safeNum(newRow.qtyKg) / 1.03).toFixed(4));
        }

        if (field === 'qtyKg' || field === 'rate' || field === 'chargeUnit') {
          const unit = newRow.chargeUnit || 'Kg';
          const qty = safeNum(newRow.qtyKg);
          const r = safeNum(newRow.rate);
          if (unit === 'Kg') {
            newRow.amount = qty * r;
            newRow.pricePerLiter = newRow.vol > 0 ? newRow.amount / newRow.vol : 0;
          } else {
            // "If I want to convert to liters, then I should not be asked for fat and lactometer reading."
            // Prices directly per Liter: Liters * Rate per Liter
            newRow.amount = newRow.vol * r;
            newRow.pricePerLiter = r;
          }
        }

        return newRow;
      }
      return row;
    }));
  };

  const handleBulkRateChange = (newRate: string) => {
    setBulkRate(newRate);
    localStorage.setItem('dairy_fixed_sales_rate', newRate);
    // Sync to backend (primary store)
    syncSetting('dairy_fixed_sales_rate', newRate).catch(() => { });
    const rateVal = newRate === '' ? '' : (Number(newRate) || 0);
    const numericRate = Number(rateVal) || 0;

    if (activeSaleType === 'L') {
      setRows(prevRows => prevRows.map(row => {
        const updatedRow = { ...row, rate: rateVal };
        const safeNum = (v: any) => Number(v) || 0;
        updatedRow.amount = calculateAmount(updatedRow.totalTs, numericRate);
        updatedRow.pricePerLiter = safeNum(updatedRow.vol) > 0 ? updatedRow.amount / safeNum(updatedRow.vol) : 0;
        return updatedRow;
      }));
    } else {
      setKgRows(prevRows => prevRows.map(row => {
        const updatedRow = { ...row, rate: rateVal };
        const safeNum = (v: any) => Number(v) || 0;
        const unit = updatedRow.chargeUnit || 'Kg';
        if (unit === 'Kg') {
          updatedRow.amount = safeNum(updatedRow.qtyKg) * numericRate;
          updatedRow.pricePerLiter = updatedRow.vol > 0 ? updatedRow.amount / updatedRow.vol : 0;
        } else {
          updatedRow.amount = updatedRow.vol * numericRate;
          updatedRow.pricePerLiter = numericRate;
        }
        return updatedRow;
      }));
    }
  };

  const addRow = () => {
    if (activeSaleType === 'L') {
      setRows(prev => [
        ...prev,
        { ...defaultRow, id: Math.random().toString(36).substring(7), rate: bulkRate }
      ]);
    } else {
      setKgRows(prev => [
        ...prev,
        { ...defaultKgRow, id: Math.random().toString(36).substring(7), rate: bulkRate }
      ]);
    }
  };

  const removeRow = (id: string, type: 'L' | 'Kg') => {
    if (type === 'L') {
      setRows(prev => prev.filter(r => r.id !== id));
    } else {
      setKgRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const saveAll = () => {
    const safeNum = (v: any) => Number(v) || 0;

    if (activeSaleType === 'L') {
      const validRows = rows.filter(r => r.name.trim() !== '' && Number(r.vol) > 0);
      if (validRows.length === 0) {
        alert("Please add at least one valid entry (Name and Volume both required).");
        return;
      }

      // Fat% validation — 0 to 15% normal range
      const badFatRow = validRows.find(r => safeNum(r.fat) > 15);
      if (badFatRow) {
        alert(`Invalid Fat% for "${badFatRow.name}": ${badFatRow.fat}%\nFat% should be between 0 and 15%. Please correct and try again.`);
        return;
      }
      // LR validation — 15 to 40 normal range
      const badLrRow = validRows.find(r => safeNum(r.lr) > 0 && (safeNum(r.lr) < 15 || safeNum(r.lr) > 40));
      if (badLrRow) {
        alert(`Invalid LR for "${badLrRow.name}": ${badLrRow.lr}\nLR should be between 15 and 40. Please correct and try again.`);
        return;
      }

      const newRecords: MilkRecord[] = validRows.map(r => ({
        id: r.id && !r.id.startsWith('1') && r.id.length > 5 ? r.id : Math.random().toString(36).substring(7),
        date: date,
        type: 'Sale',
        partyName: r.name.trim() !== '' ? r.name : 'Unknown Party',
        vol: safeNum(r.vol),
        fat: safeNum(r.fat),
        lr: safeNum(r.lr),
        snf: safeNum(r.snf),
        tsr: safeNum(r.tsr),
        totalTs: safeNum(r.totalTs),
        rate: safeNum(r.rate),
        pricePerLiter: safeNum(r.pricePerLiter),
        amount: safeNum(r.amount),
        soldUnit: 'L'
      }));

      try {
        setSaleRecordsForDate(date, newRecords);
        const fixedRate = localStorage.getItem('dairy_fixed_sales_rate') || '';
        setRows([{ ...defaultRow, id: Math.random().toString(36).substring(7), rate: fixedRate }]);
        alert("Sales (Liters) entries saved successfully!");
      } catch (err) {
        console.error("Save Error", err);
        alert("There was an error saving the records.");
      }
    } else {
      // Require name AND qtyKg > 0 to prevent 0-value ghost entries
      const validRows = kgRows.filter(r => r.name.trim() !== '' && Number(r.qtyKg) > 0);
      if (validRows.length === 0) {
        alert("Please add at least one valid entry (Name and Qty both required).");
        return;
      }

      const newRecords: MilkRecord[] = validRows.map(r => ({
        id: r.id && !r.id.startsWith('kg-1') && r.id.length > 5 ? r.id : Math.random().toString(36).substring(7),
        date: date,
        type: 'Sale',
        partyName: r.name.trim() !== '' ? r.name : 'Unknown Party',
        vol: safeNum(r.vol),
        fat: 0,
        lr: 0,
        snf: 0,
        tsr: 0,
        totalTs: 0,
        rate: safeNum(r.rate),
        pricePerLiter: safeNum(r.pricePerLiter),
        amount: safeNum(r.amount),
        soldUnit: 'Kg',
        soldQtyKg: safeNum(r.qtyKg)
      }));

      try {
        setSaleRecordsForDate(date, newRecords);
        const fixedRate = localStorage.getItem('dairy_fixed_sales_rate') || '';
        setKgRows([{ ...defaultKgRow, id: Math.random().toString(36).substring(7), rate: fixedRate }]);
        alert("Sales (Kilograms) entries saved successfully!\nAuto-converted weight to Liters at density 1.03 for stock deductions.");
      } catch (err) {
        console.error("Save Error", err);
        alert("There was an error saving the records.");
      }
    }
  };

  // --- Compute Totals for L Rows ---
  const safeNum = (v: any) => Number(v) || 0;

  const totals = rows.reduce(
    (acc, row) => {
      const vol = safeNum(row.vol);
      const fat = safeNum(row.fat);
      const lr = safeNum(row.lr);

      acc.vol += vol;
      acc.fat += fat * vol;
      acc.lr += lr * vol;
      acc.snf += row.snf * vol;
      acc.tsr += row.tsr * vol;
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

  // --- Compute Totals for Kg Rows ---
  const kgTotals = kgRows.reduce(
    (acc, row) => {
      const qtyKg = safeNum(row.qtyKg);

      acc.qtyKg += qtyKg;
      acc.vol += row.vol;
      acc.amount += row.amount;
      return acc;
    },
    { qtyKg: 0, vol: 0, amount: 0 }
  );

  const kgAvgPricePerLiter = kgTotals.vol > 0 ? (kgTotals.amount / kgTotals.vol) : 0;

  return (
    <div className="space-y-5 pb-12"> <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl p-5 shadow-sm gap-4"> <div> <h1 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2 tracking-tight"> <Activity className="w-5 h-5 text-emerald-600" />
      Milk Sales
    </h1> <p className="text-sm text-[var(--text-muted)] mt-0.5">Sales in Liters or Kilograms — TS and receivables calculate automatically</p> </div> <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-between lg:justify-end"> <div className="flex items-center"> <label className="text-sm font-semibold text-slate-700 mr-2 flex items-center"> <Calendar className="w-4 h-4 mr-1 text-slate-500" /> Date:
    </label> <input
        type="date"
        value={date}
        onChange={(e) => {
          const newDate = e.target.value;
          setDate(newDate);
          const fixedRate = localStorage.getItem('dairy_fixed_sales_rate') || '';
          setRows([{ ...defaultRow, id: Math.random().toString(36).substring(7), rate: fixedRate }]);
          setKgRows([{ ...defaultKgRow, id: Math.random().toString(36).substring(7), rate: fixedRate }]);
        }}
        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold text-slate-700 font-mono"
      /> </div> <div className="flex items-center bg-green-50 px-3 py-1.5 rounded-lg border border-green-200"> <label htmlFor="bulk-sales-rate" className="text-xs font-bold text-green-800 mr-2 flex items-center whitespace-nowrap">
        Rate/TS:
      </label> <input
            id="bulk-sales-rate"
            type="number"
            step="0.01"
            placeholder="Auto-Rate"
            value={bulkRate}
            onChange={(e) => handleBulkRateChange(e.target.value)}
            className="w-20 px-2 py-1 border border-green-200 bg-white rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-bold font-mono text-green-900"
          /> </div>

        <div className="flex flex-col justify-end sm:flex-row gap-2 w-full mt-4 px-1">

          {/* Add Row Button */}
          <button
            onClick={addRow}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg font-bold shadow-sm flex items-center justify-center transition-colors text-xs whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-1 shrink-0" />
            Add Row
          </button>

          {/* Save Entries Button */}
          <button
            onClick={saveAll}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg font-bold shadow-sm flex items-center justify-center transition-colors text-xs whitespace-nowrap cursor-pointer"
          >
            <Save className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-1 shrink-0" />
            Save Entries
          </button>

          {/* Open Ledger Acc Button */}
          <button
            onClick={() => {
              setQuickLookType('customer');
              setQuickLookProfileId(null);
              setQuickLookSearch('');
              setShowQuickLookModal(true);
            }}
            className="w-full sm:w-auto bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg font-bold shadow-sm flex items-center justify-center transition-colors text-xs whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-1 text-emerald-600 shrink-0" />
            Open Ledger Acc
          </button>

        </div>

      </div>

    </div>

      {/* Tabs segment */}
      <div className="flex bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl p-1 w-full max-w-md md:max-w-xs sm:max-w-sm">
        <button
          onClick={() => setActiveSaleType('L')}
          className={`flex-1 py-2.5 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2 cursor-pointer ${activeSaleType === 'L'
            ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm border border-slate-200/50'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
        >
          <Activity className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Liters (L)</span>
        </button>

        <button
          onClick={() => setActiveSaleType('Kg')}
          className={`flex-1 py-2.5 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2 cursor-pointer ${activeSaleType === 'Kg'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
        >
          <Scale className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Kilograms (Kg)</span>
        </button>
      </div>

      {activeSaleType === 'L' ? (
        <>
          {/* Liters Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4"> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Liters</span> <span className="text-xl font-bold text-slate-800 font-mono">{totals.vol.toFixed(2)} L</span> </div> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg SNF%</span> <span className="text-xl font-bold text-slate-800 font-mono">{avgSnf.toFixed(2)}%</span> </div> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg TS%</span> <span className="text-xl font-bold text-slate-800 font-mono">{avgTsr.toFixed(2)}%</span> </div> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total TS</span> <span className="text-xl font-bold text-slate-800 font-mono">{totals.totalTs.toFixed(2)}</span> </div> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg Price/L</span> <span className="text-xl font-bold text-slate-800 font-mono">Rs.{avgPricePerLiter.toFixed(2)}</span> </div> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Receivable</span> <span className="text-xl font-bold text-slate-800 font-mono">Rs.{totals.amount.toFixed(2)}</span> </div> </div>

          {/* Liters Entry Form Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-650 text-xs uppercase tracking-wider">
                    <th className="px-3 py-3 font-semibold whitespace-nowrap">Name / Party</th>
                    <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Vol (L)</th>
                    <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Fat%</th>
                    <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">LR</th>
                    <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">SNF%</th>
                    <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">TS%</th>
                    <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Total TS</th>
                    <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Rate/TS</th>
                    <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Price/L</th>
                    <th className="px-3 py-3 font-semibold text-right whitespace-nowrap">Amount</th>
                    <th className="px-3 py-3 font-semibold w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">

                      {/* Name / Party */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1 w-auto inline-block">
                          <input
                            type="text"
                            list={`customers-list-${row.id}`}
                            placeholder="— Select Customer —"
                            value={row.name}
                            onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                            size={row.name ? Math.max(22, row.name.length) : 22}
                            className="px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-semibold bg-white w-auto inline-block"
                          />
                          {row.name && (
                            <button
                              type="button"
                              onClick={() => handleQuickLookByName(row.name)}
                              className="p-1 px-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-500 hover:text-emerald-700 rounded text-[10px] font-bold flex items-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                              title="Open Account Ledger"
                            >
                              👤 Acc
                            </button>
                          )}
                        </div>
                        <datalist id={`customers-list-${row.id}`}>
                          {customers.map(c => (
                            <option key={c.id} value={c.name} />
                          ))}
                        </datalist>
                      </td>

                      {/* Volume */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={row.vol || ''}
                          onChange={(e) => handleRowChange(row.id, 'vol', e.target.value)}
                          style={{ width: `${row.vol ? Math.max(5, String(row.vol).length) * 9 + 20 : 75}px` }}
                          className="px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-mono font-bold text-center inline-block"
                        />
                      </td>

                      {/* Fat% */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={row.fat || ''}
                          onChange={(e) => handleRowChange(row.id, 'fat', e.target.value)}
                          style={{ width: `${row.fat ? Math.max(4, String(row.fat).length) * 9 + 20 : 65}px` }}
                          className="px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-mono text-center inline-block"
                        />
                      </td>

                      {/* LR */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="0"
                          value={row.lr || ''}
                          onChange={(e) => handleRowChange(row.id, 'lr', e.target.value)}
                          style={{ width: `${row.lr ? Math.max(4, String(row.lr).length) * 9 + 20 : 65}px` }}
                          className="px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-mono text-center inline-block"
                        />
                      </td>

                      {/* SNF% */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div
                          style={{ width: `${Math.max(4, row.snf.toFixed(2).length) * 9 + 20}px` }}
                          className="px-2 py-1.5 bg-slate-100 border border-transparent rounded text-xs text-slate-700 font-mono text-center inline-block select-none"
                        >
                          {row.snf.toFixed(2)}
                        </div>
                      </td>

                      {/* TS% */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div
                          style={{ width: `${Math.max(4, row.tsr.toFixed(2).length) * 9 + 20}px` }}
                          className="px-2 py-1.5 bg-slate-100 border border-transparent rounded text-xs text-slate-700 font-mono text-center inline-block select-none"
                        >
                          {row.tsr.toFixed(2)}
                        </div>
                      </td>

                      {/* Total TS */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div
                          style={{ width: `${Math.max(5, row.totalTs.toFixed(2).length) * 9 + 20}px` }}
                          className="px-2 py-1.5 bg-green-50 border border-green-100 rounded text-xs text-green-800 font-bold font-mono text-center inline-block select-none"
                        >
                          {row.totalTs.toFixed(2)}
                        </div>
                      </td>

                      {/* Rate/TS */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={row.rate || ''}
                          onChange={(e) => handleRowChange(row.id, 'rate', e.target.value)}
                          style={{ width: `${row.rate ? Math.max(5, String(row.rate).length) * 9 + 20 : 75}px` }}
                          className="px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-mono font-semibold text-center inline-block"
                        />
                      </td>

                      {/* Price/L */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div
                          style={{ width: `${Math.max(5, row.pricePerLiter.toFixed(2).length) * 9 + 20}px` }}
                          className="px-2 py-1.5 bg-slate-100 border border-transparent rounded text-xs text-slate-700 font-mono text-center inline-block select-none"
                        >
                          {row.pricePerLiter.toFixed(2)}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div
                          style={{ width: `${Math.max(6, row.amount.toFixed(2).length) * 9 + 24}px` }}
                          className="px-2 py-1.5 bg-slate-100 border border-transparent rounded text-xs font-bold text-slate-800 font-mono text-right inline-block select-none"
                        >
                          {row.amount.toFixed(2)}
                        </div>
                      </td>

                      {/* Remove Action */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <button
                          onClick={() => removeRow(row.id, 'L')}
                          className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200 text-xs">
                    <td className="px-3 py-3 font-bold text-slate-700 font-sans whitespace-nowrap">TOTAL</td>
                    <td className="px-3 py-3 font-bold text-slate-800 font-mono text-center whitespace-nowrap">{totals.vol.toFixed(2)} L</td>
                    <td className="px-3 py-3 text-slate-500 text-center whitespace-nowrap">avg <span className="font-mono font-bold">{avgFat.toFixed(2)}%</span></td>
                    <td className="px-3 py-3 text-slate-500 text-center whitespace-nowrap">avg <span className="font-mono font-bold">{avgLr.toFixed(1)}</span></td>
                    <td className="px-3 py-3 text-slate-500 text-center whitespace-nowrap">avg <span className="font-mono font-bold">{avgSnf.toFixed(2)}%</span></td>
                    <td className="px-3 py-3 text-slate-500 text-center whitespace-nowrap">avg <span className="font-mono font-bold">{avgTsr.toFixed(2)}%</span></td>
                    <td className="px-3 py-3 font-extrabold text-green-700 font-mono text-center whitespace-nowrap">{totals.totalTs.toFixed(2)}</td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-slate-500 text-center whitespace-nowrap">avg <span className="font-mono font-semibold">Rs.{avgPricePerLiter.toFixed(2)}</span></td>
                    <td className="px-3 py-3 font-black text-rose-700 text-sm font-mono text-right whitespace-nowrap">Rs.{totals.amount.toFixed(2)}</td>
                    <td className="px-3 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div> </>
      ) : (
        <>
          {/* Kilograms Info Note */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-2.5"> <Info className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" /> <div className="text-xs text-green-800 space-y-1"> <p className="font-black">Auto-Conversion to Liters Policy (Density: 1.03):</p> <p>
            As configured, milk sold in kilograms is automatically converted to volume in liters formula:
            <strong className="font-mono block mt-1 bg-green-150/40 px-2 py-1 rounded inline-block">Liters = Kilograms / 1.03</strong> </p> <p>
              Deductions and reports reflect this converted liters capacity precisely, whereas original weight indicators are preserved in audit history.
            </p> </div> </div>

          {/* Kilograms Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Weight</span> <span className="text-xl font-bold text-green-700 font-mono">{kgTotals.qtyKg.toFixed(2)} Kg</span> </div> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Auto-Conv Liters</span> <span className="text-xl font-bold text-slate-800 font-mono">{kgTotals.vol.toFixed(2)} L</span> </div> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg Price/L</span> <span className="text-xl font-bold text-slate-800 font-mono">Rs.{kgAvgPricePerLiter.toFixed(2)}</span> </div> <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col items-center justify-center shadow-sm"> <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Receivable</span> <span className="text-xl font-bold text-slate-800 font-mono">Rs.{kgTotals.amount.toFixed(2)}</span> </div> </div>

          {/* Kilograms Entry Form Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse"> <thead> <tr className="bg-slate-50 border-b border-slate-200 text-slate-650 text-xs uppercase tracking-wider"> <th className="px-3 py-3 font-semibold">Name / Party</th> <th className="px-3 py-3 font-semibold w-24">Qty (Kg)</th> <th className="px-3 py-3 font-semibold w-24">Conv Liters</th> <th className="px-3 py-3 font-semibold w-28">Charge Basis</th> <th className="px-3 py-3 font-semibold w-24">Rate (/Unit)</th> <th className="px-3 py-3 font-semibold w-24">Price/L</th> <th className="px-3 py-3 font-semibold w-28">Amount</th> <th className="px-3 py-3 font-semibold w-10"></th> </tr> </thead> <tbody className="divide-y divide-slate-100">
            {kgRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors"> <td className="px-3 py-2"> <div className="flex items-center gap-1 w-full"> <input
                type="text"
                list={`customers-list-kg-${row.id}`}
                placeholder="— Select or Type Customer —"
                value={row.name}
                onChange={(e) => handleKgRowChange(row.id, 'name', e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-semibold bg-white"
              />
                {row.name && (
                  <button
                    type="button"
                    onClick={() => handleQuickLookByName(row.name)}
                    className="p-1 px-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-500 hover:text-emerald-700 rounded text-[10px] font-bold flex items-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                    title="Open Account Ledger"
                  >
                    👤 Acc
                  </button>
                )}
              </div> <datalist id={`customers-list-kg-${row.id}`}>
                  {customers.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist> </td> <td className="px-3 py-2"> <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={row.qtyKg}
                  onChange={(e) => handleKgRowChange(row.id, 'qtyKg', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-350 bg-green-50/20 text-green-900 rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-mono font-bold"
                /> </td> <td className="px-3 py-2"> <div className="px-2 py-1.5 bg-slate-150 border border-transparent rounded text-xs text-slate-800 font-mono font-bold">
                  {row.vol > 0 ? `${row.vol.toFixed(2)} L` : '0.00 L'}
                </div> </td> <td className="px-3 py-2"> <select
                  value={row.chargeUnit || 'Kg'}
                  onChange={(e) => handleKgRowChange(row.id, 'chargeUnit', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-semibold bg-white"
                > <option value="Kg">Weight (Kg)</option> <option value="L">Volume (Liters)</option> </select> </td> <td className="px-3 py-2"> <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={row.rate}
                  onChange={(e) => handleKgRowChange(row.id, 'rate', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-xs font-mono font-semibold"
                /> </td> <td className="px-3 py-2"> <div className="px-2 py-1.5 bg-slate-100 border border-transparent rounded text-xs text-slate-700 font-mono">
                  {row.pricePerLiter.toFixed(2)}
                </div> </td> <td className="px-3 py-2"> <div className="px-2 py-1.5 bg-slate-100 border border-transparent rounded text-xs font-bold text-slate-800 font-mono font-sans">
                  {row.amount.toFixed(2)}
                </div> </td> <td className="px-3 py-2"> <button
                  onClick={() => removeRow(row.id, 'Kg')}
                  className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  title="Remove row"
                > <Trash2 className="w-4 h-4" /> </button> </td> </tr>
            ))}
          </tbody> <tfoot> <tr className="bg-slate-50 border-t border-slate-200 text-xs"> <td className="px-3 py-3 font-bold text-slate-700 font-sans">TOTAL</td> <td className="px-3 py-3 font-extrabold text-green-850 font-mono">{kgTotals.qtyKg.toFixed(2)} Kg</td> <td className="px-3 py-3 font-bold text-slate-800 font-mono">{kgTotals.vol.toFixed(2)} L</td> <td className="px-3 py-3"></td> <td className="px-3 py-3 text-slate-500">avg <span className="font-mono font-semibold">Rs.{kgAvgPricePerLiter.toFixed(2)}</span></td> <td className="px-3 py-3 font-black text-rose-700 text-sm font-mono">Rs.{kgTotals.amount.toFixed(2)}</td> <td className="px-3 py-3"></td> </tr> </tfoot> </table> </div> </div> </>
      )}

      {/* Unified History List */}
      <div className="mt-8 font-sans">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-4">

          {/* Title & PDF Button Container */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
                Recent Sales History
              </h2>
              <button
                onClick={downloadPDF}
                className="btn btn-sm gap-1.5 text-white shrink-0"
                style={{ background: '#059669', borderColor: '#047857' }}
                title="Download filtered records as PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Filter Period - Responsive Wrapper */}
          <div className="w-full xl:w-auto">

            {/* 1. Mobile & Tablet View: Dropdown Only (Hidden on Desktop) */}
            <div className="block sm:hidden w-full">
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
              >
                <option value="all">All Records</option>
                <option value="one-day">One Day</option>
                <option value="yesterday">Yesterday</option>
                <option value="two-day">Two-day</option>
                <option value="three-day">Three days</option>
                <option value="five-day">Five days</option>
                <option value="seven-day">Seven-day</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* 2. Desktop View: Buttons Only (Forcefully hidden on mobile screens) */}
            <div
              className="flex flex-wrap items-center gap-2"
              style={{ display: typeof window !== 'undefined' && window.innerWidth < 640 ? 'none' : undefined }}
            >
              <button
                onClick={() => setFilterPeriod('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterPeriod === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                All Records
              </button>
              <button
                onClick={() => setFilterPeriod('one-day')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterPeriod === 'one-day'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                One Day
              </button>
              <button
                onClick={() => setFilterPeriod('yesterday')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterPeriod === 'yesterday'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setFilterPeriod('two-day')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterPeriod === 'two-day'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                Two-day
              </button>
              <button
                onClick={() => setFilterPeriod('three-day')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterPeriod === 'three-day'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                Three days
              </button>
              <button
                onClick={() => setFilterPeriod('five-day')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterPeriod === 'five-day'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                Five days
              </button>
              <button
                onClick={() => setFilterPeriod('seven-day')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterPeriod === 'seven-day'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                Seven-day
              </button>
              <button
                onClick={() => setFilterPeriod('custom')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterPeriod === 'custom'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                Custom Range
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {filterPeriod === 'custom' && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 flex flex-col sm:flex-row items-center gap-4 animate-fadeIn animate-duration-200">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-600 shrink-0">Start Date:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 font-mono w-full sm:w-auto"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-600 shrink-0">End Date:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 font-mono w-full sm:w-auto"
              />
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-650 text-xs uppercase tracking-wider">
                  <th className="px-3 py-3 font-semibold w-16">S.No.</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold font-sans">Sale Unit</th>
                  <th className="px-3 py-3 font-semibold">Name / Party</th>
                  <th className="px-3 py-3 font-semibold">Deducted Volume (L)</th>
                  <th className="px-3 py-3 font-semibold">TS%</th>
                  <th className="px-3 py-3 font-semibold">Total TS</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filtered = getFilteredRecords();

                  return filtered.length > 0 ? filtered.map((record, index) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 text-sm text-slate-500 font-mono">{index + 1}</td>
                      <td className="px-3 py-3 text-sm text-slate-600 font-medium">{record.date}</td>
                      <td className="px-3 py-3 text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase ${record.soldUnit === 'Kg'
                          ? 'bg-green-100 text-green-800 font-mono'
                          : 'bg-slate-100 text-slate-600 font-mono'
                          }`}>
                          {record.soldUnit || 'L'}
                        </span>
                      </td>
                      <td
                        className="px-3 py-3 text-sm text-green-700 hover:text-green-850 font-bold cursor-pointer hover:underline"
                        onClick={() => {
                          const dest = user?.role === 'Admin' ? '/admin/sale-ledger' : '/accountant/sale-ledger';
                          navigate(dest, {
                            state: {
                              preselectProfileName: record.partyName,
                              openEntryModal: false
                            }
                          });
                        }}
                      >
                        {record.partyName}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700 font-semibold font-mono">
                        <div>
                          <span>{record.vol.toFixed(2)} L</span>
                          {record.soldUnit === 'Kg' && (
                            <span className="block text-[10px] font-normal text-slate-450">
                              ({record.soldQtyKg?.toFixed(2)} Kg originally)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 font-mono">{record.tsr.toFixed(2)}%</td>
                      <td className="px-3 py-3 text-sm font-bold text-green-700 font-mono">{record.totalTs.toFixed(2)}</td>
                      <td className="px-3 py-3 text-sm font-bold text-slate-800 font-mono">Rs. {record.amount.toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                        No sales records found.
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUICK ACCOUNT STATEMENT OVERLAY MODAL */}
      {showQuickLookModal && (() => {
        const getSelectedProfile = () => {
          if (quickLookType === 'customer') {
            return customerProfiles.find(p => p.id === quickLookProfileId);
          } else {
            return supplierProfiles.find(p => p.id === quickLookProfileId);
          }
        };

        const activeProfile = getSelectedProfile();

        const [timeline, setTimeline] = useState<any[]>([]);
        const [latestOutstanding, setLatestOutstanding] = useState<number>(0);

        useEffect(() => {
          if (activeProfile) {
            const loadTimeline = async () => {
              let timelineData: any[] = [];
              if (quickLookType === 'customer') {
                timelineData = await getCustomerTimelineWithRunning(activeProfile.customerName, activeProfile.openingBalance);
              } else {
                timelineData = await getSupplierTimelineWithRunning(activeProfile.supplierName, activeProfile.openingBalance);
              }
              setTimeline(timelineData);
              setLatestOutstanding(timelineData.length > 0 ? timelineData[timelineData.length - 1].remainingBalanceState : (Number(activeProfile.openingBalance) || 0));
            };
            loadTimeline();
          }
        }, [activeProfile, quickLookType]);

        // Search filtering for profile select
        const availableProfiles = quickLookType === 'customer' ? customerProfiles : supplierProfiles;
        const filteredProfileList = availableProfiles.filter(p => {
          const name = quickLookType === 'customer' ? p.customerName : p.supplierName;
          return name?.toLowerCase().includes(quickLookSearch.toLowerCase());
        });

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[300] p-4 animate-fade-in text-left"> <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">

            {/* Sticky Top Header bar */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950 text-white flex justify-between items-start gap-4"> <div className="text-left flex-1"> <div className="flex flex-wrap items-center gap-2"> <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase rounded-full border border-emerald-500/30">
              Quick Account Ledger Statement
            </span> <span className="text-xs text-slate-400">
                Iframe View Mode
              </span> </div> <h3 className="text-lg font-black text-white mt-1.5 tracking-tight flex items-center gap-2"> <span>👤 Quick Account Viewer</span> </h3> </div> <button
                onClick={() => {
                  setShowQuickLookModal(false);
                  setQuickLookProfileId(null);
                  setQuickLookSearch('');
                }}
                className="p-1.5 px-3.5 bg-white/10 hover:bg-rose-600/20 text-slate-200 hover:text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close Lookup
              </button> </div>

            {/* Selector Bar */}
            <div className="p-5 border-b border-slate-150 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Account Type buttons */}
              <div> <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Account Type</label> <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1"> <button
                type="button"
                onClick={() => {
                  setQuickLookType('customer');
                  setQuickLookProfileId(null);
                  setQuickLookSearch('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${quickLookType === 'customer'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Customer (Sales)
              </button> <button
                type="button"
                onClick={() => {
                  setQuickLookType('supplier');
                  setQuickLookProfileId(null);
                  setQuickLookSearch('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${quickLookType === 'supplier'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                  Supplier (Purchase)
                </button> </div> </div>

              {/* Profile Search & Dropdown Selection */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3"> <div> <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Filter/Search Name</label> <div className="relative"> <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" /> <input
                type="text"
                placeholder="Type name to filter..."
                value={quickLookSearch}
                onChange={(e) => setQuickLookSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              /> </div> </div> <div> <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Select Profile</label> <select
                value={quickLookProfileId || ''}
                onChange={(e) => setQuickLookProfileId(e.target.value || null)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              > <option value="">— Select {quickLookType === 'customer' ? 'Customer' : 'Supplier'} —</option>
                {filteredProfileList.map(p => {
                  const name = quickLookType === 'customer' ? p.customerName : p.supplierName;
                  return (
                    <option key={p.id} value={p.id}>{name}</option>
                  );
                })}
              </select> </div> </div> </div>

            {/* Statement details layout */}
            {activeProfile ? (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50/20">

                {/* Account Summary Stats bar */}
                <div className="p-6 border-b border-slate-100 bg-white grid grid-cols-2 md:grid-cols-4 gap-4"> <div> <span className="text-[10px] text-slate-400 font-bold uppercase block">Opening Balance</span> <span className="text-xs font-bold font-mono text-slate-700 block mt-1">
                  Rs. {(Number(activeProfile.openingBalance) || 0).toLocaleString()}
                </span> </div> <div> <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Balance Dues</span> <span className={`text-base font-black font-mono block mt-0.5 ${quickLookType === 'customer'
                  ? latestOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
                  : latestOutstanding < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                  Rs. {latestOutstanding.toLocaleString()}
                </span> </div> <div> <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact Details</span> <span className="text-xs font-semibold text-slate-600 block mt-1">
                  {activeProfile.phoneNumber || 'N/A'}
                </span> </div> <div> <span className="text-[10px] text-slate-400 font-bold uppercase block">Location / Driver</span> <span className="text-xs font-semibold text-slate-600 block truncate mt-1">
                  {activeProfile.location || activeProfile.areaLocation || 'N/A'} ({activeProfile.driverName || 'No driver'})
                </span> </div> </div>

                {/* Statement Table Content */}
                <div className="flex-1 overflow-y-auto p-6"> <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs"> <table className="w-full text-left border-collapse text-xs"> <thead> <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider"> <th className="px-4 py-3 font-semibold w-12">No.</th> <th className="px-4 py-3 font-semibold w-24">Date</th> <th className="px-4 py-3 font-semibold w-20">Time</th> <th className="px-4 py-3 font-semibold">Milk Metrics / Qty</th> <th className="px-4 py-3 font-semibold w-28">Milk Value</th> <th className="px-4 py-3 font-semibold w-24">Advance / Spoil</th> <th className="px-4 py-3 font-semibold w-24">Cash Collection</th> <th className="px-4 py-3 font-semibold w-28">Cumulative Bal</th> </tr> </thead> <tbody className="divide-y divide-slate-100 font-mono">
                  {timeline.length > 0 ? timeline.map((row, index) => {
                    const milkLit = Number(row.milkLiter) || Number(row.vol) || 0;
                    const milkRate = Number(row.rate) || 0;

                    return (
                      <tr key={row.id || index} className="hover:bg-slate-50/50"> <td className="px-4 py-2.5 text-slate-400 font-medium">{index + 1}</td> <td className="px-4 py-2.5 text-slate-600 font-sans font-medium">{row.date}</td> <td className="px-4 py-2.5 text-slate-450">{row.time || '—'}</td> <td className="px-4 py-2.5 text-slate-700 font-semibold">
                        {milkLit > 0 ? (
                          <div> <span>{milkLit.toFixed(2)} L @ {milkRate.toFixed(1)}</span>
                            {row.fat !== undefined && (
                              <span className="block text-[9px] text-slate-450 font-normal">
                                Fat: {row.fat}% | LR: {row.lr} | SNF: {row.snf?.toFixed(2)}% | TS: {row.totalTs?.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Cash-only deal</span>
                        )}
                      </td> <td className="px-4 py-2.5 text-slate-800 font-bold">
                          Rs. {row.totalAmount?.toLocaleString()}
                        </td> <td className="px-4 py-2.5">
                          {row.advanceAmount > 0 ? (
                            <span className="text-emerald-700 font-bold block">Rs. {row.advanceAmount.toLocaleString()}</span>
                          ) : null}
                          {row.isSpoiled && (
                            <span className="text-rose-600 font-bold block text-[10px]">Spoiled: Rs. {row.spoiledAmount?.toLocaleString()}</span>
                          )}
                          {row.advanceAmount <= 0 && !row.isSpoiled ? <span className="text-slate-400">—</span> : null}
                        </td> <td className="px-4 py-2.5 text-slate-705">
                          {row.paymentReceived > 0 ? (
                            <span className="text-blue-700 font-bold block">Rs. {row.paymentReceived.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td> <td className={`px-4 py-2.5 font-bold ${quickLookType === 'customer'
                          ? row.remainingBalanceState > 0 ? 'text-rose-600' : 'text-emerald-600'
                          : row.remainingBalanceState < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                          Rs. {row.remainingBalanceState.toLocaleString()}
                        </td> </tr>
                    );
                  }) : (
                    <tr> <td colSpan={8} className="px-4 py-12 text-center text-slate-500 font-sans"> <div className="text-slate-400 text-3xl">📄</div> <p className="mt-2 font-semibold">No ledger transactions found</p> <p className="text-[11px] text-slate-400 font-normal">Any entries or payments saved will register dynamically here.</p> </td> </tr>
                  )}
                </tbody> </table> </div> </div> </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center py-20 bg-slate-50/50 text-center"> <div className="p-4 bg-slate-100 rounded-full border border-slate-200 text-slate-400"> <User className="w-8 h-8" /> </div> <h4 className="font-bold text-slate-700 mt-4">Account statement lookup ready</h4> <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Select a Customer or Supplier from the dropdowns above to load their chronological ledger, balances status, and quality transactions instantly on target.
              </p> </div>
            )}

            {/* Sticky bottom save bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5"> <button
              type="button"
              onClick={() => {
                setShowQuickLookModal(false);
                setQuickLookProfileId(null);
                setQuickLookSearch('');
              }}
              className="px-5 py-2 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Close Statement lookup
            </button> </div> </div> </div>
        );
      })()}
    </div>
  );
}
