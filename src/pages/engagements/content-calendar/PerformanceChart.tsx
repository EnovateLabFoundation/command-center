/**
 * PerformanceChart
 *
 * Aggregate engagement metrics BarChart for published content items.
 * Shows likes, comments, shares, clicks by scheduled date.
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import type { ContentItem } from '@/hooks/useContentCalendar';

interface Props {
  items: ContentItem[];
}

export default function PerformanceChart({ items }: Props) {
  const chartData = useMemo(() => {
    const published = items.filter((i) => i.status === 'published' && i.engagement_metrics && i.scheduled_date);
    if (published.length === 0) return [];

    return published
      .sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime())
      .map((item) => {
        const m = item.engagement_metrics as Record<string, number>;
        return {
          date: format(new Date(item.scheduled_date!), 'dd MMM'),
          title: item.title,
          likes: m.likes ?? 0,
          comments: m.comments ?? 0,
          shares: m.shares ?? 0,
          clicks: m.clicks ?? 0,
        };
      });
  }, [items]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No published content with engagement metrics yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-4">
        Content Performance
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="likes" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
          <Bar dataKey="comments" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
          <Bar dataKey="shares" fill="hsl(142 76% 36%)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="clicks" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
