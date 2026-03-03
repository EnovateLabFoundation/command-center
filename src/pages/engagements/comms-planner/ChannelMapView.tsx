/**
 * ChannelMapView
 *
 * Visual grid: Rows = channels, Columns = weeks of current month.
 * Cells show initiative cards for that channel in that week.
 * Shows "channel saturation" — over-used or under-used channels.
 */

import { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, eachWeekOfInterval,
  format, addMonths, subMonths, isWithinInterval,
  startOfWeek, endOfWeek,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHANNEL_OPTIONS, type Initiative, STATUS_CONFIG } from '@/hooks/useCommsPlanner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/* ─────────────────────────────────────────── */

interface Props {
  data: Initiative[];
  onClickInitiative: (i: Initiative) => void;
}

export default function ChannelMapView({ data, onClickInitiative }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  /** Weeks in current month */
  const weeks = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  }, [currentMonth]);

  /** Channel usage counts for saturation */
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(i => {
      const ch = i.primary_channel ?? 'Other';
      counts[ch] = (counts[ch] ?? 0) + 1;
    });
    return counts;
  }, [data]);

  const maxCount = Math.max(...Object.values(channelCounts), 1);

  /** Get items for channel+week */
  const getItems = (channel: string, weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return data.filter(i => {
      if ((i.primary_channel ?? 'Other') !== channel) return false;
      if (!i.launch_date) return false;
      const d = new Date(i.launch_date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
  };

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

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="text-left p-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/40 w-28">
                Channel
              </th>
              {weeks.map((w, i) => (
                <th key={i} className="p-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-center border-b border-border/40">
                  W{i + 1}<br /><span className="text-[9px]">{format(w, 'dd MMM')}</span>
                </th>
              ))}
              <th className="p-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-center border-b border-border/40 w-20">
                Saturation
              </th>
            </tr>
          </thead>
          <tbody>
            {CHANNEL_OPTIONS.map(channel => {
              const count = channelCounts[channel] ?? 0;
              const satPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <tr key={channel} className="border-b border-border/20 hover:bg-card/60 transition-colors">
                  <td className="p-2 font-medium text-foreground text-xs">{channel}</td>
                  {weeks.map((w, wi) => {
                    const items = getItems(channel, w);
                    return (
                      <td key={wi} className="p-1 align-top min-w-[100px]">
                        <div className="space-y-0.5">
                          {items.map(item => {
                            const cfg = STATUS_CONFIG[item.displayStatus] ?? STATUS_CONFIG['not_started'];
                            return (
                              <TooltipProvider key={item.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => onClickInitiative(item)}
                                      className={cn(
                                        'w-full text-left text-[9px] px-1.5 py-0.5 rounded border truncate',
                                        cfg.color, 'hover:opacity-80 cursor-pointer',
                                      )}
                                    >
                                      {item.policy_area || 'Initiative'}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs font-medium">{item.policy_area}</p>
                                    <p className="text-[10px] text-muted-foreground">{item.key_message?.slice(0, 80)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            satPct > 70 ? 'bg-red-500' : satPct > 40 ? 'bg-amber-500' : 'bg-emerald-500',
                          )}
                          style={{ width: `${satPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground w-4 text-right">{count}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
