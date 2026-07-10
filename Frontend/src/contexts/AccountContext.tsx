import React, { createContext, useContext, useState, useEffect } from 'react';
import { accountsApi, isOnline, isBackendReachable } from '../services/api';
import { addToQueue } from '../services/offlineSync';

export interface AccountRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  method: string;
  payer: string;
  payee: string;
  note: string;
  date: string;
  time: string;
  user?: string;
  liters?: number;
  vehicleNumber?: string;
  driverDetails?: string;
}

interface AccountContextType {
  accountRecords: AccountRecord[];
  addAccountRecord: (record: Omit<AccountRecord, 'id' | 'date' | 'time'> & { date?: string; time?: string }) => void;
  deleteAccountRecord: (id: string) => void;
  syncFromBackend: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const toFrontend = (r: any): AccountRecord => ({
  id: r._id || r.id,
  type: r.type,
  category: r.category,
  amount: r.amount,
  method: r.method,
  payer: r.payer,
  payee: r.payee,
  note: r.note,
  date: r.date,
  time: r.time,
  user: r.user,
  liters: r.liters,
  vehicleNumber: r.vehicleNumber,
  driverDetails: r.driverDetails,
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accountRecords, setAccountRecords] = useState<AccountRecord[]>(() => {
    // Instantly localStorage se load karo — page switch pe delay nahi hoga
    try {
      const cached = localStorage.getItem('dairy_account_records');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  React.useEffect(() => {
    const handleReset = () => setAccountRecords([]);
    window.addEventListener('dairy-reset', handleReset);
    return () => window.removeEventListener('dairy-reset', handleReset);
  }, []);

  useEffect(() => {
    const handleOnline = () => syncFromBackend();
    const handleLogin = () => syncFromBackend();
    const handleVisibility = () => syncFromBackend();
    window.addEventListener('online', handleOnline);
    window.addEventListener('dairy-user-login', handleLogin);
    window.addEventListener('dairy-visibility-sync', handleVisibility);
    if (isOnline()) syncFromBackend();

    const pollInterval = setInterval(() => {
      if (isOnline()) syncFromBackend();
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('dairy-user-login', handleLogin);
      window.removeEventListener('dairy-visibility-sync', handleVisibility);
      clearInterval(pollInterval);
    };
  }, []);

  const syncFromBackend = async () => {
    if (!isOnline()) return;
    try {
      const result: any = await accountsApi.getAll();
      if (result.success && Array.isArray(result.data)) {
        // Backend ka data hi final source of truth — empty ho ya full
        const frontendData = result.data.map(toFrontend);
        setAccountRecords(frontendData);
        localStorage.setItem('dairy_account_records', JSON.stringify(frontendData));
      }
    } catch (err) {
      // Sirf network error pe cache use karo (backend unreachable)
      try {
        const cached = localStorage.getItem('dairy_account_records');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setAccountRecords(parsed);
        }
      } catch {}
    }
  };

  const addAccountRecord = (record: Omit<AccountRecord, 'id' | 'date' | 'time'> & { date?: string; time?: string }) => {
    const now = new Date();
    const dateStr = record.date || now.toISOString().split('T')[0];
    const timeStr = record.time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newRecord = { ...record, id: `ACC-${Date.now()}`, date: dateStr, time: timeStr };

    setAccountRecords(prev => {
      const updated = [newRecord, ...prev];
      localStorage.setItem('dairy_account_records', JSON.stringify(updated));
      return updated;
    });

    const payload = { ...record, date: dateStr, time: timeStr };
    if (isOnline()) {
      accountsApi.create(payload).then((res: any) => {
        if (res.success && res.data?._id) {
          setAccountRecords(prev => prev.map(r =>
            r.id === newRecord.id ? { ...r, id: res.data._id } : r
          ));
        }
      }).catch(() => addToQueue('/accounts', 'POST', payload, 'Add account record'));
    } else {
      addToQueue('/accounts', 'POST', payload, 'Add account record');
    }
  };

  const deleteAccountRecord = (id: string) => {
    setAccountRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('dairy_account_records', JSON.stringify(updated));
      return updated;
    });

    if (isOnline()) {
      accountsApi.delete(id).catch(() =>
        addToQueue(`/accounts/${id}`, 'DELETE', undefined, 'Delete account record')
      );
    } else {
      addToQueue(`/accounts/${id}`, 'DELETE', undefined, 'Delete account record');
    }
  };

  return (
    <AccountContext.Provider value={{ accountRecords, addAccountRecord, deleteAccountRecord, syncFromBackend }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}
