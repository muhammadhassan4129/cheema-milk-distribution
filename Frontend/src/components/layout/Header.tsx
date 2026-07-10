import React, { useState } from 'react';
import { Bell, Sun, Moon, Monitor, Calendar, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { MobileMenuButton } from './Sidebar';
import { cn } from '../../lib/utils';
import { isOnline } from '../../services/api';

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const online = isOnline();

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const themeOptions = [
    { value: 'light',  icon: Sun,     label: 'Light'  },
    { value: 'dark',   icon: Moon,    label: 'Dark'   },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const;

  return (
    <header className="app-header" role="banner">
      {/* Left: Mobile menu + breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0"> <MobileMenuButton onClick={onMobileMenuToggle} />

        {/* Page context */}
        <div className="hidden sm:flex items-center gap-2"> <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]"> <Calendar className="w-3.5 h-3.5" /> <span>{dateStr}</span> </div> </div> </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 ml-4">
        {/* Online status indicator */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border',
          online
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        )}>
          {online
            ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Online</>
            : <><WifiOff className="w-3 h-3" />Offline</>
          }
        </div>

        {/* Theme Toggle */}
        <div className="hidden sm:flex items-center gap-0.5 bg-[var(--surface-alt)] rounded-xl p-1 border border-[var(--border)]">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              title={label}
              aria-label={`Switch to ${label} mode`}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                theme === value
                  ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            > <Icon className="w-3.5 h-3.5" /> </button>
          ))}
        </div>

        {/* Notifications */}
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-primary)] transition-all border border-transparent hover:border-[var(--border)]"
          aria-label="Notifications"
        > <Bell className="w-4.5 h-4.5" /> <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--surface)]" aria-hidden="true" /> </button>

        {/* User avatar */}
        {user && (
          <div className="flex items-center gap-2 pl-1.5 ml-0.5 border-l border-[var(--border)]"> <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white uppercase shadow-sm">
              {user.name.charAt(0)}
            </div> <div className="hidden md:block leading-none"> <p className="text-xs font-bold text-[var(--text-primary)]">{user.name}</p> <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{user.role === 'MilkTester' ? 'Milk Tester' : user.role}</p> </div> </div>
        )}
      </div> </header>
  );
}
