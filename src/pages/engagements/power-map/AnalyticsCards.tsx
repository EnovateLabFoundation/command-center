/**
 * AnalyticsCards
 *
 * Four KPI cards above the stakeholder registry:
 *   1. Total Stakeholders
 *   2. Alignment Breakdown (mini segmented bar)
 *   3. Average Influence Score
 *   4. Overdue Contacts (last_contact_date > contact_frequency threshold)
 */

import { Users, TrendingUp, AlertTriangle, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  StakeholderRow,
  StakeholderAlignment,
} from '@/hooks/usePowerMap';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

const ALIGNMENT_COLOUR: Record<StakeholderAlignment, string> = {
  champion:   'bg-accent',
  supportive: 'bg-emerald-400',
  neutral:    'bg-border',
  hostile:    'bg-red-500',
};

const ALIGNMENT_TEXT: Record<StakeholderAlignment, string> = {
  champion:   'text-accent',
  supportive: 'text-emerald-400',
  neutral:    'text-muted-foreground',
  hostile:    'text-red-400',
};

const ALIGNMENT_ORDER: StakeholderAlignment[] = ['champion', 'supportive', 'neutral', 'hostile'];

function countOverdue(rows: StakeholderRow[]): number {
  const now = Date.now();
  return rows.filter((r) => {
    if (!r.last_contact_date) return false;
    const last = new Date(r.last_contact_date).getTime();
    const freq = r.contact_frequency?.toLowerCase() ?? '';
    let thresholdDays = 90; // default 3 months
    if (freq.includes('week'))  thresholdDays = 7;
    if (freq.includes('fortni')) thresholdDays = 14;
    if (freq.includes('month'))  thresholdDays = 30;
    if (freq.includes('quarter')) thresholdDays = 90;
    const msThreshold = thresholdDays * 24 * 60 * 60 * 1000;
    return now - last > msThreshold;
  }).length;
}

/* ─────────────────────────────────────────────
   Card shell
───────────────────────────────────────────── */

function Card({
  icon, label, children, accent,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-border/60 bg-card/50 p-4 space-y-3 flex flex-col',
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

interface AnalyticsCardsProps {
  stakeholders: StakeholderRow[];
}

export default function AnalyticsCards({ stakeholders }: AnalyticsCardsProps) {
  const total = stakeholders.length;

  /* Alignment breakdown */
  const alignCounts = ALIGNMENT_ORDER.reduce<Record<StakeholderAlignment, number>>(
    (acc, a) => {
      acc[a] = stakeholders.filter((s) => s.alignment === a).length;
      return acc;
    },
    { champion: 0, supportive: 0, neutral: 0, hostile: 0 },
  );

  /* Average influence */
  const scored   = stakeholders.filter((s) => s.influence_score !== null);
  const avgInfluence = scored.length > 0
    ? (scored.reduce((sum, s) => sum + (s.influence_score ?? 0), 0) / scored.length).toFixed(1)
    : '—';

  /* Overdue contacts */
  const overdueCount = countOverdue(stakeholders);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      {/* 1. Total Stakeholders */}
      <Card
        icon={<Users className="w-3.5 h-3.5 text-accent" />}
        label="Total Stakeholders"
        accent="bg-accent/10"
      >
        <div>
          <span className="text-3xl font-bold text-foreground tabular-nums">{total}</span>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            {total === 0 ? 'None registered yet' : `${scored.length} with influence score`}
          </p>
        </div>
      </Card>

      {/* 2. Alignment Breakdown */}
      <Card
        icon={<BarChart2 className="w-3.5 h-3.5 text-blue-400" />}
        label="Alignment Breakdown"
        accent="bg-blue-500/10"
      >
        <div className="space-y-2">
          {/* Mini segmented bar */}
          {total > 0 ? (
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {ALIGNMENT_ORDER.map((a) => {
                const pct = total > 0 ? (alignCounts[a] / total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={a}
                    className={cn('h-full transition-all', ALIGNMENT_COLOUR[a])}
                    style={{ width: `${pct}%` }}
                    title={`${a}: ${alignCounts[a]}`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-2 rounded-full bg-border/40" />
          )}
          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {ALIGNMENT_ORDER.map((a) => (
              <div key={a} className="flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full flex-none', ALIGNMENT_COLOUR[a])} />
                <span className={cn('text-[10px] font-mono capitalize', ALIGNMENT_TEXT[a])}>
                  {alignCounts[a]} {a}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 3. Average Influence */}
      <Card
        icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
        label="Avg Influence Score"
        accent="bg-emerald-500/10"
      >
        <div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-foreground tabular-nums">{avgInfluence}</span>
            <span className="text-sm text-muted-foreground/50 mb-1">/ 10</span>
          </div>
          {/* Mini bar */}
          {typeof avgInfluence === 'string' && avgInfluence !== '—' && (
            <div className="h-1.5 rounded-full bg-border/40 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400/60 transition-all"
                style={{ width: `${(parseFloat(avgInfluence) / 10) * 100}%` }}
              />
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/50 mt-1">
            {scored.length === 0 ? 'No scores recorded' : `Across ${scored.length} scored`}
          </p>
        </div>
      </Card>

      {/* 4. Overdue Contacts */}
      <Card
        icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
        label="Overdue Contacts"
        accent="bg-amber-500/10"
      >
        <div>
          <span className={cn(
            'text-3xl font-bold tabular-nums',
            overdueCount > 0 ? 'text-amber-400' : 'text-foreground',
          )}>
            {overdueCount}
          </span>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            {overdueCount === 0
              ? 'All contacts up to date'
              : `Past scheduled frequency`}
          </p>
        </div>
      </Card>

    </div>
  );
}
