import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authApi, setToken, removeToken, isOnline } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dairy_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      // Normalize stale roles from old localStorage
      if (parsed?.role === 'Driver' || parsed?.role === 'Lab Technician') {
        parsed.role = 'MilkTester';
        localStorage.setItem('dairy_user', JSON.stringify(parsed));
      }
      return parsed;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // Page refresh pe — agar token already hai toh dairy-user-login fire karo
  // Taake VehicleContext, AdvanceContext etc. backend se sync kar sakein
  useEffect(() => {
    const token = localStorage.getItem('dairy_token');
    if (token && user) {
      // Short delay — sab contexts mount hone ka wait karo
      const t = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('dairy-user-login'));
      }, 300);
      return () => clearTimeout(t);
    }
  }, []);

  /**
   * Login function
   * Online → backend se verify karo + JWT token lo
   * Offline → localStorage ke users se verify karo (fallback)
   */
  const login = async (username: string, password: string, role: Role) => {
    setLoading(true);

    try {
      if (isOnline()) {
        const result = await authApi.login(username, password) as any;
        const backendUser = result.data.user;
        const token = result.data.token;

        const appUser: User = {
          id: backendUser._id,
          name: backendUser.fullName,
          fullName: backendUser.fullName,
          username: backendUser.username,
          role: backendUser.role as Role,
          preferences: backendUser.preferences,
        };

        // ✅ Role mismatch check: frontend selected role aur backend actual role match karna chahiye
        if (backendUser.role !== role) {
          throw new Error(`Incorrect role selected. This account belongs to the "${backendUser.role === 'MilkTester' ? 'Milk Tester' : backendUser.role}" role.`);
        }

        setUser(appUser);
        setToken(token);
        localStorage.setItem('dairy_user', JSON.stringify(appUser));
        window.dispatchEvent(new CustomEvent('dairy-user-login'));

      } else {
        const isAdminOffline =
          username.toLowerCase() === 'admin' &&
          password === 'password' &&
          role === 'Admin';

        if (!isAdminOffline) {
          throw new Error('Internet connection required to login. Please connect and try again.');
        }

        const offlineUser: User = {
          id: 'offline_admin',
          name: 'System Admin',
          fullName: 'System Admin',
          username: 'admin',
          role: 'Admin',
        };

        setUser(offlineUser);
        localStorage.setItem('dairy_user', JSON.stringify(offlineUser));
        window.dispatchEvent(new CustomEvent('dairy-user-login'));
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isHandlingUnauthorized = false;
    const handleUnauthorized = () => {
      // Recursive loop rokne ke liye — ek baar hi handle karo
      if (isHandlingUnauthorized) return;
      isHandlingUnauthorized = true;
      logout();
      setTimeout(() => { isHandlingUnauthorized = false; }, 2000);
    };
    window.addEventListener('dairy-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('dairy-unauthorized', handleUnauthorized);
  }, []);

  const logout = () => {
    // Backend ko inform karo (fire and forget — error pe bhi local logout karo)
    if (isOnline()) {
      authApi.logout().catch(() => {
        // Ignore karo — logout locally ho jayega
      });
    }

    // Current user ka saara cache clear karo — routes, collections, sab
    const savedUser = localStorage.getItem('dairy_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const uid = parsedUser?.id;
        if (uid) {
          // Route collection cache (user-specific)
          localStorage.removeItem(`cheema_route_collections_${uid}`);
          // Route cache (agar koi ho)
          localStorage.removeItem(`cheema_routes_driver_${uid}`);
        }
      } catch {}
    }

    // Purana generic cache bhi clear karo (legacy)
    localStorage.removeItem('cheema_route_collections');
    // Dashboard cache clear karo taake next login pe fresh data aaye
    localStorage.removeItem('dairy_dashboard_data');

    setUser(null);
    removeToken();
    localStorage.removeItem('dairy_user');
    window.dispatchEvent(new CustomEvent('dairy-reset'));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
