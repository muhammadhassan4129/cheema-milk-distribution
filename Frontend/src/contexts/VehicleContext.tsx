import React, { createContext, useContext, useState, useEffect } from 'react';
import { vehiclesApi, isOnline, isBackendReachable } from '../services/api';
import { addToQueue } from '../services/offlineSync';

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  name: string;
  driverName: string;  // free text — driver ka naam
  driverId: string;    // MongoDB ObjectId (optional, assign hone pe)
  driverPhone: string;
  imei: string;
  status: 'Available' | 'On Route' | 'Maintenance' | 'Inactive';
  routeInfo?: string;
}

interface VehicleContextType {
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  syncFromBackend: () => Promise<void>;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

const toFrontend = (v: any): Vehicle => ({
  id: v._id || v.id,
  vehicleNumber: v.vehicleNumber,
  name: v.name,
  driverName: v.driverName || v.driverId?.fullName || '',
  driverId: v.driverId?._id || (typeof v.driverId === 'string' ? v.driverId : '') || '',
  driverPhone: v.driverPhone || '',
  imei: v.imei || '',
  status: v.status,
  routeInfo: v.routeInfo || '',
});

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    // Instantly localStorage se load karo — page switch pe delay nahi hoga
    try {
      const cached = localStorage.getItem('dairy_vehicles');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const syncFromBackend = async () => {
    if (!isOnline()) return;
    try {
      const result: any = await vehiclesApi.getAll();
      if (result.success && Array.isArray(result.data)) {
        // Backend ka data hi final source of truth — empty ho ya full
        const frontendData = result.data.map(toFrontend);
        setVehicles(frontendData);
        localStorage.setItem('dairy_vehicles', JSON.stringify(frontendData));
      }
    } catch (err) {
      // Sirf network error pe cache use karo (backend unreachable)
      try {
        const cached = localStorage.getItem('dairy_vehicles');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setVehicles(parsed);
        }
      } catch {}
    }
  };

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

  const addVehicle = (data: Omit<Vehicle, 'id'>) => {
    // driverId — sirf valid MongoDB ObjectId bhejo, baaki null
    const cleanData = {
      ...data,
      driverId: data.driverId && /^[a-f\d]{24}$/i.test(data.driverId) ? data.driverId : null,
      driverName: data.driverName || '',
    };

    const tempId = 'temp-' + Date.now().toString();
    const newVehicle = { ...data, id: tempId };
    setVehicles(prev => {
      const updated = [...prev, newVehicle];
      localStorage.setItem('dairy_vehicles', JSON.stringify(updated));
      return updated;
    });

    if (isOnline()) {
      vehiclesApi.create(cleanData).then((res: any) => {
        if (res.success && res.data?._id) {
          setVehicles(prev => {
            const updated = prev.map(v => v.id === tempId ? toFrontend(res.data) : v);
            localStorage.setItem('dairy_vehicles', JSON.stringify(updated));
            return updated;
          });
        }
      }).catch((err: any) => {
        console.error('[Vehicle] Backend save failed:', err.message);
        // Temp entry hata do — backend pe save nahi hua
        setVehicles(prev => {
          const updated = prev.filter(v => v.id !== tempId);
          localStorage.setItem('dairy_vehicles', JSON.stringify(updated));
          return updated;
        });
        alert(`Vehicle save nahi hua: ${err.message}`);
      });
    } else {
      addToQueue('/vehicles', 'POST', cleanData, 'Add vehicle');
    }
  };

  const updateVehicle = (id: string, data: Partial<Vehicle>) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));

    if (isOnline()) {
      vehiclesApi.update(id, data).catch(() =>
        addToQueue(`/vehicles/${id}`, 'PUT', data, 'Update vehicle')
      );
    } else {
      addToQueue(`/vehicles/${id}`, 'PUT', data, 'Update vehicle');
    }
  };

  const deleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));

    if (isOnline()) {
      vehiclesApi.delete(id).catch(() =>
        addToQueue(`/vehicles/${id}`, 'DELETE', undefined, 'Delete vehicle')
      );
    } else {
      addToQueue(`/vehicles/${id}`, 'DELETE', undefined, 'Delete vehicle');
    }
  };

  return (
    <VehicleContext.Provider value={{ vehicles, addVehicle, updateVehicle, deleteVehicle, syncFromBackend }}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicleContext() {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error('useVehicleContext must be used within a VehicleProvider');
  }
  return context;
}
