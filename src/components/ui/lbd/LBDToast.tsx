/**
 * LBD Toast notification system
 *
 * Usage:
 *   1. Mount <LBDToaster /> once in your app root (e.g. App.tsx)
 *   2. Call toast.success / toast.error / toast.warning / toast.info from anywhere
 *   3. Or import { useToast } for imperative access inside components
 */

import {
  useEffect,
  useRef,
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;    // ms; 0 = persist until dismissed
  createdAt: number;
}

type AddToast = (opts: Omit<ToastItem, 'id' | 'createdAt'>) => string;
type RemoveToast = (id: string) => void;

/* ─────────────────────────────────────────────
   Module-level store (no React context needed for emitting)
───────────────────────────────────────────── */

type Listener = (toasts: ToastItem[]) => void;

let _toasts: ToastItem[] = [];
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((fn) => fn([..._toasts]));
}

function addToast(opts: Omit<ToastItem, 'id' | 'createdAt'>): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  _toasts = [
    ..._toasts,
    { ...opts, id, createdAt: Date.now() },
  ].slice(-6); // cap at 6 visible
  notify();
  return id;
}

function removeToast(id: string) {
  _toasts = _toasts.filter((t) => t.id !== id);
  notify();
}

/* ─────────────────────────────────────────────
   Public toast() API
───────────────────────────────────────────── */

export const toast = Object.assign(
  (title: string, opts?: Partial<Omit<ToastItem, 'id' | 'title' | 'createdAt'>>) =>
    addToast({ type: 'info', duration: 4000, ...opts, title }),
  {
    success: (title: string, message?: string, duration = 4000) =>
      addToast({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration = 6000) =>
      addToast({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration = 5000) =>
      addToast({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration = 4000) =>
      addToast({ type: 'info', title, message, duration }),
    dismiss: (id: string) => removeToast(id),
  },
);

/* ─────────────────────────────────────────────
   useToast hook (for components that need reactive access)
───────────────────────────────────────────── */

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([..._toasts]);

  useEffect(() => {
    _listeners.add(setToasts);
    return () => { _listeners.delete(setToasts); };
  }, []);

  return {
    toasts,
    toast,
    dismiss: removeToast,
  };
}

/* ─────────────────────────────────────────────
   Toast visual config
───────────────────────────────────────────── */

const toastConfig: Record<
  ToastType,
  { Icon: React.ElementType; bar: string; iconColor: string; border: string }
> = {
  success: {
    Icon: CheckCircle2,
    bar: 'bg-success',
    iconColor: 'text-green-400',
    border: 'border-success/20',
  },
  error: {
    Icon: AlertCircle,
    bar: 'bg-destructive',
    iconColor: 'text-red-400',
    border: 'border-destructive/20',
  },
  warning: {
    Icon: AlertTriangle,
    bar: 'bg-warning',
    iconColor: 'text-yellow-400',
    border: 'border-warning/20',
  },
  info: {
    Icon: Info,
    bar: 'bg-blue-500',
    iconColor: 'text-blue-400',
    border: 'border-blue-700/20',
  },
};

/* ─────────────────────────────────────────────
   Single toast card
───────────────────────────────────────────── */

interface ToastCardProps {
  item: ToastItem;
  onDismiss: RemoveToast;
}

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const cfg = toastConfig[item.type];
  const { Icon } = cfg;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss timer with progress bar
  useEffect(() => {
    if (!item.duration) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 1 - elapsed / item.duration);
      setProgress(remaining * 100);
      if (remaining > 0) {
        timerRef.current = setTimeout(tick, 50);
      } else {
        handleDismiss();
      }
    };
    timerRef.current = setTimeout(tick, 50);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.duration]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss(item.id), 250);
  }, [item.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'relative w-80 bg-card border rounded-xl shadow-2xl shadow-black/50 overflow-hidden',
        'transition-all duration-250 ease-out',
        cfg.border,
        visible
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8',
      )}
    >
      {/* Progress bar */}
      {item.duration > 0 && (
        <div
          className={cn('absolute bottom-0 left-0 h-0.5 transition-all duration-75', cfg.bar)}
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      )}

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={cn('flex-none mt-0.5', cfg.iconColor)}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
          {item.message && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.message}</p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="flex-none p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toaster — mount once in app root
───────────────────────────────────────────── */

interface LBDToasterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

const positionClasses: Record<string, string> = {
  'top-right':    'top-4 right-4 items-end',
  'top-left':     'top-4 left-4 items-start',
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-left':  'bottom-4 left-4 items-start',
  'top-center':   'top-4 left-1/2 -translate-x-1/2 items-center',
};

export function LBDToaster({ position = 'top-right' }: LBDToasterProps) {
  const { toasts, dismiss } = useToast();

  return createPortal(
    <div
      className={cn(
        'fixed z-[9999] flex flex-col gap-2 pointer-events-none',
        positionClasses[position],
      )}
      aria-label="Notifications"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastCard item={item} onDismiss={dismiss} />
        </div>
      ))}
    </div>,
    document.body,
  );
}

/* ─────────────────────────────────────────────
   Context version (optional — if you prefer Provider pattern)
───────────────────────────────────────────── */

interface ToastContextValue {
  toast: typeof toast;
  dismiss: RemoveToast;
  add: AddToast;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function LBDToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastContext.Provider value={{ toast, dismiss: removeToast, add: addToast }}>
      {children}
      <LBDToaster />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within LBDToastProvider');
  return ctx;
}
