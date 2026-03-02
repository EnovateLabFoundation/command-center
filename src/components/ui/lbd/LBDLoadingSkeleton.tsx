import { cn } from '@/lib/utils';

interface LBDLoadingSkeletonProps {
  variant?: 'card' | 'table' | 'chart' | 'list' | 'stat';
  rows?: number;
  cols?: number;
  count?: number;
  className?: string;
}

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded bg-white/5', className)}
      aria-hidden="true"
    />
  );
}

export function LBDLoadingSkeleton({
  variant = 'card',
  rows = 5,
  cols = 4,
  count = 3,
  className,
}: LBDLoadingSkeletonProps) {
  /* ─── Card skeleton ─── */
  if (variant === 'card') {
    return (
      <div
        className={cn(
          'bg-card rounded-xl border border-border border-t-2 border-t-accent/30 p-6 space-y-4',
          className,
        )}
        aria-busy="true"
        aria-label="Loading content"
      >
        <div className="flex items-center justify-between">
          <Pulse className="h-4 w-32" />
          <Pulse className="h-7 w-20 rounded-md" />
        </div>
        <div className="space-y-2">
          <Pulse className="h-3 w-full" />
          <Pulse className="h-3 w-5/6" />
          <Pulse className="h-3 w-4/6" />
        </div>
      </div>
    );
  }

  /* ─── Stat card skeleton ─── */
  if (variant === 'stat') {
    return (
      <div
        className={cn(
          'bg-card rounded-xl border border-border border-t-2 border-t-accent/30 p-6',
          className,
        )}
        aria-busy="true"
        aria-label="Loading statistic"
      >
        <Pulse className="h-3 w-24 mb-3" />
        <Pulse className="h-10 w-40 mb-3" />
        <div className="flex items-center gap-2">
          <Pulse className="h-3 w-3 rounded-full" />
          <Pulse className="h-3 w-20" />
        </div>
        <Pulse className="h-14 w-full mt-4 rounded-md" />
      </div>
    );
  }

  /* ─── Table skeleton ─── */
  if (variant === 'table') {
    return (
      <div
        className={cn('overflow-hidden rounded-xl border border-border', className)}
        aria-busy="true"
        aria-label="Loading table"
      >
        {/* Header row */}
        <div className="flex gap-4 px-4 py-3 border-b border-border bg-card/80">
          <Pulse className="h-4 w-4 rounded flex-none" />
          {Array.from({ length: cols }).map((_, i) => (
            <Pulse key={i} className="h-3 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 px-4 py-3.5 border-b border-border/40 items-center"
          >
            <Pulse className="h-4 w-4 rounded flex-none" />
            <Pulse className="h-3 w-28 flex-none" />
            {Array.from({ length: cols - 1 }).map((_, j) => (
              <Pulse key={j} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  /* ─── Chart skeleton ─── */
  if (variant === 'chart') {
    return (
      <div
        className={cn(
          'bg-card rounded-xl border border-border p-6',
          className,
        )}
        aria-busy="true"
        aria-label="Loading chart"
      >
        <Pulse className="h-4 w-36 mb-6" />
        <div className="h-44 flex items-end gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t animate-pulse bg-white/5"
              style={{
                height: `${25 + ((i * 37 + 17) % 75)}%`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Pulse key={i} className="h-2 w-8" />
          ))}
        </div>
      </div>
    );
  }

  /* ─── List skeleton ─── */
  if (variant === 'list') {
    return (
      <div
        className={cn('space-y-2', className)}
        aria-busy="true"
        aria-label="Loading list"
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-card rounded-lg p-4 border border-border"
          >
            <Pulse className="h-9 w-9 rounded-full flex-none" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-3 w-1/3" />
              <Pulse className="h-3 w-2/3" />
            </div>
            <Pulse className="h-6 w-16 rounded-full flex-none" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
