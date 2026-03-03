/**
 * StatusBoardWidget
 *
 * 4-quadrant status board: Not Started | In Progress | Complete | Overdue.
 * Designed for JPEG export via html2canvas.
 */

import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Initiative } from '@/hooks/useCommsPlanner';

/* ─────────────────────────────────────────── */

interface Props {
  data: Initiative[];
}

const QUADRANTS = [
  { key: 'not_started', label: 'Not Started',  bg: 'bg-muted/40',           border: 'border-border/40',         text: 'text-muted-foreground' },
  { key: 'in_progress', label: 'In Progress',  bg: 'bg-blue-500/5',         border: 'border-blue-500/30',       text: 'text-blue-400' },
  { key: 'complete',    label: 'Complete',      bg: 'bg-emerald-500/5',      border: 'border-emerald-500/30',    text: 'text-emerald-400' },
  { key: 'overdue',     label: 'Overdue',       bg: 'bg-red-500/5',          border: 'border-red-500/30',        text: 'text-red-400' },
] as const;

export default function StatusBoardWidget({ data }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);

  /** Export board as JPEG */
  const handleExport = async () => {
    if (!boardRef.current) return;
    try {
      const canvas = await html2canvas(boardRef.current, {
        backgroundColor: '#0F0F1A',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `comms-status-board-${new Date().toISOString().slice(0, 10)}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          Status Board
        </h4>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export JPEG
        </Button>
      </div>

      <div ref={boardRef} className="grid grid-cols-2 gap-3 p-4 rounded-lg border border-border/40 bg-card/30">
        {QUADRANTS.map(q => {
          const items = data.filter(i => i.displayStatus === q.key);
          return (
            <div key={q.key} className={cn('rounded-lg border p-3 min-h-[120px]', q.bg, q.border)}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-xs font-semibold', q.text)}>{q.label}</span>
                <span className={cn('text-lg font-bold', q.text)}>{items.length}</span>
              </div>
              <div className="space-y-1">
                {items.slice(0, 6).map(item => (
                  <div key={item.id} className="text-[10px] text-foreground/80 truncate">
                    • {item.policy_area || item.key_message || 'Initiative'}
                  </div>
                ))}
                {items.length > 6 && (
                  <div className="text-[9px] text-muted-foreground">+{items.length - 6} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
