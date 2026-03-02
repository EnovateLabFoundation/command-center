import { cn } from '@/lib/utils';

export type ProgressVariant = 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface LBDProgressBarProps {
  value: number;          // 0–max
  max?: number;           // default 100
  label?: string;
  showPercent?: boolean;
  showValue?: boolean;
  variant?: ProgressVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  animated?: boolean;
}

const trackColors: Record<ProgressVariant, string> = {
  gold:    'bg-accent/20',
  success: 'bg-success/20',
  warning: 'bg-warning/20',
  danger:  'bg-destructive/20',
  info:    'bg-blue-900/30',
  neutral: 'bg-muted/30',
};

const fillColors: Record<ProgressVariant, string> = {
  gold:    'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-destructive',
  info:    'bg-blue-500',
  neutral: 'bg-muted-foreground',
};

const labelColors: Record<ProgressVariant, string> = {
  gold:    'text-accent',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger:  'text-red-400',
  info:    'text-blue-400',
  neutral: 'text-muted-foreground',
};

const sizeHeights: Record<string, string> = {
  xs: 'h-0.5',
  sm: 'h-1',
  md: 'h-1.5',
};

export function LBDProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  showValue = false,
  variant = 'gold',
  size = 'sm',
  className,
  animated = false,
}: LBDProgressBarProps) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  const displayPct = Math.round(pct);

  return (
    <div className={cn('w-full', className)}>
      {/* Label row */}
      {(label || showPercent || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs text-muted-foreground truncate pr-2">{label}</span>
          )}
          <span className={cn('text-xs font-mono ml-auto flex-none', labelColors[variant])}>
            {showValue && `${clamped} / ${max}`}
            {showValue && showPercent && ' · '}
            {showPercent && `${displayPct}%`}
          </span>
        </div>
      )}

      {/* Track */}
      <div
        className={cn('w-full rounded-full overflow-hidden', trackColors[variant], sizeHeights[size])}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? `Progress: ${displayPct}%`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            fillColors[variant],
            animated && 'relative overflow-hidden after:absolute after:inset-0 after:bg-white/20 after:animate-pulse',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
