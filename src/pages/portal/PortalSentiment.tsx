/**
 * PortalSentiment (/portal/insights/sentiment)
 *
 * Client-facing sentiment dashboard showing:
 *   - Rolling sentiment trend chart (Recharts LineChart)
 *   - Key narrative health indicator
 *   - Recent approved media headlines
 */

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { usePortalAccess, usePortalIntel } from '@/hooks/usePortalData';
import { LBDCard, LBDEmptyState } from '@/components/ui/lbd';

export default function PortalSentiment() {
  const { data: access } = usePortalAccess();
  const { data: items, isLoading } = usePortalIntel(access?.engagement_id);

  // Build trend data grouped by date
  const trendData = useMemo(() => {
    if (!items?.length) return [];
    const grouped: Record<string, { sum: number; count: number }> = {};
    for (const item of items) {
      if (item.sentiment_score == null) continue;
      const key = item.date_logged;
      if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };
      grouped[key].sum += Number(item.sentiment_score);
      grouped[key].count += 1;
    }
    return Object.entries(grouped)
      .map(([date, { sum, count }]) => ({
        date,
        sentiment: Number((sum / count).toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [items]);

  // Overall average
  const avgSentiment = trendData.length
    ? Number((trendData.reduce((s, d) => s + d.sentiment, 0) / trendData.length).toFixed(2))
    : null;

  const SentimentIcon = avgSentiment === null
    ? Minus
    : avgSentiment > 0.3
    ? TrendingUp
    : avgSentiment < -0.3
    ? TrendingDown
    : Minus;

  const healthLabel = avgSentiment === null
    ? 'No data'
    : avgSentiment > 0.5
    ? 'Positive'
    : avgSentiment > 0
    ? 'Slightly Positive'
    : avgSentiment > -0.5
    ? 'Neutral / Mixed'
    : 'Negative';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-mono tracking-[0.3em] text-accent mb-1">SENTIMENT</p>
        <h1 className="text-xl font-bold text-foreground">Sentiment Dashboard</h1>
        <p className="text-sm text-muted-foreground">Rolling narrative health analysis.</p>
      </div>

      {/* Health indicator */}
      <LBDCard className="p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <SentimentIcon className="w-6 h-6 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{healthLabel}</p>
          <p className="text-xs text-muted-foreground">
            Average sentiment: {avgSentiment !== null ? avgSentiment : '—'}
          </p>
        </div>
      </LBDCard>

      {/* Trend chart */}
      {trendData.length > 0 ? (
        <LBDCard className="p-5">
          <p className="text-xs font-mono tracking-wider text-muted-foreground mb-4">SENTIMENT TREND</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => format(parseISO(v), 'dd MMM')}
                />
                <YAxis
                  domain={[-2, 2]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sentiment"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </LBDCard>
      ) : (
        <LBDEmptyState
          icon={<TrendingUp className="w-8 h-8" />}
          title="No Sentiment Data"
          description="Approved intelligence data will appear here as your advisory team publishes it."
        />
      )}

      {/* Recent headlines */}
      {items && items.length > 0 && (
        <LBDCard className="p-5">
          <p className="text-xs font-mono tracking-wider text-muted-foreground mb-3">RECENT HEADLINES</p>
          <div className="space-y-2">
            {items.slice(0, 10).map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                  {format(parseISO(item.date_logged), 'dd MMM')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-1">{item.headline}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.source_name ?? 'Unknown source'}</p>
                </div>
              </div>
            ))}
          </div>
        </LBDCard>
      )}
    </div>
  );
}
