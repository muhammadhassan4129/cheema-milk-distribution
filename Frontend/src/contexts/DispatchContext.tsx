import React, { createContext, useContext, useState, useEffect } from 'react';
import { dispatchesApi, isOnline, isBackendReachable } from '../services/api';
import { addToQueue } from '../services/offlineSync';

export interface RouteCollectionEntry {
  id: string;
  customerName: string;
  time: string;
  milkKg: number | '';
  milkLiter: number | '';
  fat: number | '';
  lr: number | '';
  temp: number | '';
  snf: number | '';
  ts: number | '';
  totalTs: number | '';
}

export interface DestinationEntry {
  id: string;
  addedBy: string;
  date: string;
  time: string;
  liters: number;
  fat: number;
  lr: number;
  otherElements?: string;
  remarks?: string;
}

export interface DispatchRecord {
  id: string;
  date: string;
  time: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone?: string;
  roadName?: string;
  trunkName?: string;
  liters: number;
  destination: string;
  status: 'Pending' | 'On Route' | 'Completed' | 'Returned' | 'Received';
  remarks?: string;
  driverSign?: string;
  kg?: number;
  fat?: number;
  lr?: number;
  ts?: number;
  price?: number;
  transportType?: string;
  kilometers?: number;
  otherElements?: string;
  isSold?: boolean;
  soldDate?: string;
  destinationEntries?: DestinationEntry[];
  entries?: RouteCollectionEntry[];
  receivedEntries?: RouteCollectionEntry[];
}

interface DispatchContextType {
  dispatches: DispatchRecord[];
  addDispatch: (dispatch: Omit<DispatchRecord, 'id'> & { id?: string }) => void;
  updateDispatchStatus: (id: string, status: DispatchRecord['status']) => void;
  deleteDispatch: (id: string) => void;
  addDestinationEntry: (dispatchId: string, entry: Omit<DestinationEntry, 'id'>) => void;
  markDispatchAsSold: (dispatchId: string, isSold: boolean, soldDate?: string) => void;
  receiveDispatch: (dispatchId: string, receivedEntries: RouteCollectionEntry[]) => void;
  syncFromBackend: () => Promise<void>;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

// Backend record ko frontend format mein convert karo
const toFrontend = (d: any): DispatchRecord => ({
  id: d._id || d.id,
  date: d.date,
  time: d.time,
  vehicleNumber: d.vehicleNumber,
  driverName: d.driverName,
  driverPhone: d.driverPhone,
  roadName: d.roadName,
  trunkName: d.trunkName,
  liters: d.liters,
  destination: d.destination,
  status: d.status,
  remarks: d.remarks,
  driverSign: d.driverSign,
  kg: d.kg,
  fat: d.fat,
  lr: d.lr,
  ts: d.ts,
  price: d.price,
  transportType: d.transportType,
  kilometers: d.kilometers,
  otherElements: d.otherElements,
  isSold: d.isSold,
  soldDate: d.soldDate,
  destinationEntries: d.destinationEntries,
  entries: d.entries,
  receivedEntries: d.receivedEntries,
});

export function DispatchProvider({ children }: { children: React.ReactNode }) {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>(() => {
    // Instantly localStorage se load karo — page switch pe delay nahi hoga
    try {
      const cached = localStorage.getItem('dairy_dispatches');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // dairy-reset event
  useEffect(() => {
    const handleReset = () => setDispatches([]);
    window.addEventListener('dairy-reset', handleReset);
    return () => window.removeEventListener('dairy-reset', handleReset);
  }, []);

  // Internet wapas aaye toh backend se fresh data lo
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
      const result: any = await dispatchesApi.getAll();
      if (result.success && Array.isArray(result.data)) {
        // Backend ka data hi final source of truth hai — empty ho ya full
        const frontendData = result.data.map(toFrontend);
        setDispatches(frontendData);
        localStorage.setItem('dairy_dispatches', JSON.stringify(frontendData));
      }
    } catch (err) {
      // Sirf network error pe cache use karo (backend unreachable)
      try {
        const cached = localStorage.getItem('dairy_dispatches');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setDispatches(parsed);
        }
      } catch {}
    }
  };

  const addDispatch = (data: Omit<DispatchRecord, 'id'> & { id?: string }) => {
    const newId = data.id || 'disp-' + Date.now().toString();
    const newDispatch = { ...data, id: newId };

    // LocalStorage mein foran save
    setDispatches(prev => [newDispatch, ...prev]);

    // Backend ko bhi bhejo
    if (isOnline()) {
      dispatchesApi.create(data).catch(() => {
        addToQueue('/dispatches', 'POST', data, 'Add dispatch');
      });
    } else {
      addToQueue('/dispatches', 'POST', data, 'Add dispatch');
    }
  };

  const updateDispatchStatus = (id: string, status: DispatchRecord['status']) => {
    setDispatches(prev => prev.map(d => d.id === id ? { ...d, status } : d));

    if (isOnline()) {
      dispatchesApi.updateStatus(id, status).catch(() => {
        addToQueue(`/dispatches/${id}/status`, 'PATCH', { status }, 'Update dispatch status');
      });
    } else {
      addToQueue(`/dispatches/${id}/status`, 'PATCH', { status }, 'Update dispatch status');
    }
  };

  const deleteDispatch = (id: string) => {
    setDispatches(prev => prev.filter(d => d.id !== id));

    if (isOnline()) {
      dispatchesApi.delete(id).catch(() => {
        addToQueue(`/dispatches/${id}`, 'DELETE', undefined, 'Delete dispatch');
      });
    } else {
      addToQueue(`/dispatches/${id}`, 'DELETE', undefined, 'Delete dispatch');
    }
  };

  const addDestinationEntry = (dispatchId: string, entryData: Omit<DestinationEntry, 'id'>) => {
    setDispatches(prev => prev.map(d => {
      if (d.id === dispatchId) {
        const entries = d.destinationEntries || [];
        const newEntry: DestinationEntry = {
          ...entryData,
          id: 'dest-ent-' + Date.now().toString() + Math.random().toString(36).substring(2, 7)
        };
        return { ...d, destinationEntries: [...entries, newEntry] };
      }
      return d;
    }));

    if (isOnline()) {
      dispatchesApi.addDestinationEntry(dispatchId, entryData).catch(() => {
        addToQueue(`/dispatches/${dispatchId}/destination-entry`, 'POST', entryData, 'Add destination entry');
      });
    } else {
      addToQueue(`/dispatches/${dispatchId}/destination-entry`, 'POST', entryData, 'Add destination entry');
    }
  };

  const markDispatchAsSold = (dispatchId: string, isSold: boolean, soldDate?: string) => {
    setDispatches(prev => prev.map(d => {
      if (d.id === dispatchId) {
        return {
          ...d,
          isSold,
          soldDate: soldDate || new Date().toISOString().split('T')[0],
          status: 'Completed' as const
        };
      }
      return d;
    }));

    const payload = { isSold, soldDate };
    if (isOnline()) {
      dispatchesApi.markSold(dispatchId, payload).catch(() => {
        addToQueue(`/dispatches/${dispatchId}/mark-sold`, 'PATCH', payload, 'Mark dispatch sold');
      });
    } else {
      addToQueue(`/dispatches/${dispatchId}/mark-sold`, 'PATCH', payload, 'Mark dispatch sold');
    }
  };

  const receiveDispatch = (dispatchId: string, receivedEntries: RouteCollectionEntry[]) => {
    setDispatches(prev => prev.map(d => {
      if (d.id === dispatchId) {
        return { ...d, status: 'Received', receivedEntries };
      }
      return d;
    }));

    const payload = { receivedEntries };
    if (isOnline()) {
      dispatchesApi.receive(dispatchId, payload).catch(() => {
        addToQueue(`/dispatches/${dispatchId}/receive`, 'PATCH', payload, 'Receive dispatch');
      });
    } else {
      addToQueue(`/dispatches/${dispatchId}/receive`, 'PATCH', payload, 'Receive dispatch');
    }
  };

  return (
    <DispatchContext.Provider value={{
      dispatches,
      addDispatch,
      updateDispatchStatus,
      deleteDispatch,
      addDestinationEntry,
      markDispatchAsSold,
      receiveDispatch,
      syncFromBackend,
    }}>
      {children}
    </DispatchContext.Provider>
  );
}

export function useDispatchContext() {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    throw new Error('useDispatchContext must be used within a DispatchProvider');
  }
  return context;
}
