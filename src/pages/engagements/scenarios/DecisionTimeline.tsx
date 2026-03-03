/**
 * DecisionTimeline
 *
 * Horizontal scrollable timeline of scenarios plotted by time_horizon_months.
 * Cards coloured by probability; triggered scenarios pulse.
 * Below: Decision Timing Framework table.
 */

import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDDataTable, type ColumnDef } from '@/components/ui/lbd/LBDDataTable';
import {
  type Scenario,
  PROBABILITY_CONFIG,
  STATUS_CONFIG,
} from '@/hooks/useScenarios';

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface DecisionTimelineProps {
  scenarios: Scenario[];
}

/* ─────────────────────────────────────────────
   Decision action row type
───────────────────────────────────────────── */

interface DecisionRow extends Record<string, unknown> {
  id: string;
  action: string;
  scenario_name: string;
  deadline: string;
  status: string;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function DecisionTimeline({ scenarios }: DecisionTimelineProps) {
  /* ── Sort scenarios by time horizon ─────────────────────────── */
  const sorted = useMemo(() =>
    [...scenarios]
      .filter((s) => s.time_horizon_months != null)
      .sort((a, b) => (a.time_horizon_months ?? 0) - (b.time_horizon_months ?? 0)),
    [scenarios],
  );

  const maxHorizon = Math.max(12, ...sorted.map((s) => s.time_horizon_months ?? 0));

  /* ── Build decision rows from trigger events ────────────────── */
  const decisionRows: DecisionRow[] = useMemo(() => {
    const rows: DecisionRow[] = [];
    for (const s of scenarios) {
      if (!s.trigger_events?.length) continue;
      for (const te of s.trigger_events) {
        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + (s.time_horizon_months ?? 6));
        rows.push({
          id: `${s.id}-${te}`,
          action: te,
          scenario_name: s.name,
          deadline: deadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          status: s.status,
        });
      }
    }
    return rows;
  }, [scenarios]);

  const decisionCols: ColumnDef<DecisionRow>[] = useMemo(() => [
    { key: 'action', label: 'DECISION / ACTION', sortable: true },
    { key: 'scenario_name', label: 'LINKED SCENARIO', sortable: true },
    { key: 'deadline', label: 'DEADLINE', sortable: true },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (_v, row) => {
        const conf = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.active;
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border', conf.color)}>
            {conf.label}
          </span>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-8">
      {/* ── Horizontal timeline ──────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
        <h3 className="text-xs font-mono tracking-widest text-muted-foreground mb-4">SCENARIO TIMELINE</h3>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No scenarios with time horizons set.</p>
        ) : (
          <div className="relative min-w-[600px]">
            {/* Axis line */}
            <div className="h-px bg-border absolute top-[60px] left-0 right-0" />

            {/* Month markers */}
            <div className="flex justify-between mb-2 px-2">
              {Array.from({ length: Math.min(maxHorizon + 1, 25) }, (_, i) => i).filter((m) => m % 3 === 0).map((m) => (
                <span
                  key={m}
                  className="text-[10px] font-mono text-muted-foreground/60"
                  style={{ position: 'absolute', left: `${(m / maxHorizon) * 100}%`, top: '68px', transform: 'translateX(-50%)' }}
                >
                  {m}mo
                </span>
              ))}
            </div>

            {/* Scenario cards */}
            <div className="relative h-[56px]">
              {sorted.map((s) => {
                const pct = ((s.time_horizon_months ?? 0) / maxHorizon) * 100;
                const probConf = PROBABILITY_CONFIG[s.probability ?? 'medium'];
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'absolute top-0 transform -translate-x-1/2 max-w-[140px]',
                      'px-2 py-1.5 rounded-md border text-[10px] font-medium truncate cursor-default',
                      probConf.color,
                      s.status === 'triggered' && 'animate-pulse ring-1 ring-red-500/40',
                    )}
                    style={{ left: `${Math.max(5, Math.min(95, pct))}%` }}
                    title={`${s.name} — ${s.time_horizon_months}mo`}
                  >
                    {s.name}
                  </div>
                );
              })}
            </div>

            {/* Spacer for month labels */}
            <div className="h-8" />
          </div>
        )}
      </div>

      {/* ── Decision Timing Framework ────────────────────────────── */}
      <div>
        <h3 className="text-xs font-mono tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <CalendarClock className="w-3.5 h-3.5" />
          DECISION TIMING FRAMEWORK
        </h3>
        <LBDDataTable
          columns={decisionCols}
          data={decisionRows}
          rowKey={(r) => r.id}
          enableSearch
          searchPlaceholder="Search decisions…"
          emptyTitle="No decision actions"
          emptyDescription="Add trigger events to scenarios to populate this framework."
          defaultPageSize={10}
        />
      </div>
    </div>
  );
}
