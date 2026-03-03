/**
 * SentimentBadge
 *
 * Displays a sentiment score (-2 to +2) as a coloured badge with label.
 * Optionally shows the numeric score.
 */

import { cn } from '@/lib/utils';
import { sentimentLabel } from '@/hooks/useIntelTracker';

interface SentimentBadgeProps {
  score:       number | null;
  showScore?:  boolean;
  size?:       'sm' | 'md';
  className?:  string;
}

function scoreToStyle(score: number | null): string {
  if (score === null) return 'bg-muted/20 text-muted-foreground/60 border-border/40';
  if (score >= 1.0)  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (score >= 0.3)  return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (score >= -0.5) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (score >= -1.0) return 'bg-red-500/15 text-red-400 border-red-500/30';
  return 'bg-red-900/20 text-red-300 border-red-600/40';
}

function scoreToDot(score: number | null): string {
  if (score === null) return 'bg-muted-foreground/40';
  if (score >= 0.3)  return 'bg-emerald-400';
  if (score >= -0.5) return 'bg-amber-400';
  return 'bg-red-400';
}

export default function SentimentBadge({
  score, showScore = false, size = 'sm', className,
}: SentimentBadgeProps) {
  const label = sentimentLabel(score);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-mono',
        size === 'sm'
          ? 'px-1.5 py-0.5 text-[10px]'
          : 'px-2 py-1 text-xs',
        scoreToStyle(score),
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-none', scoreToDot(score))} />
      {label}
      {showScore && score !== null && (
        <span className="opacity-70 tabular-nums">
          ({score > 0 ? '+' : ''}{score.toFixed(1)})
        </span>
      )}
    </span>
  );
}

/** Inline score pill — just the number with colour */
export function SentimentScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground/30 text-xs font-mono">—</span>;
  return (
    <span className={cn(
      'text-xs font-mono tabular-nums font-bold',
      score >= 0.3  ? 'text-emerald-400' :
      score >= -0.5 ? 'text-amber-400'   :
                      'text-red-400',
    )}>
      {score > 0 ? '+' : ''}{score.toFixed(1)}
    </span>
  );
}
