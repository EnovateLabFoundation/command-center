/**
 * RiskMatrixView
 *
 * 3×3 probability × impact grid showing scenarios as cards.
 * Export to JPEG via html2canvas.
 * Hovering a card shows key driver + strategic response tooltip.
 */

import { useRef, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type Scenario, STATUS_CONFIG } from '@/hooks/useScenarios';

/* ─────────────────────────────────────────────
   Grid config
───────────────────────────────────────────── */

const PROB_LEVELS = ['high', 'medium', 'low'] as const;   // rows top-down
const IMPACT_LEVELS = ['low', 'medium', 'high'] as const;  // cols left-right

/** Map impact score to bucket */
function impactBucket(score: number | null): 'low' | 'medium' | 'high' {
  const s = score ?? 5;
  if (s <= 3) return 'low';
  if (s <= 6) return 'medium';
  return 'high';
}

/** Background colour for cell */
function cellBg(prob: string, impact: string): string {
  if (prob === 'high' && impact === 'high') return 'bg-red-500/15 border-red-500/30';
  if (
    (prob === 'high' && impact === 'medium') ||
    (prob === 'medium' && impact === 'high')
  ) return 'bg-red-500/8 border-red-500/20';
  if (prob === 'medium' && impact === 'medium') return 'bg-amber-500/12 border-amber-500/30';
  if (
    (prob === 'low' && impact === 'high') ||
    (prob === 'high' && impact === 'low')
  ) return 'bg-amber-500/8 border-amber-500/20';
  if (
    (prob === 'medium' && impact === 'low') ||
    (prob === 'low' && impact === 'medium')
  ) return 'bg-emerald-500/8 border-emerald-500/20';
  return 'bg-emerald-500/12 border-emerald-500/30'; // low/low
}

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface RiskMatrixViewProps {
  scenarios: Scenario[];
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function RiskMatrixView({ scenarios }: RiskMatrixViewProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  /** Group scenarios into grid cells */
  const grid = useMemo(() => {
    const map: Record<string, Scenario[]> = {};
    for (const p of PROB_LEVELS) {
      for (const i of IMPACT_LEVELS) {
        map[`${p}-${i}`] = [];
      }
    }
    for (const s of scenarios) {
      const prob = s.probability ?? 'medium';
      const imp = impactBucket(s.impact_score);
      const key = `${prob}-${imp}`;
      if (map[key]) map[key].push(s);
    }
    return map;
  }, [scenarios]);

  /** Export as JPEG */
  const handleExport = async () => {
    if (!gridRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#111',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = 'risk-matrix.jpg';
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Export button ─────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg',
            'border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors',
            exporting && 'opacity-50 pointer-events-none',
          )}
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Exporting…' : 'Export JPEG'}
        </button>
      </div>

      {/* ── 3×3 grid ─────────────────────────────────────────────── */}
      <div ref={gridRef} className="p-4 rounded-xl border border-border bg-card">
        {/* Header labels */}
        <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2 mb-2">
          <div />
          {IMPACT_LEVELS.map((il) => (
            <div key={il} className="text-center text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              {il} impact
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {PROB_LEVELS.map((prob) => (
          <div key={prob} className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2 mb-2">
            {/* Row label */}
            <div className="flex items-center justify-end pr-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              {prob} prob
            </div>
            {/* Cells */}
            {IMPACT_LEVELS.map((impact) => {
              const cellScenarios = grid[`${prob}-${impact}`] ?? [];
              return (
                <div
                  key={`${prob}-${impact}`}
                  className={cn(
                    'min-h-[100px] rounded-lg border p-2 flex flex-wrap gap-1.5 content-start',
                    cellBg(prob, impact),
                  )}
                >
                  <TooltipProvider>
                    {cellScenarios.map((s) => {
                      const st = STATUS_CONFIG[s.status];
                      return (
                        <Tooltip key={s.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'px-2 py-1 rounded text-[10px] font-medium border cursor-default max-w-full truncate',
                                st.color,
                                s.status === 'triggered' && 'animate-pulse',
                              )}
                            >
                              {s.name}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px] text-xs space-y-1">
                            <p className="font-semibold">{s.name}</p>
                            {s.key_driver && (
                              <p className="text-muted-foreground"><span className="font-medium text-foreground">Driver:</span> {s.key_driver}</p>
                            )}
                            {s.strategic_response && (
                              <p className="text-muted-foreground"><span className="font-medium text-foreground">Response:</span> {s.strategic_response.slice(0, 120)}…</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </TooltipProvider>
                  {cellScenarios.length === 0 && (
                    <span className="text-[10px] text-muted-foreground/30 m-auto">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500/40" /> Existential</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500/40" /> Significant</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500/40" /> Manageable</span>
        </div>
      </div>
    </div>
  );
}
