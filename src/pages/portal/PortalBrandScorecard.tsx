/**
 * PortalBrandScorecard (/portal/insights/brand)
 *
 * Client-facing brand scorecard showing:
 *   - Radar chart of brand dimensions (current vs target)
 *   - Overall score
 *   - Dimension breakdown table
 */

import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Target } from 'lucide-react';
import { usePortalAccess, usePortalBrandAudit } from '@/hooks/usePortalData';
import { LBDCard, LBDEmptyState } from '@/components/ui/lbd';

interface DimensionScore {
  dimension: string;
  current: number;
  target: number;
}

export default function PortalBrandScorecard() {
  const { data: access } = usePortalAccess();
  const { data: audit, isLoading } = usePortalBrandAudit(access?.engagement_id);

  // Parse scores JSONB into chart data
  const dimensions = useMemo((): DimensionScore[] => {
    if (!audit?.scores || typeof audit.scores !== 'object') return [];
    const scores = audit.scores as Record<string, { current?: number; target?: number }>;
    return Object.entries(scores).map(([dim, vals]) => ({
      dimension: dim,
      current: vals?.current ?? 0,
      target: vals?.target ?? 0,
    }));
  }, [audit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <LBDEmptyState
          icon={<Target className="w-8 h-8" />}
          title="No Brand Audit"
          description="Your advisory team has not yet published a brand scorecard for this engagement."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-mono tracking-[0.3em] text-accent mb-1">BRAND</p>
        <h1 className="text-xl font-bold text-foreground">Brand Scorecard</h1>
        <p className="text-sm text-muted-foreground">Current brand dimension scores and targets.</p>
      </div>

      {/* Overall score */}
      <LBDCard className="p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-accent">{audit.overall_score ?? '—'}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Overall Brand Score</p>
          <p className="text-xs text-muted-foreground">
            Target: {audit.target_score ?? '—'}
          </p>
        </div>
      </LBDCard>

      {/* Radar chart */}
      {dimensions.length > 0 && (
        <LBDCard className="p-5">
          <p className="text-xs font-mono tracking-wider text-muted-foreground mb-4">DIMENSION ANALYSIS</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={dimensions}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke="hsl(var(--accent))"
                  fill="hsl(var(--accent))"
                  fillOpacity={0.2}
                />
                <Radar
                  name="Target"
                  dataKey="target"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.1}
                  strokeDasharray="5 5"
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </LBDCard>
      )}

      {/* Dimension table */}
      {dimensions.length > 0 && (
        <LBDCard className="p-5">
          <p className="text-xs font-mono tracking-wider text-muted-foreground mb-3">SCORE BREAKDOWN</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Dimension</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Current</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Target</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Gap</th>
                </tr>
              </thead>
              <tbody>
                {dimensions.map((d) => (
                  <tr key={d.dimension} className="border-b border-border/50 last:border-0">
                    <td className="py-2 text-foreground">{d.dimension}</td>
                    <td className="py-2 text-right text-foreground">{d.current}</td>
                    <td className="py-2 text-right text-muted-foreground">{d.target}</td>
                    <td className={`py-2 text-right ${d.target - d.current > 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {d.target - d.current > 0 ? '-' : ''}{Math.abs(d.target - d.current).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LBDCard>
      )}
    </div>
  );
}
