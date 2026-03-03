/**
 * SocialIntelligenceDashboard
 *
 * Sub-section of the Media Monitoring Hub showing social media intelligence:
 * - Platform breakdown bar chart (Twitter vs Facebook vs Instagram items this week)
 * - Top Twitter accounts mentioning client (ranked by follower count)
 * - Competitor social activity feed (latest posts triggering monitoring rules)
 *
 * Uses intel_items data filtered by platform for social source_type items.
 */

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Twitter, Facebook, Instagram, TrendingUp, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LBDBadge } from '@/components/ui/lbd';
import type { Tables } from '@/integrations/supabase/types';

type IntelItem = Tables<'intel_items'>;

interface SocialIntelligenceDashboardProps {
  /** All intel_items for the engagement (pre-fetched by parent) */
  items: IntelItem[];
}

/** Platform colour mapping using HSL design tokens */
const PLATFORM_COLORS: Record<string, string> = {
  twitter: 'hsl(var(--chart-1))',
  facebook: 'hsl(var(--chart-2))',
  instagram: 'hsl(var(--chart-3))',
};

/** Get items from the last 7 days with social source_type */
function getSocialItems(items: IntelItem[]): IntelItem[] {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  return items.filter(
    (i) => i.source_type === 'social' && i.date_logged >= cutoff,
  );
}

export default function SocialIntelligenceDashboard({ items }: SocialIntelligenceDashboardProps) {
  const socialItems = useMemo(() => getSocialItems(items), [items]);

  // ── Platform breakdown data ──
  const platformBreakdown = useMemo(() => {
    const counts: Record<string, number> = { twitter: 0, facebook: 0, instagram: 0 };
    for (const item of socialItems) {
      const p = (item.platform ?? '').toLowerCase();
      if (p in counts) counts[p]++;
    }
    return [
      { platform: 'Twitter/X', count: counts.twitter, key: 'twitter' },
      { platform: 'Facebook', count: counts.facebook, key: 'facebook' },
      { platform: 'Instagram', count: counts.instagram, key: 'instagram' },
    ];
  }, [socialItems]);

  // ── Top Twitter accounts by mention frequency ──
  const topAccounts = useMemo(() => {
    const accountMap = new Map<string, { name: string; count: number; reachTier: number }>();
    for (const item of socialItems) {
      if ((item.platform ?? '').toLowerCase() !== 'twitter') continue;
      const name = item.source_name ?? 'Unknown';
      const existing = accountMap.get(name);
      if (existing) {
        existing.count++;
        existing.reachTier = Math.max(existing.reachTier, item.reach_tier ?? 1);
      } else {
        accountMap.set(name, { name, count: 1, reachTier: item.reach_tier ?? 1 });
      }
    }
    return Array.from(accountMap.values())
      .sort((a, b) => b.reachTier - a.reachTier || b.count - a.count)
      .slice(0, 10);
  }, [socialItems]);

  // ── Competitor social activity feed ──
  const competitorActivity = useMemo(() => {
    return socialItems
      .filter((i) => i.narrative_theme === 'political_advertising' || (i.reach_tier ?? 0) >= 2)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);
  }, [socialItems]);

  const totalSocial = platformBreakdown.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Social Intelligence</h3>
        <LBDBadge variant="outline" className="text-[10px]">
          {totalSocial} items this week
        </LBDBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platform breakdown chart */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Platform Breakdown (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={platformBreakdown} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="platform" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {platformBreakdown.map((entry) => (
                    <Cell key={entry.key} fill={PLATFORM_COLORS[entry.key] ?? 'hsl(var(--muted))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Twitter accounts */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Twitter className="w-3 h-3" />
              Top Accounts Mentioning
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[200px] overflow-y-auto">
            {topAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No Twitter data yet</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/30">
                    <th className="text-left py-1 font-medium">Account</th>
                    <th className="text-right py-1 font-medium">Mentions</th>
                    <th className="text-right py-1 font-medium">Reach</th>
                  </tr>
                </thead>
                <tbody>
                  {topAccounts.map((acc) => (
                    <tr key={acc.name} className="border-b border-border/10">
                      <td className="py-1.5 text-foreground font-medium">{acc.name}</td>
                      <td className="text-right text-muted-foreground">{acc.count}</td>
                      <td className="text-right">
                        <LBDBadge
                          variant={acc.reachTier >= 3 ? 'red' : acc.reachTier >= 2 ? 'amber' : 'outline'}
                          className="text-[9px]"
                        >
                          Tier {acc.reachTier}
                        </LBDBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Competitor social activity feed */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Competitor Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[200px] overflow-y-auto space-y-2">
            {competitorActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No competitor activity detected</p>
            ) : (
              competitorActivity.map((item) => (
                <div key={item.id} className="p-2 rounded-lg bg-muted/30 border border-border/20 space-y-1">
                  <div className="flex items-center gap-1.5">
                    {getPlatformIcon(item.platform)}
                    <span className="text-[10px] font-semibold text-foreground">{item.source_name}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {item.date_logged}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {item.headline}
                  </p>
                  {item.narrative_theme === 'political_advertising' && (
                    <LBDBadge variant="red" className="text-[8px]">Political Ad</LBDBadge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Returns the appropriate platform icon component */
function getPlatformIcon(platform: string | null) {
  const p = (platform ?? '').toLowerCase();
  const className = 'w-3 h-3 text-muted-foreground';
  if (p === 'twitter' || p.includes('twitter')) return <Twitter className={className} />;
  if (p === 'facebook' || p.includes('facebook')) return <Facebook className={className} />;
  if (p === 'instagram' || p.includes('instagram')) return <Instagram className={className} />;
  return <TrendingUp className={className} />;
}
