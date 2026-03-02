import { cn } from '@/lib/utils';

interface LBDEmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'ghost';
}

interface LBDEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: LBDEmptyStateAction;
  secondaryAction?: LBDEmptyStateAction;
  className?: string;
  compact?: boolean;
}

export function LBDEmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: LBDEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className,
      )}
      aria-label={title}
    >
      {/* Icon wrapper */}
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-card border border-border',
            compact ? 'w-10 h-10 mb-3 text-lg' : 'w-16 h-16 mb-4 text-3xl',
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      {/* Text */}
      <h3
        className={cn(
          'font-semibold text-foreground',
          compact ? 'text-sm' : 'text-base',
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'text-muted-foreground mt-1.5 max-w-xs leading-relaxed',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className={cn('flex items-center gap-3', compact ? 'mt-4' : 'mt-6')}>
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'inline-flex items-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                compact ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2',
                action.variant === 'ghost'
                  ? 'text-muted-foreground hover:text-foreground hover:bg-card border border-border'
                  : 'bg-accent text-accent-foreground hover:bg-accent/90',
              )}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={cn(
                'inline-flex items-center gap-2 rounded-md font-medium transition-colors border border-border text-muted-foreground hover:text-foreground hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                compact ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2',
              )}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
