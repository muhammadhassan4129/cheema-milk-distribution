import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Route, RouteStop } from '../types';
import { routesApi, isOnline } from '../services/api';
import { addToQueue } from '../services/offlineSync';
import { useAuth } from './AuthContext';

interface RouteContextType {
  routes: Route[];
  addRoute: (route: Omit<Route, 'id'>) => void;
  updateRoute: (id: string, updatedRoute: Partial<Omit<Route, 'id'>>) => void;
  deleteRoute: (id: string) => void;
  syncFromBackend: () => Promise<void>;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

const toFrontend = (r: any): Route => ({
  id: r._id || r.id,
  name: r.name,
  stops: (r.stops || []).map((s: any) => ({ id: s._id || s.id, name: s.name })),
  length: r.length || '',
  travelTime: r.travelTime || '',
  cost: r.cost || 0,
  isCustom: r.isCustom || false,
  tankerNumber: r.tankerNumber || '',
  mtName: r.mtName || '',
  assignedMilkTesterIds: (r.assignedMilkTesterIds || []).map((t: any) =>
    typeof t === 'object' ? (t._id || t.id) : t
  ),
});

export const RouteProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);

  const syncFromBackend = useCallback(async () => {
    if (!isOnline() || !user) return;

    const isDriver = user.role === 'MilkTester';
    console.log(`[Routes] sync start — user: ${user.username}, role: ${user.role}, isMilkTester: ${isDriver}`);

    try {
      let result: any;
      if (isDriver) {
        result = await routesApi.getMyRoutes();
        console.log('[Routes] called getMyRoutes, got:', result?.data?.length, 'routes');
      } else {
        result = await routesApi.getAll();
        console.log('[Routes] called getAll, got:', result?.data?.length, 'routes');
      }

      if (result?.success && Array.isArray(result.data)) {
        setRoutes(result.data.map(toFrontend));
      } else {
        console.warn('[Routes] unexpected response:', result);
        setRoutes([]);
      }
    } catch (err: any) {
      console.error('[Routes] sync failed:', err?.message || err);
      setRoutes([]);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    // Pehle saari purani routes clear karo
    setRoutes([]);
    // Sab route caches delete karo
    Object.keys(localStorage)
      .filter(k => k.includes('route') || k.includes('Route'))
      .forEach(k => localStorage.removeItem(k));

    if (!user || !isOnline()) return;
    syncFromBackend();
  }, [syncFromBackend]);

  const addRoute = (routeData: Omit<Route, 'id'>) => {
    const tempId = Date.now().toString();
    const newRoute: Route = { ...routeData, id: tempId };
    setRoutes(prev => [...prev, newRoute]);

    if (isOnline()) {
      routesApi.create(routeData).then((res: any) => {
        if (res.success && res.data?._id) {
          const realId = res.data._id;
          setRoutes(prev => prev.map(r => r.id === tempId ? { ...r, id: realId } : r));
          const testerIds = routeData.assignedMilkTesterIds || [];
          if (testerIds.length > 0) {
            routesApi.assignTesters(realId, testerIds).catch(() => {});
          }
        }
      }).catch(() => addToQueue('/routes', 'POST', routeData, 'Add route'));
    } else {
      addToQueue('/routes', 'POST', routeData, 'Add route');
    }
  };

  const updateRoute = (id: string, updatedData: Partial<Omit<Route, 'id'>>) => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));
    if (isOnline()) {
      routesApi.update(id, updatedData).catch(() =>
        addToQueue(`/routes/${id}`, 'PUT', updatedData, 'Update route')
      );
      if (updatedData.assignedMilkTesterIds !== undefined) {
        routesApi.assignTesters(id, updatedData.assignedMilkTesterIds).catch(() => {});
      }
    } else {
      addToQueue(`/routes/${id}`, 'PUT', updatedData, 'Update route');
    }
  };

  const deleteRoute = (id: string) => {
    setRoutes(prev => prev.filter(r => r.id !== id));
    if (isOnline()) {
      routesApi.delete(id).catch(() =>
        addToQueue(`/routes/${id}`, 'DELETE', undefined, 'Delete route')
      );
    } else {
      addToQueue(`/routes/${id}`, 'DELETE', undefined, 'Delete route');
    }
  };

  return (
    <RouteContext.Provider value={{ routes, addRoute, updateRoute, deleteRoute, syncFromBackend }}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRouteContext = () => {
  const context = useContext(RouteContext);
  if (!context) throw new Error('useRouteContext must be used within RouteProvider');
  return context;
};
