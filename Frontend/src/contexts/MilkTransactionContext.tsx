import React, { createContext, useContext, useState, useEffect } from 'react';
import { milkRecordsApi, isOnline, isBackendReachable } from '../services/api';
import { addToQueue } from '../services/offlineSync';

export interface MilkRecord {
  id: string;
  date: string;
  type: 'Purchase' | 'Sale';
  partyName: string;
  vol: number;
  fat: number;
  lr: number;
  snf: number;
  tsr: number;
  totalTs: number;
  rate: number;
  pricePerLiter: number;
  amount: number;
  soldUnit?: 'L' | 'Kg';
  soldQtyKg?: number;
  advance?: number;
  paid?: number;
  routeId?: string;
  routeName?: string;
}

interface MilkTransactionContextType {
  records: MilkRecord[];
  addRecords: (newRecords: MilkRecord[]) => void;
  removeRecord: (id: string) => void;
  setPurchaseRecordsForDate: (date: string, purchaseRecords: MilkRecord[], routeId?: string) => void;
  setSaleRecordsForDate: (date: string, saleRecords: MilkRecord[]) => void;
  syncFromBackend: () => Promise<void>;
}

const MilkTransactionContext = createContext<MilkTransactionContextType | undefined>(undefined);

const toFrontend = (r: any): MilkRecord => {
  const spoiledVol = (r.type === 'Purchase') ? (Number(r.spoiledLiters) || 0) : 0;
  const spoiledAmt = (r.type === 'Purchase') ? (Number(r.spoiledAmount) || 0) : 0;
  return {
    id: r._id || r.id,
    date: r.date,
    type: r.type,
    partyName: r.partyName,
    vol: (Number(r.vol) || 0) - spoiledVol,
    fat: r.fat,
    lr: r.lr,
    snf: r.snf,
    tsr: Number(r.tsr) || ((Number(r.fat) || 0) + (Number(r.snf) || 0)),
    totalTs: r.totalTs,
    rate: r.rate,
    pricePerLiter: r.pricePerLiter,
    amount: (Number(r.amount) || 0) - spoiledAmt,
    soldUnit: r.soldUnit,
    soldQtyKg: r.soldQtyKg,
    advance: r.advance,
    paid: r.paid,
    routeId: r.routeId?._id || r.routeId,
    routeName: r.routeName,
  };
};

// localStorage helper — saari ledger keys clear karo
const _clearAllLedgerLS = () => {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('cheema_purchase_ledger_') ||
      key.startsWith('cheema_sale_ledger_')
    )) toRemove.push(key);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
};

export function MilkTransactionProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<MilkRecord[]>(() => {
    try {
      const stored = localStorage.getItem('dairy_milk_records');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  React.useEffect(() => {
    const handleReset = () => {
      setRecords([]);
      localStorage.setItem('dairy_milk_records', JSON.stringify([]));
      _clearAllLedgerLS();
      localStorage.removeItem('dairy_dashboard_data');
    };
    window.addEventListener('dairy-reset', handleReset);
    return () => window.removeEventListener('dairy-reset', handleReset);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setTimeout(() => syncFromBackend(), 3500);
    };
    const handleLogin = () => syncFromBackend();
    window.addEventListener('online', handleOnline);
    window.addEventListener('dairy-user-login', handleLogin);
    if (isOnline()) syncFromBackend();

    // Har 30 second mein background sync — dono panels mein data fresh rahe
    const pollInterval = setInterval(() => {
      if (isOnline()) syncFromBackend();
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('dairy-user-login', handleLogin);
      clearInterval(pollInterval);
    };
  }, []);

  // ─── syncFromBackend ───────────────────────────────────────────────────────
  // BACKEND = single source of truth
  // Backend se jo data aaye woh localStorage replace karta hai — koi merge nahi
  const syncFromBackend = async () => {
    if (!isOnline()) {
      try {
        const stored = localStorage.getItem('dairy_milk_records');
        if (stored) setRecords(JSON.parse(stored));
      } catch (e) {}
      return;
    }
    try {
      const result: any = await milkRecordsApi.getAll();
      if (result.success && Array.isArray(result.data)) {
        const backendData = result.data.map(toFrontend);

        // Backend data directly set karo — localStorage replace
        setRecords(backendData);
        localStorage.setItem('dairy_milk_records', JSON.stringify(backendData));

        // Backend empty hone pe ledger LS bhi clean karo
        if (backendData.length === 0) {
          _clearAllLedgerLS();
          localStorage.removeItem('dairy_dashboard_data');
        }
      }
    } catch (err) {
      // Backend fail — localStorage se fallback
      try {
        const stored = localStorage.getItem('dairy_milk_records');
        if (stored) setRecords(JSON.parse(stored));
      } catch (e) {}
    }
  };

  // ─── addRecords ───────────────────────────────────────────────────────────
  const addRecords = (newRecords: MilkRecord[]) => {
    // Optimistic UI update — temp IDs se
    setRecords(prev => {
      const newIds = new Set(newRecords.map(r => r.id));
      const updated = [...prev.filter(r => !newIds.has(r.id)), ...newRecords];
      localStorage.setItem('dairy_milk_records', JSON.stringify(updated));
      return updated;
    });

    const purchaseRecords = newRecords.filter(r => r.type === 'Purchase');
    if (purchaseRecords.length > 0) _updatePurchaseLedgerLS(purchaseRecords);

    if (isOnline()) {
      milkRecordsApi.createBulk({ records: newRecords }).then((res: any) => {
        if (res?.data && Array.isArray(res.data)) {
          // Backend ne real IDs diye — temp IDs hatao, backend IDs lagao
          const localIds = new Set(newRecords.map(r => r.id));
          const backendRecords = res.data.map(toFrontend);
          setRecords(prev => {
            const updated = [...prev.filter(r => !localIds.has(r.id)), ...backendRecords];
            localStorage.setItem('dairy_milk_records', JSON.stringify(updated));
            return updated;
          });
        }
      }).catch(() => {
        newRecords.forEach(r => addToQueue('/milk-records', 'POST', r, `Add milk ${r.type}`));
      });
    } else {
      newRecords.forEach(r => addToQueue('/milk-records', 'POST', r, `Add milk ${r.type}`));
    }
  };

  // ─── setPurchaseRecordsForDate ─────────────────────────────────────────────
  const setPurchaseRecordsForDate = (date: string, purchaseRecords: MilkRecord[], routeId?: string) => {
    setRecords(prev => {
      let filtered = routeId === 'all'
        ? prev.filter(r => !(r.type === 'Purchase' && r.date === date))
        : routeId && routeId !== 'manual'
          ? prev.filter(r => !(r.type === 'Purchase' && r.date === date && r.routeId === routeId))
          : prev.filter(r => !(r.type === 'Purchase' && r.date === date && !r.routeId));
      const incomingIds = new Set(purchaseRecords.map(r => r.id));
      filtered = filtered.filter(r => !incomingIds.has(r.id));
      const updated = [...filtered, ...purchaseRecords];
      localStorage.setItem('dairy_milk_records', JSON.stringify(updated));
      return updated;
    });

    _setPurchaseLedgerForDateLS(date, purchaseRecords, routeId);
    window.dispatchEvent(new CustomEvent('dairy-purchase-saved'));

    if (isOnline()) {
      milkRecordsApi.createBulk({ records: purchaseRecords, date, routeId }).then((res: any) => {
        if (res?.data && Array.isArray(res.data)) {
          const localIds = new Set(purchaseRecords.map(r => r.id));
          const backendRecords = res.data.map(toFrontend);
          setRecords(prev => {
            const updated = [...prev.filter(r => !localIds.has(r.id)), ...backendRecords];
            localStorage.setItem('dairy_milk_records', JSON.stringify(updated));
            return updated;
          });
        }
      }).catch(() => {
        purchaseRecords.forEach(r => addToQueue('/milk-records', 'POST', r, 'Set purchase records'));
      });
    } else {
      purchaseRecords.forEach(r => addToQueue('/milk-records', 'POST', r, 'Set purchase records'));
    }
  };

  // ─── setSaleRecordsForDate ─────────────────────────────────────────────────
  const setSaleRecordsForDate = (date: string, saleRecords: MilkRecord[]) => {
    setRecords(prev => {
      const incomingIds = new Set(saleRecords.map(r => r.id));
      const updated = [...prev.filter(r => !incomingIds.has(r.id)), ...saleRecords];
      localStorage.setItem('dairy_milk_records', JSON.stringify(updated));
      return updated;
    });

    _setSaleLedgerForDateLS(date, saleRecords);
    window.dispatchEvent(new CustomEvent('dairy-sale-saved'));

    if (isOnline()) {
      milkRecordsApi.createBulk({ records: saleRecords, date }).then((res: any) => {
        if (res?.data && Array.isArray(res.data)) {
          const localIds = new Set(saleRecords.map(r => r.id));
          const backendRecords = res.data.map(toFrontend);
          setRecords(prev => {
            const updated = [...prev.filter(r => !localIds.has(r.id)), ...backendRecords];
            localStorage.setItem('dairy_milk_records', JSON.stringify(updated));
            return updated;
          });
        }
      }).catch(() => {
        saleRecords.forEach(r => addToQueue('/milk-records', 'POST', r, 'Set sale records'));
      });
    } else {
      saleRecords.forEach(r => addToQueue('/milk-records', 'POST', r, 'Set sale records'));
    }
  };

  // ─── removeRecord ──────────────────────────────────────────────────────────
  const removeRecord = (id: string) => {
    setRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('dairy_milk_records', JSON.stringify(updated));
      return updated;
    });

    const isMongoId = /^[a-f\d]{24}$/i.test(id);
    if (!isMongoId) return;

    if (isOnline()) {
      milkRecordsApi.delete(id).catch(() =>
        addToQueue(`/milk-records/${id}`, 'DELETE', undefined, 'Delete milk record')
      );
    } else {
      addToQueue(`/milk-records/${id}`, 'DELETE', undefined, 'Delete milk record');
    }
  };

  return (
    <MilkTransactionContext.Provider value={{
      records, addRecords, removeRecord,
      setPurchaseRecordsForDate, setSaleRecordsForDate, syncFromBackend
    }}>
      {children}
    </MilkTransactionContext.Provider>
  );
}

export function useMilkTransactionContext() {
  const context = useContext(MilkTransactionContext);
  if (context === undefined) {
    throw new Error('useMilkTransactionContext must be used within a MilkTransactionProvider');
  }
  return context;
}

// ─── localStorage helpers ────────────────────────────────────────────────────

function _updatePurchaseLedgerLS(purchaseRecords: MilkRecord[]) {
  const profilesStr = localStorage.getItem('cheema_saved_suppliers');
  let profiles: any[] = [];
  if (profilesStr) { try { profiles = JSON.parse(profilesStr); } catch(e) {} }

  purchaseRecords.forEach(r => {
    let profile = profiles.find((p: any) => p.supplierName.toLowerCase() === r.partyName.toLowerCase());
    if (!profile) {
      profile = {
        id: 'SUP-' + Math.random().toString(36).substring(2, 9),
        supplierName: r.partyName, phoneNumber: '',
        driverId: 'DIRECT', driverName: 'Direct', location: '', openingBalance: 0
      };
      profiles.push(profile);
    }

    const key = `cheema_purchase_ledger_${r.date}`;
    let entries: any[] = [];
    try { const raw = localStorage.getItem(key); if (raw) entries = JSON.parse(raw); } catch(e) {}
    entries = entries.filter((e: any) => e.id !== r.id);
    entries.push({
      id: r.id, supplierProfileId: profile.id, supplierName: profile.supplierName,
      date: r.date, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      phoneNumber: profile.phoneNumber, milkLiter: r.vol, fat: r.fat, lr: r.lr, snf: r.snf,
      totalTs: r.totalTs, rate: r.rate, totalAmount: r.amount,
      advanceAmount: r.advance || 0, paymentReceived: r.paid || 0, remainingBalance: 0,
      notes: 'Milk Collection Add', isManual: false,
      driverId: profile.driverId, driverName: profile.driverName,
      routeId: r.routeId, routeName: r.routeName
    });
    localStorage.setItem(key, JSON.stringify(entries));
  });
  localStorage.setItem('cheema_saved_suppliers', JSON.stringify(profiles));
}

function _setPurchaseLedgerForDateLS(date: string, purchaseRecords: MilkRecord[], routeId?: string) {
  const key = `cheema_purchase_ledger_${date}`;
  const profilesStr = localStorage.getItem('cheema_saved_suppliers');
  let profiles: any[] = [];
  if (profilesStr) { try { profiles = JSON.parse(profilesStr); } catch(e) {} }

  let existingEntries: any[] = [];
  try { const raw = localStorage.getItem(key); if (raw) existingEntries = JSON.parse(raw); } catch(e) {}

  const manualEntries = existingEntries.filter((e: any) => e.isManual);
  const otherRoutesEntries = routeId === 'all'
    ? []
    : existingEntries.filter((e: any) => !e.isManual && e.routeId !== routeId);

  const newLedgerEntries = purchaseRecords.map(r => {
    let profile = profiles.find((p: any) => p.supplierName.toLowerCase() === r.partyName.toLowerCase());
    if (!profile) {
      profile = {
        id: 'SUP-' + Math.random().toString(36).substring(2, 9),
        supplierName: r.partyName, phoneNumber: '',
        driverId: 'DIRECT', driverName: 'Direct', location: '', openingBalance: 0
      };
      profiles.push(profile);
    }
    return {
      id: r.id, supplierProfileId: profile.id, supplierName: profile.supplierName,
      date: r.date, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      phoneNumber: profile.phoneNumber, milkLiter: r.vol, fat: r.fat, lr: r.lr, snf: r.snf,
      totalTs: r.totalTs, rate: r.rate, totalAmount: r.amount,
      advanceAmount: r.advance || 0, paymentReceived: r.paid || 0, remainingBalance: 0,
      notes: 'Milk Collection Add', isManual: false,
      driverId: profile.driverId, driverName: profile.driverName,
      routeId: r.routeId || (routeId !== 'all' ? routeId : undefined), routeName: r.routeName
    };
  });

  const mergedEntries = [...manualEntries, ...otherRoutesEntries, ...newLedgerEntries];
  const seenIds = new Set<string>();
  const deduped: any[] = [];
  for (let i = mergedEntries.length - 1; i >= 0; i--) {
    if (!seenIds.has(mergedEntries[i].id)) {
      seenIds.add(mergedEntries[i].id);
      deduped.unshift(mergedEntries[i]);
    }
  }

  localStorage.setItem(key, JSON.stringify(deduped));
  localStorage.setItem('cheema_saved_suppliers', JSON.stringify(profiles));
}

function _setSaleLedgerForDateLS(date: string, saleRecords: MilkRecord[]) {
  const key = `cheema_sale_ledger_${date}`;
  const profilesStr = localStorage.getItem('cheema_saved_customers');
  let profiles: any[] = [];
  if (profilesStr) { try { profiles = JSON.parse(profilesStr); } catch(e) {} }

  let existingEntries: any[] = [];
  try { const raw = localStorage.getItem(key); if (raw) existingEntries = JSON.parse(raw); } catch(e) {}

  const incomingIds = new Set(saleRecords.map(r => r.id));
  const otherEntries = existingEntries.filter((e: any) => !incomingIds.has(e.id));

  const newLedgerEntries = saleRecords.map(r => {
    let profile = profiles.find((p: any) => p.customerName.toLowerCase() === r.partyName.toLowerCase());
    if (!profile) {
      profile = {
        id: 'CUST-' + Math.random().toString(36).substring(2, 9),
        customerName: r.partyName, phoneNumber: '',
        driverId: 'DIRECT', driverName: 'Direct', location: '', openingBalance: 0
      };
      profiles.push(profile);
    }
    return {
      id: r.id, customerProfileId: profile.id, customerName: profile.customerName,
      date: r.date, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      phoneNumber: profile.phoneNumber, milkLiter: r.vol,
      fat: r.fat, lr: r.lr, snf: r.snf, tsr: r.tsr, totalTs: r.totalTs,
      rate: r.rate, totalAmount: r.amount,
      advanceAmount: r.advance || 0, paymentReceived: r.paid || 0, remainingBalance: 0,
      notes: r.soldUnit === 'Kg' ? `Milk Sale (Kg) - ${r.soldQtyKg} Kg` : 'Milk Sale (Liters)',
      isManual: false, driverId: profile.driverId, driverName: profile.driverName
    };
  });

  const mergedEntries = [...otherEntries, ...newLedgerEntries];
  const seenIds = new Set<string>();
  const deduped: any[] = [];
  for (let i = mergedEntries.length - 1; i >= 0; i--) {
    if (!seenIds.has(mergedEntries[i].id)) {
      seenIds.add(mergedEntries[i].id);
      deduped.unshift(mergedEntries[i]);
    }
  }

  localStorage.setItem(key, JSON.stringify(deduped));
  localStorage.setItem('cheema_saved_customers', JSON.stringify(profiles));
}
