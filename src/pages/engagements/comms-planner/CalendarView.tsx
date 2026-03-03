/**
 * CalendarView
 *
 * Monthly calendar showing comms_initiatives as coloured cards
 * on their launch date. Colour maps to display status.
 */

import { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  isSameDay, addMonths, subMonths, getDay,
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Initiative, STATUS_CONFIG } from '@/hooks/useCommsPlanner';

/* ─────────────────────────────────────────── */

interface Props {
  data: Initiative[];
  onClickInitiative: (i: Initiative) => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Status → background colour for calendar cards */
const STATUS_BG: Record<string, string> = {
  not_started: 'bg-muted/60 border-border/40',
  in_progress: 'bg-blue-500/10 border-blue-500/30',
  complete:    'bg-emerald-500/10 border-emerald-500/30',
  overdue:     'bg-red-500/10 border-red-500/30',
};

export default function CalendarView({ data, onClickInitiative }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  /** Map date string → initiatives */
  const dateMap = useMemo(() => {
    const map = new Map<string, Initiative[]>();
    data.forEach(i => {
      if (!i.launch_date) return;
      const key = format(new Date(i.launch_date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return map;
  }, [data]);

  /** Leading empty cells for day-of-week alignment (Mon=0) */
  const firstDayOffset = useMemo(() => {
    const d = getDay(days[0]); // 0=Sun
    return d === 0 ? 6 : d - 1;
  }, [days]);

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border/20 rounded-md overflow-hidden">
        {/* Leading empties */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-card/40 min-h-[80px]" />
        ))}

        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const items = dateMap.get(key) ?? [];
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              className={cn(
                'bg-card min-h-[80px] p-1 relative',
                isToday && 'ring-1 ring-accent/50',
              )}
            >
              <span className={cn(
                'text-[10px] font-mono',
                isToday ? 'text-accent font-bold' : 'text-muted-foreground',
              )}>
                {format(day, 'd')}
              </span>

              <div className="mt-1 space-y-0.5">
                {items.slice(0, 3).map(item => (
                  <button
                    key={item.id}
                    onClick={() => onClickInitiative(item)}
                    className={cn(
                      'w-full text-left text-[9px] leading-tight px-1 py-0.5 rounded border truncate',
                      STATUS_BG[item.displayStatus] ?? STATUS_BG['not_started'],
                      'hover:opacity-80 transition-opacity cursor-pointer',
                    )}
                  >
                    {item.policy_area || item.key_message || 'Initiative'}
                  </button>
                ))}
                {items.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{items.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
