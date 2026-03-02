import { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'warning' | 'danger' | 'success';

interface LBDAlertProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const alertConfig: Record<
  AlertVariant,
  {
    bg: string;
    border: string;
    titleColor: string;
    msgColor: string;
    iconColor: string;
    Icon: React.ElementType;
  }
> = {
  info: {
    bg: 'bg-blue-950/30',
    border: 'border-blue-700/40',
    titleColor: 'text-blue-300',
    msgColor: 'text-blue-200/70',
    iconColor: 'text-blue-400',
    Icon: Info,
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    titleColor: 'text-yellow-300',
    msgColor: 'text-yellow-200/70',
    iconColor: 'text-yellow-400',
    Icon: AlertTriangle,
  },
  danger: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    titleColor: 'text-red-300',
    msgColor: 'text-red-200/70',
    iconColor: 'text-red-400',
    Icon: AlertCircle,
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/30',
    titleColor: 'text-green-300',
    msgColor: 'text-green-200/70',
    iconColor: 'text-green-400',
    Icon: CheckCircle2,
  },
};

export function LBDAlert({
  variant,
  title,
  message,
  dismissible = false,
  onDismiss,
  icon,
  action,
  className,
  compact = false,
}: LBDAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const cfg = alertConfig[variant];
  const { Icon } = cfg;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex gap-3 rounded-lg border',
        cfg.bg,
        cfg.border,
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
        className,
      )}
    >
      {/* Icon */}
      <div className={cn('flex-none mt-0.5', cfg.iconColor)}>
        {icon ?? <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden="true" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn('font-semibold leading-snug', cfg.titleColor, compact ? 'text-xs' : 'text-sm')}>
            {title}
          </p>
        )}
        <p className={cn('leading-relaxed', cfg.msgColor, compact ? 'text-xs mt-0' : 'text-sm', title && 'mt-0.5')}>
          {message}
        </p>
        {action && <div className="mt-2">{action}</div>}
      </div>

      {/* Dismiss */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className={cn(
            'flex-none self-start rounded p-0.5 transition-colors',
            cfg.iconColor,
            'hover:bg-white/10',
          )}
          aria-label="Dismiss alert"
        >
          <X className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
