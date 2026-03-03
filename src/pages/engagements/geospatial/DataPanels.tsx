/**
 * DataPanels
 *
 * Three-column data panels displayed below the geospatial map:
 * 1. Top States by Sentiment — sorted list with colour-coded scores
 * 2. Coverage Gaps — states with no intel in last 30 days
 * 3. Field Reports Summary — weekly report counts by region
 */

import { useMemo } from 'react';
import { AlertTriangle, MapPin, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDCard, LBDBadge } from '@/components/ui/lbd';
import { NIGERIA_STATES, aggregateByState } from '@/hooks/useGeospatial';

interface DataPanelsProps {
  intelItems: Array<{
    narrative_theme: string | null;
    sentiment_score: number | null;
    date_logged: string;
  }>;
}

export default function DataPanels({ intelItems }: DataPanelsProps) {
  /** Aggregate by state */
  const stateData = useMemo(() => aggregateByState(intelItems), [intelItems]);

  /** 1. Top states by sentiment — sorted */
  const topStates = useMemo(() => {
    const entries: Array<{ state: string; avg: number; count: number }> = [];
    stateData.forEach((v, state) => {
      if (v.count > 0) {
        entries.push({ state, avg: v.sentimentSum / v.count, count: v.total });
      }
    });
    return entries.sort((a, b) => b.avg - a.avg);
  }, [stateData]);

  /** 2. Coverage gaps — states with no intel in last 30 days */
  const coverageGaps = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentByState = new Set<string>();

    for (const item of intelItems) {
      if (!item.narrative_theme || !item.date_logged) continue;
      if (new Date(item.date_logged) < thirtyDaysAgo) continue;
      const match = NIGERIA_STATES.find((s) =>
        item.narrative_theme!.toLowerCase().includes(s.toLowerCase()),
      );
      if (match) recentByState.add(match);
    }

    return NIGERIA_STATES.filter((s) => !recentByState.has(s));
  }, [intelItems]);

  /** 3. Field reports this week */
  const weeklyReports = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const counts = new Map<string, number>();

    for (const item of intelItems) {
      if (!item.narrative_theme || !item.date_logged) continue;
      if (new Date(item.date_logged) < weekAgo) continue;
      const match = NIGERIA_STATES.find((s) =>
        item.narrative_theme!.toLowerCase().includes(s.toLowerCase()),
      );
      if (match) counts.set(match, (counts.get(match) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }, [intelItems]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Panel 1: Top States by Sentiment */}
      <LBDCard className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Top States by Sentiment</h3>
        </div>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {topStates.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No sentiment data available.</p>
          ) : (
            topStates.map(({ state, avg, count }) => (
              <div key={state} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ backgroundColor: avg > 0 ? '#27AE60' : avg < 0 ? '#C0392B' : '#A0A0B0' }}
                  />
                  <span className="text-xs text-foreground truncate">{state}</span>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className={cn(
                    'text-xs font-mono',
                    avg > 0 ? 'text-[hsl(var(--success))]' : avg < 0 ? 'text-destructive' : 'text-muted-foreground',
                  )}>
                    {avg > 0 ? '+' : ''}{avg.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">({count})</span>
                </div>
              </div>
            ))
          )}
        </div>
      </LBDCard>

      {/* Panel 2: Coverage Gaps */}
      <LBDCard className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h3 className="text-sm font-semibold text-foreground">Intelligence Blind Spots</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          States with no intel in last 30 days
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-[260px] overflow-y-auto">
          {coverageGaps.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Full coverage — no gaps.</p>
          ) : (
            coverageGaps.map((state) => (
              <LBDBadge key={state} variant="red" size="sm">{state}</LBDBadge>
            ))
          )}
        </div>
      </LBDCard>

      {/* Panel 3: Weekly Field Reports */}
      <LBDCard className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Field Reports This Week</h3>
        </div>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {weeklyReports.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No field reports this week.</p>
          ) : (
            weeklyReports.map(({ state, count }) => (
              <div key={state} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30">
                <span className="text-xs text-foreground">{state}</span>
                <span className="text-xs font-mono text-accent">{count}</span>
              </div>
            ))
          )}
        </div>
      </LBDCard>
    </div>
  );
}
