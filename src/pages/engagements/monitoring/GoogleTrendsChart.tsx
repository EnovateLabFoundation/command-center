/**
 * GoogleTrendsChart
 *
 * Displays Google Trends interest-over-time comparison chart
 * from the google_trends_data table. Each keyword gets its own line.
 * Uses Recharts LineChart with design-system tokens.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

/** Chart colour palette using design-system chart tokens */
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface GoogleTrendsChartProps {
  engagementId: string;
}

/** Fetch national-level trends data (region IS NULL = time series) */
function useTrendsData(engagementId: string) {
  return useQuery({
    queryKey: ['google-trends', engagementId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('google_trends_data')
        .select('*')
        .eq('engagement_id', engagementId)
        .is('region', null)
        .order('date', { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Array<{
        keyword: string;
        date: string;
        interest_score: number;
      }>;
    },
    enabled: !!engagementId,
  });
}

export default function GoogleTrendsChart({ engagementId }: GoogleTrendsChartProps) {
  const { data: rawData = [], isLoading } = useTrendsData(engagementId);

  // Transform: pivot data so each date has keyword columns
  const { chartData, keywords } = useMemo(() => {
    if (rawData.length === 0) return { chartData: [], keywords: [] };

    const keywordSet = new Set<string>();
    const dateMap = new Map<string, Record<string, number>>();

    for (const row of rawData) {
      keywordSet.add(row.keyword);
      const existing = dateMap.get(row.date) ?? {};
      existing[row.keyword] = row.interest_score;
      dateMap.set(row.date, existing);
    }

    const keywords = Array.from(keywordSet);
    const chartData = Array.from(dateMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { chartData, keywords };
  }, [rawData]);

  if (isLoading) {
    return <Skeleton className="h-[300px] rounded-xl" />;
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-card/60 border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" />
            Google Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-8">
            No Google Trends data yet. Configure SerpAPI integration and sync.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/60 border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" />
          Google Trends — Interest Over Time (90d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {keywords.map((kw, idx) => (
              <Line
                key={kw}
                type="monotone"
                dataKey={kw}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                name={kw}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
