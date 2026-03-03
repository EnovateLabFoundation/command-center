/**
 * AudienceCoveragePanel
 *
 * Shows which audience segments are covered by active initiatives,
 * cross-referenced with narrative_audience_matrix.
 * Green = covered & in matrix, Amber = in initiatives but not in matrix,
 * Red = in matrix but no active initiative covers it (gap).
 */

import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { type AudienceCoverageItem } from '@/hooks/useCommsPlanner';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────── */

interface Props {
  items: AudienceCoverageItem[];
  loading: boolean;
}

const STATUS_MAP = {
  covered:   { icon: CheckCircle,   label: 'Covered',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  undefined: { icon: AlertTriangle, label: 'Undefined',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30' },
  gap:       { icon: XCircle,       label: 'Gap',        color: 'text-red-400',      bg: 'bg-red-500/10 border-red-500/30' },
};

export default function AudienceCoveragePanel({ items, loading }: Props) {
  if (loading) return <div className="text-xs text-muted-foreground">Loading audience coverage…</div>;
  if (!items.length) return <div className="text-xs text-muted-foreground">No audience data available. Add initiatives with target audiences or define audience segments in the Narrative module.</div>;

  const grouped = {
    covered:   items.filter(i => i.status === 'covered'),
    undefined: items.filter(i => i.status === 'undefined'),
    gap:       items.filter(i => i.status === 'gap'),
  };

  return (
    <div className="space-y-4">
      <h4 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
        Audience Coverage Analysis
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(grouped) as Array<keyof typeof grouped>).map(key => {
          const cfg = STATUS_MAP[key];
          const Icon = cfg.icon;
          const list = grouped[key];
          return (
            <div key={key} className="rounded-lg border border-border/40 bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={cn('h-4 w-4', cfg.color)} />
                <span className="text-xs font-semibold">{cfg.label}</span>
                <Badge variant="outline" className="text-[9px] ml-auto">{list.length}</Badge>
              </div>
              <div className="space-y-1">
                {list.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground">None</span>
                ) : (
                  list.map((item, idx) => (
                    <div key={idx} className={cn('text-[11px] px-2 py-1 rounded border', cfg.bg)}>
                      {item.segment}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
