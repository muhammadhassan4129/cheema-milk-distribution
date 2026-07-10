import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RouteCollection, MilkCollectionStop } from '../types';
import { routeCollectionsApi, isOnline } from '../services/api';
import { addToQueue } from '../services/offlineSync';
import { useAuth } from './AuthContext';

interface RouteCollectionContextType {
  collections: RouteCollection[];
  addCollection: (collection: Omit<RouteCollection, 'id'>) => void;
  updateCollection: (id: string, collection: Partial<Omit<RouteCollection, 'id'>>) => void;
  deleteCollection: (id: string) => void;
  submitCollection: (id: string) => void;
  syncFromBackend: () => Promise<void>;
}

const RouteCollectionContext = createContext<RouteCollectionContextType | undefined>(undefined);

const toFrontend = (c: any): RouteCollection => ({
  id: c._id || c.id,
  date: c.date,
  routeName: c.routeName,
  tankerNumber: c.tankerNumber || '',
  mtName: c.mtName || '',
  status: c.status,
  // driverId preserve karo — MilkTester filtering ke liye
  driverId: c.driverId
    ? (typeof c.driverId === 'object' ? (c.driverId._id || c.driverId.id) : c.driverId)
    : undefined,
  stops: (c.stops || []).map((s: any) => ({
    id: s._id || s.id,
    time: s.time,
    locationName: s.locationName,
    milkLiter: s.milkLiter,
    snf: s.snf,
    totalSolids: s.totalSolids,
    ts13: s.ts13,
    fat: s.fat,
    lr: s.lr,
    milkKgs: s.milkKgs,
    temperature: s.temperature,
    price: s.price,
    totalPayable: s.totalPayable,
    organoTest: s.organoTest,
    glucoseTest: s.glucoseTest,
    starchTest: s.starchTest,
    aptTest: s.aptTest,
    abTest: s.abTest,
    remarks: s.remarks,
  })),
  receiving: c.receiving,
});

// Per-user localStorage key — taake ek user ka data dusre ko na dikhe
const getCacheKey = (user?: { id: string; role: string } | null) => {
  if (!user) return 'cheema_route_collections_guest';
  if (user.role === 'Admin') return 'cheema_route_collections_admin';
  return `cheema_route_collections_${user.id}`;
};

export const RouteCollectionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [collections, setCollections] = useState<RouteCollection[]>([]);

  // Jab user badlay — naya cache load karo, purana clear karo
  useEffect(() => {
    setCollections([]); // pehle clear karo
    if (!user) return;

    const cacheKey = getCacheKey(user);
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      try {
        setCollections(JSON.parse(stored));
      } catch {}
    }

    // Backend se fresh data lo
    if (isOnline()) {
      syncFromBackend();
    }
  }, [user?.id]); // sirf user ID change pe trigger

  // Cache save — user-specific key mein
  useEffect(() => {
    if (!user) return;
    const cacheKey = getCacheKey(user);
    localStorage.setItem(cacheKey, JSON.stringify(collections));
  }, [collections, user?.id]);

  useEffect(() => {
    const handleReset = () => setCollections([]);
    window.addEventListener('dairy-reset', handleReset);
    return () => window.removeEventListener('dairy-reset', handleReset);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (user) syncFromBackend();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user?.id]);

  const syncFromBackend = async () => {
    if (!isOnline() || !user) return;
    try {
      // Backend pe MilkTester ke liye automatically driverId filter lagta hai
      const result: any = await routeCollectionsApi.getAll();
      if (result.success && Array.isArray(result.data)) {
        const frontendData = result.data.map(toFrontend);
        setCollections(frontendData);
        localStorage.setItem(getCacheKey(user), JSON.stringify(frontendData));
      }
    } catch (err) {
      // error pe localStorage intact rahega
    }
  };

  const addCollection = (collectionData: Omit<RouteCollection, 'id'>) => {
    // driverId current user ka inject karo — backend filtering ke liye zaroori
    const dataWithDriver = {
      ...collectionData,
      driverId: user?.id,
    };

    const newCollection: RouteCollection = {
      ...dataWithDriver,
      id: Date.now().toString(),
    };
    setCollections(prev => [...prev, newCollection]);

    if (isOnline()) {
      routeCollectionsApi.create(dataWithDriver).then((res: any) => {
        // Backend se real ID le lo aur local state update karo
        if (res?.success && res.data?._id) {
          const realId = res.data._id;
          setCollections(prev =>
            prev.map(c => c.id === newCollection.id ? { ...c, id: realId } : c)
          );
        }
      }).catch(() => {
        addToQueue('/route-collections', 'POST', dataWithDriver, 'Add route collection');
      });
    } else {
      addToQueue('/route-collections', 'POST', dataWithDriver, 'Add route collection');
    }
  };

  const updateCollection = (id: string, updatedData: Partial<Omit<RouteCollection, 'id'>>) => {
    setCollections(prev =>
      prev.map(col => col.id === id ? { ...col, ...updatedData } : col)
    );

    if (isOnline()) {
      routeCollectionsApi.update(id, updatedData).catch(() => {
        addToQueue(`/route-collections/${id}`, 'PUT', updatedData, 'Update route collection');
      });
    } else {
      addToQueue(`/route-collections/${id}`, 'PUT', updatedData, 'Update route collection');
    }
  };

  const submitCollection = (id: string) => {
    setCollections(prev =>
      prev.map(col => col.id === id ? { ...col, status: 'Submitted' as const } : col)
    );

    if (isOnline()) {
      routeCollectionsApi.submit(id).catch(() => {
        addToQueue(`/route-collections/${id}/submit`, 'PATCH', undefined, 'Submit collection');
      });
    } else {
      addToQueue(`/route-collections/${id}/submit`, 'PATCH', undefined, 'Submit collection');
    }
  };

  const deleteCollection = (id: string) => {
    setCollections(prev => prev.filter(col => col.id !== id));

    if (isOnline()) {
      routeCollectionsApi.delete(id).catch(() => {
        addToQueue(`/route-collections/${id}`, 'DELETE', undefined, 'Delete collection');
      });
    } else {
      addToQueue(`/route-collections/${id}`, 'DELETE', undefined, 'Delete collection');
    }
  };

  return (
    <RouteCollectionContext.Provider
      value={{ collections, addCollection, updateCollection, deleteCollection, submitCollection, syncFromBackend }}
    >
      {children}
    </RouteCollectionContext.Provider>
  );
};

export const useRouteCollectionContext = () => {
  const context = useContext(RouteCollectionContext);
  if (context === undefined) {
    throw new Error('useRouteCollectionContext must be used within a RouteCollectionProvider');
  }
  return context;
};
