import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role } from '../types';
import { usersApi, isOnline, isBackendReachable, syncLogsApi } from '../services/api';
import { addToQueue } from '../services/offlineSync';

export interface User {
  id: string;       // Frontend ID (MongoDB _id after sync, 'local_xxx' before)
  _id?: string;     // Raw MongoDB _id (always present after backend sync)
  fullName: string;
  username: string;
  password?: string;
  phone: string;
  role: Role | string;
  status: 'Active' | 'Inactive';
  cnic?: string;
  openingBalance?: number;
}

interface UserContextType {
  users: User[];
  addUser: (user: Omit<User, 'id'>, onCreated?: (newUser: User) => void) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  syncFromBackend: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Backend response → Frontend User format
const toFrontend = (u: any): User => ({
  id: u._id || u.id,
  _id: u._id,
  fullName: u.fullName,
  username: u.username,
  phone: u.phone || '',
  role: u.role,
  status: u.status,
  cnic: u.cnic || '',
  openingBalance: u.openingBalance || 0,
});

// ID valid MongoDB ObjectId hai ya nahi (24 hex chars)
const isMongoId = (id: string): boolean => /^[a-f\d]{24}$/i.test(id);

// Detailed error log - syncLogs mein errorMessage bhi save karo
const logSyncError = (context: string, error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[UserSync] ✗ ${context}:`, msg);
  // SyncLog localStorage mein store karo
  try {
    const logsRaw = localStorage.getItem('dairy_sync_logs') || '[]';
    const logs: any[] = JSON.parse(logsRaw);
    const logItem = {
      timestamp: new Date().toISOString(),
      model: 'User',
      context,
      status: 'Failed' as const,
      errorMessage: msg,
    };
    logs.unshift(logItem);
    // Max 100 logs rakh
    localStorage.setItem('dairy_sync_logs', JSON.stringify(logs.slice(0, 100)));

    if (isOnline()) {
      syncLogsApi.create(logItem).catch(() => {});
    }
  } catch {}
};

const logSyncSuccess = (context: string) => {
  console.log(`[UserSync] ✓ ${context}`);
  try {
    const logsRaw = localStorage.getItem('dairy_sync_logs') || '[]';
    const logs: any[] = JSON.parse(logsRaw);
    const logItem = {
      timestamp: new Date().toISOString(),
      model: 'User',
      context,
      status: 'Success' as const,
      errorMessage: null,
    };
    logs.unshift(logItem);
    localStorage.setItem('dairy_sync_logs', JSON.stringify(logs.slice(0, 100)));

    if (isOnline()) {
      syncLogsApi.create(logItem).catch(() => {});
    }
  } catch {}
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const cached = localStorage.getItem('dairy_users');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // syncFromBackend ko ref mein rakh — stale closure se bacho
  const syncFromBackendRef = React.useRef<() => Promise<void>>(async () => {});

  const syncFromBackend = React.useCallback(async () => {
    if (!isOnline()) return;
    try {
      const result: any = await usersApi.getAll();
      if (result.success && Array.isArray(result.data)) {
        const backendUsers = result.data.map(toFrontend);
        setUsers(prev => {
          const localOnly = prev.filter(u => u.id.startsWith('local_'));
          const merged = [
            ...backendUsers,
            ...localOnly.filter(lu => !backendUsers.some((bu: User) => bu.username === lu.username)),
          ];
          if (backendUsers.length > 0) {
            try { localStorage.setItem('dairy_users', JSON.stringify(merged)); } catch {}
            return merged;
          }
          try {
            const cached = localStorage.getItem('dairy_users');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
          } catch {}
          return prev;
        });
      }
    } catch (err) {
      try {
        const cached = localStorage.getItem('dairy_users');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setUsers(parsed);
        }
      } catch {}
    }
  }, []);

  React.useEffect(() => {
    syncFromBackendRef.current = syncFromBackend;
  }, [syncFromBackend]);

  useEffect(() => {
    const call = () => syncFromBackendRef.current();
    window.addEventListener('online', call);
    window.addEventListener('dairy-user-login', call);
    window.addEventListener('dairy-visibility-sync', call);
    if (isOnline()) call();

    const pollInterval = setInterval(() => {
      if (isOnline()) call();
    }, 15000);

    return () => {
      window.removeEventListener('online', call);
      window.removeEventListener('dairy-user-login', call);
      window.removeEventListener('dairy-visibility-sync', call);
      clearInterval(pollInterval);
    };
  }, []);

  const addUser = (userData: Omit<User, 'id'>, onCreated?: (newUser: User) => void) => {
    // Agar real MongoDB ID already hai (direct API call ke baad) toh sirf state mein add karo
    const hasRealId = userData._id && isMongoId(userData._id);

    if (hasRealId) {
      // Direct API se already create ho gaya — sirf local state update karo
      const realUser: User = { ...userData, id: userData._id! };
      setUsers(prev => {
        // Duplicate avoid karo
        if (prev.some(u => u.id === realUser.id || u.username === realUser.username)) {
          return prev;
        }
        return [...prev, realUser];
      });
      if (onCreated) onCreated(realUser);
      return;
    }

    // Local temp ID use karo (prefix 'local_' se pata chalega ye backend mein nahi hai)
    const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = { ...userData, id: tempId };
    setUsers(prev => [...prev, newUser]);

    if (isOnline()) {
      usersApi.create(userData)
        .then((res: any) => {
          if (res.success && res.data?._id) {
            const createdUser = toFrontend(res.data);
            setUsers(prev => prev.map(u =>
              u.id === tempId ? createdUser : u
            ));
            logSyncSuccess(`addUser - created "${userData.fullName}"`);
            if (onCreated) onCreated(createdUser);
          }
        })
        .catch((err) => {
          logSyncError(`addUser - "${userData.fullName}"`, err);
          addToQueue('/users', 'POST', userData, `Add user: ${userData.fullName}`);
        });
    } else {
      addToQueue('/users', 'POST', userData, `Add user: ${userData.fullName}`);
    }
  };

  const updateUser = (id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));

    // ⚠️ CastError fix: Sirf valid MongoDB ObjectId pe PUT request bhejo
    if (!isMongoId(id)) {
      console.warn(`[UserSync] updateUser skipped - "${id}" is not a valid MongoDB ObjectId (local record)`);
      // Queue mein daal - jab syncFromBackend real _id de tab retry hoga
      addToQueue(`/users/${id}`, 'PUT', data, `Update user (pending real _id): ${id}`);
      return;
    }

    if (isOnline()) {
      usersApi.update(id, data)
        .then(() => logSyncSuccess(`updateUser - id: ${id}`))
        .catch((err) => {
          logSyncError(`updateUser - id: ${id}`, err);
          addToQueue(`/users/${id}`, 'PUT', data, `Update user: ${id}`);
        });
    } else {
      addToQueue(`/users/${id}`, 'PUT', data, `Update user: ${id}`);
    }
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));

    if (!isMongoId(id)) {
      // Local record tha jo abhi backend mein hai hi nahi - bas localStorage se hatao
      console.warn(`[UserSync] deleteUser skipped - "${id}" is local only`);
      return;
    }

    if (isOnline()) {
      usersApi.delete(id)
        .then(() => logSyncSuccess(`deleteUser - id: ${id}`))
        .catch((err) => {
          logSyncError(`deleteUser - id: ${id}`, err);
          addToQueue(`/users/${id}`, 'DELETE', undefined, `Delete user: ${id}`);
        });
    } else {
      addToQueue(`/users/${id}`, 'DELETE', undefined, `Delete user: ${id}`);
    }
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev =>
      prev.map(u => u.id === id
        ? { ...u, status: u.status === 'Active' ? 'Inactive' as const : 'Active' as const }
        : u
      )
    );

    if (!isMongoId(id)) {
      console.warn(`[UserSync] toggleUserStatus skipped - "${id}" is local only`);
      return;
    }

    if (isOnline()) {
      usersApi.toggleStatus(id)
        .then(() => logSyncSuccess(`toggleUserStatus - id: ${id}`))
        .catch((err) => {
          logSyncError(`toggleUserStatus - id: ${id}`, err);
          addToQueue(`/users/${id}/toggle-status`, 'PATCH', undefined, `Toggle status: ${id}`);
        });
    } else {
      addToQueue(`/users/${id}/toggle-status`, 'PATCH', undefined, `Toggle status: ${id}`);
    }
  };

  return (
    <UserContext.Provider value={{ users, addUser, updateUser, deleteUser, toggleUserStatus, syncFromBackend }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
