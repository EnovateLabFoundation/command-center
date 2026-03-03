/**
 * PortalMedia (/portal/insights/media)
 *
 * Client-facing media coverage summary showing:
 *   - Total coverage this month
 *   - Reach tier breakdown (pie chart)
 *   - Curated headline list (portal_approved only)
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Newspaper } from 'lucide-react';
import { format, parseISO, startOfMonth, isAfter } from 'date-fns';
import { usePortalAccess, usePortalIntel } from '@/hooks/usePortalData';
import { LBDCard, LBDEmptyState } from '@/components/ui/lbd';

const TIER_COLORS = ['hsl(var(--muted))', 'hsl(var(--warning))', 'hsl(var(--accent))'];
const TIER_LABELS = ['Tier 1', 'Tier 2', 'Tier 3'];

export default function PortalMedia() {
  const { data: access } = usePortalAccess();
  const { data: items, isLoading } = usePortalIntel(access?.engagement_id);

  const monthStart = startOfMonth(new Date());

  // This month's items
  const thisMonth = useMemo(
    () =>
      items?.filter((i) => isAfter(parseISO(i.date_logged), monthStart)) ?? [],
    [items, monthStart]
  );

  // Tier breakdown
  const tierData = useMemo(() => {
    const counts = [0, 0, 0]; // tier 1, 2, 3
    for (const item of thisMonth) {
      const t = (item.reach_tier ?? 1) - 1;
      counts[Math.min(Math.max(t, 0), 2)] += 1;
    }
    return counts.map((value, i) => ({ name: TIER_LABELS[i], value })).filter((d) => d.value > 0);
  }, [thisMonth]);

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
        <p className="text-[10px] font-mono tracking-[0.3em] text-accent mb-1">MEDIA COVERAGE</p>
        <h1 className="text-xl font-bold text-foreground">Media Coverage Summary</h1>
        <p className="text-sm text-muted-foreground">Curated coverage highlights from your advisory team.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LBDCard className="p-5">
          <p className="text-[10px] font-mono tracking-wider text-muted-foreground mb-1">THIS MONTH</p>
          <p className="text-3xl font-bold text-foreground">{thisMonth.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total coverage items</p>
        </LBDCard>

        {tierData.length > 0 && (
          <LBDCard className="p-5">
            <p className="text-[10px] font-mono tracking-wider text-muted-foreground mb-2">REACH BREAKDOWN</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {tierData.map((_, i) => (
                      <Cell key={i} fill={TIER_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 mt-1">
              {tierData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[i] }} />
                  <span className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </LBDCard>
        )}
      </div>

      {/* Headlines */}
      {items && items.length > 0 ? (
        <LBDCard className="p-5">
          <p className="text-xs font-mono tracking-wider text-muted-foreground mb-3">KEY HEADLINES</p>
          <div className="space-y-0">
            {items.slice(0, 20).map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                  {format(parseISO(item.date_logged), 'dd MMM')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2">{item.headline}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.source_name ?? 'Unknown'} · {item.platform ?? item.source_type ?? '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </LBDCard>
      ) : (
        <LBDEmptyState
          icon={<Newspaper className="w-8 h-8" />}
          title="No Coverage Yet"
          description="Curated media coverage will appear here as your advisory team approves items."
        />
      )}
    </div>
  );
}
