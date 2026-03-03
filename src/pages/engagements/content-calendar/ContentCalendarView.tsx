/**
 * ContentCalendarView
 *
 * Weekly calendar showing content_items scheduled on each day.
 * Navigation: Prev/Today/Next week. Click item to open detail drawer.
 */

import { useMemo, useState } from 'react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/hooks/useContentCalendar';

/** Status → colour mapping for content badges */
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-primary/20 text-primary',
  scheduled: 'bg-accent/20 text-accent',
  published: 'bg-green-500/20 text-green-400',
  archived: 'bg-muted text-muted-foreground/60',
};

interface Props {
  items: ContentItem[];
  onItemClick: (item: ContentItem) => void;
}

export default function ContentCalendarView({ items, onItemClick }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) }),
    [weekStart],
  );

  /** Group items by day */
  const itemsByDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    items.forEach((item) => {
      if (!item.scheduled_date) return;
      const key = format(startOfDay(new Date(item.scheduled_date)), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <span className="text-sm font-medium text-foreground">
          {format(weekStart, 'dd MMM')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'dd MMM yyyy')}
        </span>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayItems = itemsByDay.get(key) ?? [];
          const today = isToday(day);

          return (
            <div
              key={key}
              className={cn(
                'rounded-lg border border-border bg-card p-2 min-h-[140px] flex flex-col',
                today && 'border-accent/50 ring-1 ring-accent/20',
              )}
            >
              <div className={cn('text-xs font-medium mb-2', today ? 'text-accent' : 'text-muted-foreground')}>
                <span className="block font-mono text-[10px] uppercase tracking-wider">{format(day, 'EEE')}</span>
                <span className="text-sm text-foreground">{format(day, 'd')}</span>
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[200px]">
                {dayItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className={cn(
                      'w-full text-left p-1.5 rounded-md border border-border/50 hover:border-accent/40 transition-colors',
                      'bg-card/80 hover:bg-accent/5 cursor-pointer',
                    )}
                  >
                    <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {item.platform && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {item.platform}
                        </Badge>
                      )}
                      <Badge className={cn('text-[9px] px-1 py-0', STATUS_COLORS[item.status] ?? STATUS_COLORS.draft)}>
                        {item.status}
                      </Badge>
                    </div>
                  </button>
                ))}
                {dayItems.length === 0 && (
                  <div className="flex items-center justify-center h-full opacity-30">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
