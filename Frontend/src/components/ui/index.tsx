/**
 * Cheema Milk — Reusable UI Component Library
 * Enterprise-grade, accessible, animated components
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2, X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// ─── BUTTON ──────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  icon?:     React.ReactNode;
  iconRight?: React.ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:   'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger:    'btn btn-danger',
  ghost:     'btn btn-ghost',
  success:   'btn bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700',
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
);
Button.displayName = 'Button';

// ─── INPUT ───────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  error?:    string;
  hint?:     string;
  prefix?:   React.ReactNode;
  suffix?:   React.ReactNode;
  readOnly?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className, readOnly, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="space-y-1">
        {label && <label htmlFor={inputId} className="form-label">{label}</label>}
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-0 pl-2.5 flex items-center pointer-events-none text-[var(--text-muted)]">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            readOnly={readOnly}
            className={cn(
              'form-input',
              prefix && 'pl-8',
              suffix && 'pr-8',
              readOnly && 'form-input-readonly',
              error && 'error',
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-0 pr-2.5 flex items-center">
              {suffix}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ─── SELECT ──────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="space-y-1">
        {label && <label htmlFor={selectId} className="form-label">{label}</label>}
        <select
          ref={ref}
          id={selectId}
          className={cn('form-input pr-8 appearance-none', error && 'error', className)}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ─── BADGE ───────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'active';
interface BadgeProps { variant?: BadgeVariant; children: React.ReactNode; className?: string; }

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return <span className={cn('badge', `badge-${variant}`, className)}>{children}</span>;
}

// ─── CARD ────────────────────────────────────────────────────────────────────
interface CardProps {
  children:   React.ReactNode;
  className?: string;
  interactive?: boolean;
  padding?:   boolean;
  onClick?:   () => void;
}

export function Card({ children, className, interactive, padding = true, onClick }: CardProps) {
  return (
    <div
      className={cn('card', padding && 'p-5', interactive && 'card-interactive cursor-pointer', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
interface StatCardProps {
  title:       string;
  value:       string | number;
  sub?:        string;
  icon?:       React.ReactNode;
  iconBg?:     string;
  accent?:     string;
  trend?:      'up' | 'down' | 'neutral';
  trendValue?: string;
  className?:  string;
  delay?:      number;
}

export function StatCard({ title, value, sub, icon, iconBg, accent, trend, trendValue, className, delay = 0 }: StatCardProps) {
  return (
    <div
      className={cn('stat-card animate-slide-up', className)}
      style={{
        animationDelay: `${delay}ms`,
        borderTop: accent ? `3px solid ${accent}` : undefined,
      }}
    > <div className="flex items-start justify-between mb-3"> <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
        {icon && (
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', iconBg || 'bg-blue-50 text-blue-600')}>
            {icon}
          </div>
        )}
      </div> <p className="text-2xl font-black font-mono tracking-tight text-[var(--text-primary)] leading-none">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1.5">{sub}</p>}
      {trendValue && (
        <p className={cn('text-xs font-bold mt-2 flex items-center gap-1',
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-[var(--text-muted)]'
        )}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'} {trendValue}
        </p>
      )}
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
interface ModalProps {
  open:        boolean;
  onClose:     () => void;
  title?:      string;
  children:    React.ReactNode;
  footer?:     React.ReactNode;
  size?:       'sm' | 'md' | 'lg' | 'xl';
  className?:  string;
}
const modalSizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md', className }: ModalProps) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}> <div className={cn('modal-panel', modalSizes[size], className)} role="dialog" aria-modal="true">
        {title && (
          <div className="modal-header"> <h2 className="modal-title">{title}</h2> <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-primary)] transition-all"
              aria-label="Close"
            > <X className="w-4 h-4" /> </button> </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div> </div>
  );
}

// ─── ALERT ───────────────────────────────────────────────────────────────────
type AlertType = 'success' | 'error' | 'warning' | 'info';
const alertIcons: Record<AlertType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />,
  error:   <AlertCircle  className="w-4 h-4 flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
  info:    <Info          className="w-4 h-4 flex-shrink-0 mt-0.5" />,
};

interface AlertProps { type?: AlertType; children: React.ReactNode; className?: string; onClose?: () => void; }
export function Alert({ type = 'info', children, className, onClose }: AlertProps) {
  return (
    <div className={cn('alert', `alert-${type}`, className)} role="alert">
      {alertIcons[type]}
      <div className="flex-1 text-sm">{children}</div>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss"> <X className="w-3.5 h-3.5" /> </button>
      )}
    </div>
  );
}

// ─── SKELETON ────────────────────────────────────────────────────────────────
interface SkeletonProps { className?: string; }
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="stat-card"> <div className="flex justify-between mb-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-9 w-9 rounded-xl" /></div> <Skeleton className="h-7 w-36 mb-2" /> <Skeleton className="h-3 w-24" /> </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
interface EmptyStateProps { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; }
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="w-14 h-14 rounded-2xl bg-[var(--surface-alt)] flex items-center justify-center text-[var(--text-muted)] mb-4 text-2xl">{icon}</div>}
      <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ─── SPINNER ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return <Loader2 className={cn(sizes[size], 'animate-spin text-[var(--brand-500)]', className)} />;
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  subtitle?: string;
  className?: string;
}
export function SectionHeader({ title, icon, actions, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}> <div> <h2 className="section-label">{icon}{title}</h2>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ─── DIVIDER ─────────────────────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-[var(--border)]', className)} />;
}
