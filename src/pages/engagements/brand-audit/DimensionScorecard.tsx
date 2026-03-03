/**
 * DimensionScorecard
 *
 * Premium 12-dimension scoring interface for the Leadership Brand Audit.
 * Each dimension rendered as a styled card with current/target sliders,
 * auto-calculated gap, evidence and action fields.
 *
 * Gap ≥ 4 → red "PRIORITY REPOSITIONING OBJECTIVE" badge.
 */

import { useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  BRAND_DIMENSIONS,
  type ScoresMap,
  type DimensionScore,
} from '@/hooks/useBrandAudit';

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface DimensionScorecardProps {
  scores: ScoresMap;
  onChange: (scores: ScoresMap) => void;
  readOnly?: boolean;
}

/* ─────────────────────────────────────────────
   Gap colour helper
───────────────────────────────────────────── */

function gapColour(gap: number): string {
  if (gap >= 4) return 'text-red-400';
  if (gap >= 2) return 'text-amber-400';
  return 'text-emerald-400';
}

function gapBg(gap: number): string {
  if (gap >= 4) return 'bg-red-500/10 border-red-500/30';
  if (gap >= 2) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-emerald-500/10 border-emerald-500/30';
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function DimensionScorecard({ scores, onChange, readOnly = false }: DimensionScorecardProps) {
  /** Update a single dimension's field */
  const updateDim = useCallback(
    (dim: string, field: keyof DimensionScore, value: string | number) => {
      const next = { ...scores };
      next[dim] = { ...next[dim], [field]: value };
      onChange(next);
    },
    [scores, onChange],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {BRAND_DIMENSIONS.map((dim) => {
        const s = scores[dim] ?? { current: 5, target: 7, evidence: '', action: '' };
        const gap = s.target - s.current;
        const isPriority = gap >= 4;

        return (
          <div
            key={dim}
            className={cn(
              'rounded-xl border bg-card p-5 space-y-4 transition-all',
              isPriority ? 'border-red-500/40 shadow-[0_0_12px_-4px] shadow-red-500/20' : 'border-border',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">{dim}</h4>
              {isPriority && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  PRIORITY REPOSITIONING
                </span>
              )}
            </div>

            {/* Sliders row */}
            <div className="grid grid-cols-[1fr_1fr_60px] gap-4 items-start">
              {/* Current score */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest text-muted-foreground">CURRENT</span>
                  <span className="text-sm font-bold font-mono text-foreground">{s.current}</span>
                </div>
                <Slider
                  value={[s.current]}
                  onValueChange={([v]) => updateDim(dim, 'current', v)}
                  min={1}
                  max={10}
                  step={1}
                  disabled={readOnly}
                  className="w-full"
                />
              </div>

              {/* Target score */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest text-muted-foreground">TARGET</span>
                  <span className="text-sm font-bold font-mono text-accent">{s.target}</span>
                </div>
                <Slider
                  value={[s.target]}
                  onValueChange={([v]) => updateDim(dim, 'target', v)}
                  min={1}
                  max={10}
                  step={1}
                  disabled={readOnly}
                  className="w-full"
                />
              </div>

              {/* Gap */}
              <div className="text-center pt-1">
                <span className="text-[10px] font-mono tracking-widest text-muted-foreground block">GAP</span>
                <span className={cn('text-lg font-bold font-mono', gapColour(gap))}>
                  {gap > 0 ? `+${gap}` : gap}
                </span>
              </div>
            </div>

            {/* Evidence + Action */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-muted-foreground">EVIDENCE</label>
                <Input
                  value={s.evidence}
                  onChange={(e) => updateDim(dim, 'evidence', e.target.value)}
                  placeholder="Supporting data…"
                  disabled={readOnly}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-muted-foreground">PRIORITY ACTION</label>
                <Input
                  value={s.action}
                  onChange={(e) => updateDim(dim, 'action', e.target.value)}
                  placeholder="Action to close gap…"
                  disabled={readOnly}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
