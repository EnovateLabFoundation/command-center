import { cn } from '@/lib/utils';
import { LBDLoadingSkeleton } from './LBDLoadingSkeleton';

type Padding = 'none' | 'sm' | 'md' | 'lg';

export interface LBDCardProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Slot rendered on the right side of the card header */
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Remove the gold top-border accent */
  noBorderAccent?: boolean;
  /** Show loading skeleton */
  loading?: boolean;
  padding?: Padding;
  /** Make the card clickable */
  onClick?: () => void;
  /** Extra role/data attrs */
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  'aria-label'?: string;
}

const paddingMap: Record<Padding, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export function LBDCard({
  children,
  title,
  subtitle,
  action,
  className,
  bodyClassName,
  noBorderAccent = false,
  loading = false,
  padding = 'md',
  onClick,
  role,
  tabIndex,
  onKeyDown,
  'aria-label': ariaLabel,
}: LBDCardProps) {
  if (loading) {
    return <LBDLoadingSkeleton variant="card" className={className} />;
  }

  const hasHeader = !!(title || action);
  const isInteractive = !!onClick;

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border overflow-hidden',
        !noBorderAccent && 'border-t-[2px] border-t-accent',
        isInteractive && [
          'cursor-pointer transition-all duration-200',
          'hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ],
        className,
      )}
      onClick={onClick}
      role={role ?? (isInteractive ? 'button' : undefined)}
      tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
      onKeyDown={onKeyDown ?? (isInteractive ? (e) => e.key === 'Enter' && onClick?.() : undefined)}
      aria-label={ariaLabel}
    >
      {/* Card header */}
      {hasHeader && (
        <div className="flex items-start justify-between px-6 py-4 border-b border-border/50">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm font-semibold text-foreground leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="ml-4 flex-none flex items-center">{action}</div>
          )}
        </div>
      )}

      {/* Card body */}
      <div
        className={cn(
          hasHeader ? 'p-6' : paddingMap[padding],
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
