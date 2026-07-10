import React, { createContext, useContext, useState, useEffect } from 'react';
import { labApi, isOnline, isBackendReachable } from '../services/api';
import { addToQueue } from '../services/offlineSync';

export interface LabReportRecord {
  id: string;
  batchNo: string;
  technician: string;
  supplierName: string;
  quantity: number;
  fat: number;
  snf: number;
  lr: number;
  ts: number;
  totalTs: number;
  pricePerLiter: number;
  totalPayable: number;
  result: string;
  date: string;
  time: string;
}

interface LabContextType {
  labReports: LabReportRecord[];
  addLabReport: (report: Omit<LabReportRecord, 'id' | 'date' | 'time'>) => void;
  deleteLabReport: (id: string) => void;
  syncFromBackend: () => Promise<void>;
}

const LabContext = createContext<LabContextType | undefined>(undefined);

const toFrontend = (r: any): LabReportRecord => ({
  id: r._id || r.id,
  batchNo: r.batchNo,
  technician: r.technician,
  supplierName: r.supplierName,
  quantity: r.quantity,
  fat: r.fat,
  snf: r.snf,
  lr: r.lr,
  ts: r.ts,
  totalTs: r.totalTs,
  pricePerLiter: r.pricePerLiter,
  totalPayable: r.totalPayable,
  result: r.result,
  date: r.date,
  time: r.time,
});

export function LabProvider({ children }: { children: React.ReactNode }) {
  const [labReports, setLabReports] = useState<LabReportRecord[]>(() => {
    // Instantly localStorage se load karo — page switch pe delay nahi hoga
    try {
      const cached = localStorage.getItem('dairy_lab_reports');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  React.useEffect(() => {
    const handleReset = () => setLabReports([]);
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
      const result: any = await labApi.getAll();
      if (result.success && Array.isArray(result.data)) {
        // Backend ka data hi final source of truth — empty ho ya full
        const frontendData = result.data.map(toFrontend);
        setLabReports(frontendData);
        localStorage.setItem('dairy_lab_reports', JSON.stringify(frontendData));
      }
    } catch (err) {
      // Sirf network error pe cache use karo (backend unreachable)
      try {
        const cached = localStorage.getItem('dairy_lab_reports');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setLabReports(parsed);
        }
      } catch {}
    }
  };

  const addLabReport = (report: Omit<LabReportRecord, 'id' | 'date' | 'time'>) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newReport = { ...report, id: `L-${Date.now()}`, date: dateStr, time: timeStr };

    setLabReports(prev => {
      const updated = [newReport, ...prev];
      localStorage.setItem('dairy_lab_reports', JSON.stringify(updated));
      return updated;
    });

    const payload = { ...report, date: dateStr, time: timeStr };
    if (isOnline()) {
      labApi.create(payload).then((res: any) => {
        if (res.success && res.data?._id) {
          setLabReports(prev => prev.map(r =>
            r.id === newReport.id ? { ...r, id: res.data._id } : r
          ));
        }
      }).catch(() => addToQueue('/lab-reports', 'POST', payload, 'Add lab report'));
    } else {
      addToQueue('/lab-reports', 'POST', payload, 'Add lab report');
    }
  };

  const deleteLabReport = (id: string) => {
    setLabReports(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('dairy_lab_reports', JSON.stringify(updated));
      return updated;
    });

    const isMongoId = /^[a-f\d]{24}$/i.test(id);
    if (!isMongoId) return;

    if (isOnline()) {
      labApi.delete(id).catch(() =>
        addToQueue(`/lab-reports/${id}`, 'DELETE', undefined, 'Delete lab report')
      );
    } else {
      addToQueue(`/lab-reports/${id}`, 'DELETE', undefined, 'Delete lab report');
    }
  };

  return (
    <LabContext.Provider value={{ labReports, addLabReport, deleteLabReport, syncFromBackend }}>
      {children}
    </LabContext.Provider>
  );
}

export function useLabContext() {
  const context = useContext(LabContext);
  if (context === undefined) {
    throw new Error('useLabContext must be used within a LabProvider');
  }
  return context;
}
