/**
 * AnalyticsSidebar
 *
 * Right sidebar for the Media Monitoring Hub showing:
 * 1. Today's average sentiment gauge (circular)
 * 2. Volume by hour area chart
 * 3. Top trending themes tag cloud
 * 4. Urgent alerts panel
 */

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDCard, LBDBadge, LBDSentimentBadge, type SentimentScore } from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import {
  volumeByHour,
  trendingThemes,
  type IntelFeedItem,
} from '@/hooks/useMediaMonitoring';

interface AnalyticsSidebarProps {
  items: IntelFeedItem[];
  onMarkAllReviewed: () => void;
}

/* ── Sentiment gauge SVG ───────────────────── */

function SentimentGauge({ score }: { score: number }) {
  // Normalise -2..+2 → 0..1
  const normalised = (score + 2) / 4;
  const angle = -90 + normalised * 180; // -90 to 90 degrees
  const colour = score > 0.5 ? 'hsl(153,61%,42%)' : score < -0.5 ? 'hsl(4,65%,46%)' : 'hsl(43,52%,54%)';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 120 70" className="w-[160px] h-[90px]">
        {/* Background arc */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="hsl(240,15%,22%)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Coloured arc */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${normalised * 157} 157`}
        />
        {/* Needle */}
        <line
          x1="60"
          y1="60"
          x2={60 + 35 * Math.cos((angle * Math.PI) / 180)}
          y2={60 + 35 * Math.sin((angle * Math.PI) / 180)}
          stroke="hsl(0,0%,100%)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="4" fill="hsl(0,0%,100%)" />
        {/* Score label */}
        <text x="60" y="55" textAnchor="middle" className="text-[11px] font-mono" fill={colour}>
          {score > 0 ? '+' : ''}{score.toFixed(1)}
        </text>
      </svg>
      <span className="text-[10px] text-muted-foreground">Today&apos;s Average Sentiment</span>
    </div>
  );
}

export default function AnalyticsSidebar({ items, onMarkAllReviewed }: AnalyticsSidebarProps) {
  const today = new Date().toISOString().split('T')[0];

  /* Today's sentiment */
  const todaySentiment = useMemo(() => {
    const todayItems = items.filter((i) => i.date_logged === today);
    if (todayItems.length === 0) return 0;
    const sum = todayItems.reduce((s, i) => s + Number(i.sentiment_score ?? 0), 0);
    return sum / todayItems.length;
  }, [items, today]);

  /* Volume by hour */
  const hourlyData = useMemo(() => volumeByHour(items), [items]);

  /* Trending themes */
  const themes = useMemo(() => trendingThemes(items), [items]);

  /* Urgent items */
  const urgentItems = useMemo(
    () => items.filter((i) => i.is_urgent || Number(i.sentiment_score ?? 0) <= -2),
    [items],
  );

  return (
    <div className="space-y-4">
      {/* Sentiment gauge */}
      <LBDCard className="p-4 flex justify-center">
        <SentimentGauge score={todaySentiment} />
      </LBDCard>

      {/* Volume by hour */}
      <LBDCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-semibold text-foreground">Volume by Hour</h3>
        </div>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(43,52%,54%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(43,52%,54%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 9, fill: 'hsl(240,7%,66%)' }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(240,24%,15%)',
                  border: '1px solid hsl(240,15%,22%)',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(43,52%,54%)"
                fill="url(#volumeGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </LBDCard>

      {/* Trending themes */}
      <LBDCard className="p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3">Trending Themes (24h)</h3>
        {themes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No themes detected.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {themes.map(({ theme, count }) => (
              <span
                key={theme}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-[11px] text-foreground"
              >
                {theme}
                <span className="text-[9px] font-mono text-accent">{count}</span>
              </span>
            ))}
          </div>
        )}
      </LBDCard>

      {/* Urgent alerts */}
      <LBDCard className="p-4 border-destructive/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <h3 className="text-xs font-semibold text-foreground">Urgent Alerts</h3>
          </div>
          {urgentItems.length > 0 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={onMarkAllReviewed}>
              Mark all reviewed
            </Button>
          )}
        </div>
        {urgentItems.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No urgent items.</p>
        ) : (
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {urgentItems.slice(0, 10).map((item) => (
              <div key={item.id} className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
                <p className="text-xs text-foreground line-clamp-2">{item.headline}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{item.date_logged}</span>
                  <LBDSentimentBadge
                    score={Math.round(Math.max(-2, Math.min(2, Number(item.sentiment_score ?? 0)))) as SentimentScore}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </LBDCard>
    </div>
  );
}
