/**
 * KPIStrip
 *
 * Four KPI cards for the Intel Tracker:
 *  1. Total Items Logged
 *  2. Average Sentiment Score (colour-coded)
 *  3. Open Action Items
 *  4. Escalated Items (red badge if > 0)
 */

import { FileText, TrendingUp, ListTodo, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelItem } from '@/hooks/useIntelTracker';
import { sentimentColour } from '@/hooks/useIntelTracker';

/* ─────────────────────────────────────────────
   Card shell
───────────────────────────────────────────── */

function KPICard({
  icon, label, children, accent,
}: {
  icon: React.ReactNode; label: string;
  children: React.ReactNode; accent?: string;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-border/60 bg-card/50 p-4 flex flex-col gap-3',
      'hover:border-border/80 transition-colors',
    )}>
      <div className="flex items-center gap-2">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-none', accent ?? 'bg-muted/30')}>
          {icon}
        </div>
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

interface KPIStripProps {
  items: IntelItem[];
}

export default function KPIStrip({ items }: KPIStripProps) {
  const total = items.length;

  // Average sentiment
  const scored = items.filter((i) => i.sentiment_score !== null);
  const avgSentiment = scored.length > 0
    ? scored.reduce((s, i) => s + (i.sentiment_score ?? 0), 0) / scored.length
    : null;
  const sentColour = sentimentColour(avgSentiment);
  const avgDisplay = avgSentiment !== null
    ? `${avgSentiment > 0 ? '+' : ''}${avgSentiment.toFixed(2)}`
    : '—';

  // Open action items
  const openActions = items.filter(
    (i) => i.action_required && i.action_status !== 'done' && i.action_status !== 'monitor_only',
  ).length;

  // Escalated
  const escalated = items.filter((i) => i.is_escalated).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      {/* Total Items */}
      <KPICard
        icon={<FileText className="w-3.5 h-3.5 text-accent" />}
        label="Total Items Logged"
        accent="bg-accent/10"
      >
        <div>
          <span className="text-3xl font-bold text-foreground tabular-nums">{total}</span>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            {scored.length} with sentiment scored
          </p>
        </div>
      </KPICard>

      {/* Average Sentiment */}
      <KPICard
        icon={<TrendingUp className={cn(
          'w-3.5 h-3.5',
          sentColour === 'green' ? 'text-emerald-400' :
          sentColour === 'red'   ? 'text-red-400'     : 'text-amber-400',
        )} />}
        label="Avg Sentiment Score"
        accent={
          sentColour === 'green' ? 'bg-emerald-500/10' :
          sentColour === 'red'   ? 'bg-red-500/10'     : 'bg-amber-500/10'
        }
      >
        <div>
          <span className={cn(
            'text-3xl font-bold tabular-nums',
            sentColour === 'green' ? 'text-emerald-400' :
            sentColour === 'red'   ? 'text-red-400'     : 'text-amber-400',
          )}>
            {avgDisplay}
          </span>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            Range: −2 (negative) to +2 (positive)
          </p>
          {avgSentiment !== null && (
            <div className="h-1.5 rounded-full bg-border/40 mt-2 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  sentColour === 'green' ? 'bg-emerald-400/60' :
                  sentColour === 'red'   ? 'bg-red-400/60'     : 'bg-amber-400/60',
                )}
                style={{ width: `${((avgSentiment + 2) / 4) * 100}%` }}
              />
            </div>
          )}
        </div>
      </KPICard>

      {/* Open Actions */}
      <KPICard
        icon={<ListTodo className="w-3.5 h-3.5 text-blue-400" />}
        label="Open Action Items"
        accent="bg-blue-500/10"
      >
        <div>
          <span className={cn(
            'text-3xl font-bold tabular-nums',
            openActions > 0 ? 'text-blue-400' : 'text-foreground',
          )}>
            {openActions}
          </span>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            {items.filter((i) => i.action_status === 'done').length} resolved
          </p>
        </div>
      </KPICard>

      {/* Escalated */}
      <KPICard
        icon={<AlertOctagon className={cn('w-3.5 h-3.5', escalated > 0 ? 'text-red-400' : 'text-muted-foreground/50')} />}
        label="Escalated Items"
        accent={escalated > 0 ? 'bg-red-500/10' : 'bg-muted/20'}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className={cn(
              'text-3xl font-bold tabular-nums',
              escalated > 0 ? 'text-red-400' : 'text-foreground',
            )}>
              {escalated}
            </span>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {items.filter((i) => i.is_urgent && !i.is_escalated).length} flagged urgent
            </p>
          </div>
          {escalated > 0 && (
            <span className="flex-none mt-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold font-mono">
              {escalated}
            </span>
          )}
        </div>
      </KPICard>

    </div>
  );
}
