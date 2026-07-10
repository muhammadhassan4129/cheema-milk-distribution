import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import Sidebar from './Sidebar';
import Header from './Header';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { authApi, isOnline } from '../../services/api';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

const SIDEBAR_WIDTH     = 260;
const SIDEBAR_WIDTH_MIN = 72;
const COLLAPSED_KEY     = 'sidebar_collapsed';

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user }    = useAuth();
  const location    = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const userStr = localStorage.getItem('dairy_user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.preferences?.sidebarCollapsed !== undefined) {
          return userObj.preferences.sidebarCollapsed;
        }
      }
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        const userStr = localStorage.getItem('dairy_user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          if (userObj.preferences?.sidebarCollapsed !== undefined) {
            setSidebarCollapsed(userObj.preferences.sidebarCollapsed);
          }
        }
      } catch {}
    };
    window.addEventListener('dairy-user-login', handleUserUpdate);
    return () => {
      window.removeEventListener('dairy-user-login', handleUserUpdate);
    };
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev: boolean) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
        
        const userStr = localStorage.getItem('dairy_user');
        if (userStr && isOnline()) {
          const userObj = JSON.parse(userStr);
          if (userObj.id) {
            if (!userObj.preferences) userObj.preferences = {};
            userObj.preferences.sidebarCollapsed = next;
            localStorage.setItem('dairy_user', JSON.stringify(userObj));
            authApi.updatePreferences({ sidebarCollapsed: next }).catch(() => {});
          }
        }
      } catch {}
      return next;
    });
  };

  if (!user) return <Navigate to="/login" replace />;

  const normalizedRole = (() => {
    const r = user.role as string;
    if (r === 'Driver' || r === 'Lab Technician') return 'MilkTester';
    return r;
  })();

  if (!allowedRoles.includes(normalizedRole as Role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-alt)] px-4"> 
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        > 
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4"> 
            <ShieldX className="w-8 h-8 text-red-500" /> 
          </div> 
          <h1 className="text-xl font-black text-[var(--text-primary)] mb-2">Access Denied</h1> 
          <p className="text-sm text-[var(--text-muted)] mb-6">You don't have permission to view this page.</p> 
          <button onClick={() => window.history.back()} className="btn btn-primary gap-2"> 
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button> 
        </motion.div> 
      </div>
    );
  }

  const sidebarW = sidebarCollapsed ? SIDEBAR_WIDTH_MIN : SIDEBAR_WIDTH;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-alt)]">

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : sidebarW }}
      >
        {/* Header */}
        <Header onMobileMenuToggle={() => setMobileMenuOpen((p: boolean) => !p)} />

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          role="main"
          id="main-content"
        > 

          <div className="w-full px-4 sm:px-6 py-5"> 
            <AnimatePresence mode="wait"> 
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="w-full"
              > 
                <Outlet /> 
              </motion.div> 
            </AnimatePresence> 
          </div> 
        </main> 
      </div> 
    </div>
  );
}