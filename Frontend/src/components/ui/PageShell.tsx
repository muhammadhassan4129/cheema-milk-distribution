/**
 * PageShell — standard full-width page wrapper for every screen.
 * No max-width cap — content fills the available space after the sidebar.
 */
import React from 'react';
import { cn } from '../../lib/utils';

interface PageShellProps {
  title:      string;
  subtitle?:  string;
  icon?:      React.ReactNode;
  actions?:   React.ReactNode;
  children:   React.ReactNode;
  className?: string;
}

export function PageShell({ title, subtitle, icon, actions, children, className }: PageShellProps) {
  return (
    <div className={cn('w-full space-y-5 pb-8 animate-fade-in', className)}>
      {/* Page header bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap"> <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0"> <h1 className="text-[1.125rem] font-black tracking-tight text-[var(--text-primary)] leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[0.8125rem] text-[var(--text-muted)] mt-0.5 truncate">{subtitle}</p>
            )}
          </div> </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Page body — children fill all available width */}
      {children}
    </div>
  );
}

export function confirmAction(message: string): boolean {
  return window.confirm(message);
}
