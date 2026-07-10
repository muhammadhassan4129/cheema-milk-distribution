import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAccountContext } from './AccountContext';
import { advancesApi, isOnline, isBackendReachable } from '../services/api';
import { addToQueue } from '../services/offlineSync';

export type AdvanceTransactionType = 'ADVANCE' | 'EXPENSE' | 'TRIP_INCOME' | 'CASH_RETURN';

export interface AdvanceTransaction {
  id: string;
  driverId: string; // The ID of the driver
  driverName?: string;
  type: AdvanceTransactionType;
  date: string;
  amount: number;
  category?: 'Fuel' | 'Repair' | 'Toll Plaza' | 'Other' | 'Food' | 'Miscellaneous' | 'Trip Income' | 'Advance Received' | 'Cash Return' | 'Office Return'; // for expenses, income, returns or advances
  description: string;
  createdAt: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Mobile Wallet';
  bankAccount?: string;
  returnedByName?: string;
}

interface AdvanceContextType {
  transactions: AdvanceTransaction[];
  addAdvance: (data: Omit<AdvanceTransaction, 'id' | 'createdAt' | 'type'>) => void;
  addExpense: (data: Omit<AdvanceTransaction, 'id' | 'createdAt' | 'type'>) => void;
  addTransaction: (data: Omit<AdvanceTransaction, 'id' | 'createdAt'>) => void;
  editTransaction: (id: string, data: Partial<AdvanceTransaction>) => void;
  deleteTransaction: (id: string) => void;
  getDriverBalance: (driverId: string, openingBalance?: number) => { totalAdvance: number; totalExpense: number; totalIncome: number; totalReturn: number; balance: number };
  syncFromBackend: () => Promise<void>;
}

const AdvanceContext = createContext<AdvanceContextType | undefined>(undefined);

export function AdvanceProvider({ children }: { children: ReactNode }) {
  const { addAccountRecord } = useAccountContext();

  const [transactions, setTransactions] = useState<AdvanceTransaction[]>(() => {
    // Instantly localStorage se load karo — page switch pe delay nahi hoga
    try {
      const cached = localStorage.getItem('dairy_advances');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  React.useEffect(() => {
    const handleReset = () => setTransactions([]);
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
      const result: any = await advancesApi.getAll();
      if (result.success && Array.isArray(result.data)) {
        // Backend ka data hi final source of truth — empty ho ya full
        const frontendData = result.data.map((t: any) => ({
          id: t._id || t.id,
          driverId: t.driverId?._id || t.driverId,
          driverName: t.driverName || '',
          type: t.type,
          date: t.date,
          amount: t.amount,
          category: t.category,
          description: t.description,
          createdAt: t.createdAt,
          paymentMethod: t.paymentMethod,
          bankAccount: t.bankAccount,
          returnedByName: t.returnedByName,
        }));
        setTransactions(frontendData);
        localStorage.setItem('dairy_advances', JSON.stringify(frontendData));
      }
    } catch (err) {
      // Sirf network error pe cache use karo (backend unreachable)
      try {
        const cached = localStorage.getItem('dairy_advances');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setTransactions(parsed);
        }
      } catch {}
    }
  };

  const addTransaction = (data: Omit<AdvanceTransaction, 'id' | 'createdAt'>) => {
    const newTransaction: AdvanceTransaction = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    setTransactions(prev => {
      const updated = [newTransaction, ...prev];
      localStorage.setItem('dairy_advances', JSON.stringify(updated));
      return updated;
    });

    // Backend sync
    if (isOnline()) {
      advancesApi.create(data).catch(() => {
        addToQueue('/advances', 'POST', data, 'Add advance transaction');
      });
    } else {
      addToQueue('/advances', 'POST', data, 'Add advance transaction');
    }

    // Automatically file to account ledger
    if (data.type === 'ADVANCE') {
      addAccountRecord({
        type: 'Expense',
        category: 'Driver Advance',
        amount: Number(data.amount),
        method: data.paymentMethod || 'Cash',
        payer: 'Company Main',
        payee: data.driverName || `Driver ID: ${data.driverId}`,
        note: `Advance Payment: ${data.description || 'Driver advance given'}${data.bankAccount ? ` (via ${data.bankAccount})` : ''}`,
        date: data.date
      });
    } else if (data.type === 'EXPENSE') {
      // Driver ka actual kharch — yeh real operating expense hai
      addAccountRecord({
        type: 'Expense',
        category: data.category || 'Driver Expense',
        amount: Number(data.amount),
        method: data.paymentMethod || 'Cash',
        payer: data.driverName || `Driver ID: ${data.driverId}`,
        payee: 'Operations',
        note: `Driver Expense: ${data.description || 'Trip expense'}`,
        date: data.date
      });
    } else if (data.type === 'CASH_RETURN') {
      addAccountRecord({
        type: 'Expense',
        category: 'Driver Advance Return',
        amount: -Number(data.amount),
        method: data.paymentMethod || 'Cash',
        payer: data.returnedByName || data.driverName || `Driver ID: ${data.driverId}`,
        payee: 'Company Main',
        note: `Advance Cash Returned: ${data.description || 'Driver returned unused cash'}${data.returnedByName ? ` by ${data.returnedByName}` : ''}${data.bankAccount ? ` (via ${data.bankAccount})` : ''}`,
        date: data.date
      });
    }
  };

  const addAdvance = (data: Omit<AdvanceTransaction, 'id' | 'createdAt' | 'type'>) => {
    addTransaction({
      ...data,
      type: 'ADVANCE',
      category: data.category || 'Advance Received'
    });
  };

  const addExpense = (data: Omit<AdvanceTransaction, 'id' | 'createdAt' | 'type'>) => {
    addTransaction({
      ...data,
      type: 'EXPENSE'
    });
  };

  const editTransaction = (id: string, updatedData: Partial<AdvanceTransaction>) => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updatedData } : t);
      localStorage.setItem('dairy_advances', JSON.stringify(updated));
      return updated;
    });

    if (isOnline()) {
      advancesApi.update(id, updatedData).catch(() => {
        addToQueue(`/advances/${id}`, 'PUT', updatedData, 'Edit advance transaction');
      });
    } else {
      addToQueue(`/advances/${id}`, 'PUT', updatedData, 'Edit advance transaction');
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('dairy_advances', JSON.stringify(updated));
      return updated;
    });

    if (isOnline()) {
      advancesApi.delete(id).catch(() => {
        addToQueue(`/advances/${id}`, 'DELETE', undefined, 'Delete advance transaction');
      });
    } else {
      addToQueue(`/advances/${id}`, 'DELETE', undefined, 'Delete advance transaction');
    }
  };

  const getDriverBalance = (driverId: string, openingBalance = 0) => {
    const driverTx = transactions.filter(t => t.driverId === driverId);
    let totalAdvance = 0;
    let totalExpense = 0;
    let totalIncome = 0;
    let totalReturn = 0;
    
    driverTx.forEach(t => {
      if (t.type === 'ADVANCE') {
        totalAdvance += Number(t.amount);
      } else if (t.type === 'EXPENSE') {
        totalExpense += Number(t.amount);
      } else if (t.type === 'TRIP_INCOME') {
        totalIncome += Number(t.amount);
      } else if (t.type === 'CASH_RETURN') {
        totalReturn += Number(t.amount);
      }
    });

    const balance = Number(openingBalance || 0) + totalAdvance - totalExpense + totalIncome - totalReturn;

    return {
      totalAdvance,
      totalExpense,
      totalIncome,
      totalReturn,
      balance
    };
  };

  return (
    <AdvanceContext.Provider value={{ transactions, addAdvance, addExpense, addTransaction, editTransaction, deleteTransaction, getDriverBalance, syncFromBackend }}>
      {children}
    </AdvanceContext.Provider>
  );
}

export function useAdvanceContext() {
  const context = useContext(AdvanceContext);
  if (context === undefined) {
    throw new Error('useAdvanceContext must be used within an AdvanceProvider');
  }
  return context;
}
