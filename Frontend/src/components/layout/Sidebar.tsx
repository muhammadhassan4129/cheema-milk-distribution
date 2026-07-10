import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { Role } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home, Users, Truck, FileText, DollarSign, Activity,
  LogOut, Milk, Database, Droplets, ArrowDownLeft,
  ArrowUpRight, ChevronLeft, ChevronRight, Menu, Navigation
} from 'lucide-react';

// ─── Nav config ──────────────────────────────────────────────────────────────
interface NavItem {
  title:    string;
  href:     string;
  icon:     React.ElementType;
  roles:    Role[];
  section?: string;
}

const navItems: NavItem[] = [
  // Admin
  { section: 'Overview',    title: 'Dashboard',          href: '/admin',                   icon: Home,          roles: ['Admin'] },
  { section: 'Operations',  title: 'Collection Route',   href: '/admin/collections',       icon: Database,      roles: ['Admin'] },
  { section: 'Operations',  title: 'Purchase Details',   href: '/admin/purchase-ledger',   icon: ArrowDownLeft, roles: ['Admin'] },
  { section: 'Operations',  title: 'Sale Details',       href: '/admin/sale-ledger',       icon: ArrowUpRight,  roles: ['Admin'] },
  { section: 'Operations',  title: 'Farmer Purchases',   href: '/admin/farmer-purchases',  icon: Droplets,      roles: ['Admin'] },
  { section: 'Operations',  title: 'Milk Sales',         href: '/admin/sales',             icon: Activity,      roles: ['Admin'] },
  { section: 'Operations',  title: 'Dispatch Record',    href: '/admin/dispatch',          icon: Truck,         roles: ['Admin'] },
  { section: 'Reports',     title: 'Account Report',     href: '/admin/account-reports',   icon: FileText,      roles: ['Admin'] },
  { section: 'Reports',     title: 'Driver Report',      href: '/admin/driver-reports',    icon: FileText,      roles: ['Admin'] },
  { section: 'Reports',     title: 'Lab Reports',        href: '/admin/lab-reports',       icon: FileText,      roles: ['Admin'] },
  { section: 'Reports',     title: 'Profit & Loss',      href: '/admin/pnl',               icon: DollarSign,    roles: ['Admin'] },
  { section: 'Management',  title: 'Route Create',       href: '/admin/routes',            icon: Navigation,    roles: ['Admin'] },
  { section: 'Management',  title: 'Vehicles',           href: '/admin/vehicles',          icon: Truck,         roles: ['Admin'] },
  { section: 'Management',  title: 'User Roles',         href: '/admin/users',             icon: Users,         roles: ['Admin'] },
  { section: 'Management',  title: 'Advances',           href: '/admin/advances',          icon: DollarSign,    roles: ['Admin'] },

  // MilkTester
  { section: 'My Work',     title: 'Route Collection',   href: '/milktester/collections',  icon: Database,      roles: ['MilkTester'] },

  // Accountant
  { section: 'Overview',    title: 'Dashboard',          href: '/accountant',              icon: Home,          roles: ['Accountant'] },
  { section: 'Transactions',title: 'Route Collection',   href: '/accountant/collections',  icon: Database,      roles: ['Accountant'] },
  { section: 'Transactions',title: 'Purchase Milk',      href: '/accountant/farmer-purchases', icon: Droplets,  roles: ['Accountant'] },
  { section: 'Transactions',title: 'Sales Milk',         href: '/accountant/sales',        icon: Activity,      roles: ['Accountant'] },
  { section: 'Transactions',title: 'Dispatch Milk',      href: '/accountant/dispatch',     icon: Truck,         roles: ['Accountant'] },
  { section: 'Ledger',      title: 'Purchase Ledger',    href: '/accountant/purchase-ledger', icon: ArrowDownLeft, roles: ['Accountant'] },
  { section: 'Ledger',      title: 'Sale Ledger',        href: '/accountant/sale-ledger',  icon: ArrowUpRight,  roles: ['Accountant'] },
  { section: 'Finance',     title: 'Driver Advances',    href: '/accountant/advances',     icon: Users,         roles: ['Accountant'] },
  { section: 'Finance',     title: 'Daily Expenses',     href: '/accountant/expense-entry',icon: DollarSign,    roles: ['Accountant'] },
  { section: 'Reports',     title: 'Accounting Report',  href: '/accountant/reports',      icon: FileText,      roles: ['Accountant'] },
  { section: 'Reports',     title: 'Financial Overview', href: '/accountant/financial-overview', icon: Activity, roles: ['Accountant'] },
  { section: 'Management',  title: 'Truck Management',   href: '/accountant/vehicles',     icon: Truck,         roles: ['Accountant'] },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed:        boolean;
  onToggleCollapse: () => void;
  mobileOpen:       boolean;
  onMobileClose:    () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const filteredLinks = navItems.filter(item => item.roles.includes(user.role));

  const sections = filteredLinks.reduce<Record<string, NavItem[]>>((acc, item) => {
    const key = item.section || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // ── Sidebar inner content (shared between mobile & desktop) ──────────────
  const Inner = (
    <div
      className={cn(
        'flex flex-col h-full bg-[#0f172a] overflow-hidden transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex-shrink-0 flex items-center border-b border-slate-800 h-[60px]',
        collapsed ? 'justify-center px-0' : 'px-4 gap-3'
      )}> <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md"> <Milk className="w-4 h-4 text-white" /> </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col overflow-hidden min-w-0"
          > <span className="font-black text-[13px] tracking-tight text-white uppercase leading-none truncate">Cheema Milk</span> <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-0.5 leading-none">Distribution & Collection</span> </motion.div>
        )}
      </div>

      {/* Scrollable nav */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
        aria-label="Main navigation"
      >
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-1">
            {!collapsed && (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-2.5 pt-3 pb-1.5 leading-none">
                {section}
              </p>
            )}
            {items.map(item => {
              const isExact  = ['/admin', '/accountant', '/milktester'].includes(item.href);
              const isActive = isExact
                ? location.pathname === item.href
                : location.pathname.startsWith(item.href);
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={isExact}
                  onClick={onMobileClose}
                  title={collapsed ? item.title : undefined}
                  aria-label={item.title}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 mb-0.5',
                    collapsed ? 'justify-center px-0' : '',
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 font-semibold'
                      : 'text-slate-400 hover:bg-white/6 hover:text-slate-200'
                  )}
                > <item.icon
                    className={cn(
                      'flex-shrink-0 transition-colors',
                      collapsed ? 'w-5 h-5' : 'w-4 h-4',
                      isActive ? 'text-blue-400' : 'text-slate-500'
                    )}
                  />
                  {!collapsed && (
                    <span className="truncate leading-none">{item.title}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: user info + logout + collapse toggle */}
      <div className="flex-shrink-0 border-t border-slate-800 p-2">
        {/* User info */}
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-1"> <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-600/30 border border-blue-500/20 flex items-center justify-center text-[11px] font-black text-blue-300 uppercase flex-shrink-0">
              {user.name.charAt(0)}
            </div> <div className="flex-1 min-w-0"> <p className="text-[12px] font-semibold text-white truncate leading-none">{user.name}</p> <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.role === 'MilkTester' ? 'Milk Tester' : user.role}</p> </div> </div>
        ) : (
          <div
            className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-600/30 border border-blue-500/20 flex items-center justify-center text-[11px] font-black text-blue-300 uppercase mx-auto mb-1"
            title={user.name}
          >
            {user.name.charAt(0)}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 text-[12px] font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-lg transition-all w-full mb-1',
            collapsed ? 'justify-center' : ''
          )}
          title="Sign Out"
          aria-label="Sign Out"
        > <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-full py-1 rounded-lg text-slate-700 hover:text-slate-400 hover:bg-white/5 transition-all"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft  className="w-3.5 h-3.5" />
          }
        </button> </div> </div>
  );

  return (
    <>
      {/* Mobile: overlay backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-[99] bg-black/55 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile: sliding drawer */}
      <motion.div
        initial={false}
        animate={{ x: mobileOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="md:hidden fixed inset-y-0 left-0 z-[100] w-[260px] shadow-2xl"
      > <div className="h-full w-[260px]">{Inner}</div> </motion.div>

      {/* Desktop: fixed sidebar (no flex placeholder needed — main area uses marginLeft) */}
      <div
        className="hidden md:block fixed inset-y-0 left-0 z-[100] shadow-xl"
        style={{
          width:      collapsed ? 72 : 260,
          transition: 'width 300ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {Inner}
      </div> </>
  );
}

// ─── Mobile hamburger — used by Header ───────────────────────────────────────
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-alt)] transition-all"
      aria-label="Open navigation menu"
    > <Menu className="w-5 h-5" /> </button>
  );
}
