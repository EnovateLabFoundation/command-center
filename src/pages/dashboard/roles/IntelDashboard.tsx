/**
 * IntelDashboard
 *
 * Four sections:
 *  1. Daily Sentiment Monitor  — today / yesterday / 7d avg per engagement
 *  2. Escalation Queue         — is_escalated=true, pending, with Acknowledge/Assign/Dismiss
 *  3. Competitor Activity Feed — last 10 profiles by last_updated
 *  4. Intel Volume Chart       — last 7 days stacked bar by sentiment range (Recharts)
 */
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  LBDPageHeader,
  LBDCard,
  LBDStatCard,
  LBDBadge,
  LBDDataTable,
  type ColumnDef,
} from '@/components/ui/lbd';
import { useAuthStore } from '@/stores/authStore';
import {
  useDailySentiment,
  useIntelEscalationQueue,
  useCompetitorFeed,
  useIntelVolumeChart,
  useUpdateEscalationStatus,
  type IntelEscalationRow,
  type CompetitorFeedRow,
  type DailySentimentRow,
} from '@/hooks/useIntelDashboard';
import { TrendingUp, TrendingDown, Minus, CheckCircle2, Eye, XCircle } from 'lucide-react';

/* ─────────────────────────────────────────────
   Column definitions
───────────────────────────────────────────── */

const competitorColumns: ColumnDef<CompetitorFeedRow>[] = [
  {
    key: 'name',
    label: 'Competitor',
    sortable: true,
    render: (_v, row) => (
      <span className="font-medium text-foreground">{row.name}</span>
    ),
  },
  {
    key: 'avg_sentiment_score',
    label: 'Avg Sentiment',
    sortable: true,
    render: (_v, row) => {
      const s = row.avg_sentiment_score;
      const cls = s === null ? 'text-muted-foreground'
        : s > 0.3 ? 'text-emerald-400'
        : s < -0.3 ? 'text-red-400'
        : 'text-amber-400';
      return (
        <span className={`font-mono text-xs ${cls}`}>
          {s !== null ? s.toFixed(2) : '—'}
        </span>
      );
    },
  },
  {
    key: 'threat_score',
    label: 'Threat',
    sortable: true,
    render: (_v, row) => {
      const t = row.threat_score ?? 0;
      const cls = t >= 7 ? 'text-red-400' : t >= 4 ? 'text-amber-400' : 'text-emerald-400';
      return <span className={`font-mono text-xs ${cls}`}>{row.threat_score ?? '—'}/10</span>;
    },
  },
  {
    key: 'monthly_media_mentions',
    label: 'Media Mentions',
    sortable: true,
    render: (_v, row) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.monthly_media_mentions?.toLocaleString() ?? '—'}
      </span>
    ),
  },
  {
    key: 'last_updated',
    label: 'Updated',
    sortable: true,
    render: (_v, row) => {
      try {
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {format(parseISO(row.last_updated), 'd MMM HH:mm')}
          </span>
        );
      } catch { return <span className="text-xs text-muted-foreground">—</span>; }
    },
  },
  {
    key: 'engagement_title',
    label: 'Engagement',
    render: (_v, row) => (
      <span className="text-xs text-muted-foreground">{row.engagement_title}</span>
    ),
  },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up')   return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function SentimentPill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[10px] font-mono text-muted-foreground">—</span>;
  const cls = score > 0.3 ? 'text-emerald-400' : score < -0.3 ? 'text-red-400' : 'text-amber-400';
  return <span className={`text-[10px] font-mono ${cls}`}>{score.toFixed(2)}</span>;
}

function reachBadgeClass(tier: string | null): string {
  const map: Record<string, string> = {
    tier_1: 'bg-red-950/50 text-red-400 border-red-800/40',
    tier_2: 'bg-amber-950/50 text-amber-400 border-amber-800/40',
    tier_3: 'bg-muted/30 text-muted-foreground border-border',
  };
  return map[(tier ?? '').toLowerCase()] ?? 'bg-muted/30 text-muted-foreground border-border';
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function IntelDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const sentiment  = useDailySentiment();
  const escalation = useIntelEscalationQueue();
  const competitors = useCompetitorFeed();
  const volumeChart = useIntelVolumeChart();
  const updateStatus = useUpdateEscalationStatus();

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const greeting  = getGreeting();

  // KPIs
  const escalCount = escalation.data?.length ?? 0;
  const todayTotal = volumeChart.data
    ? volumeChart.data[volumeChart.data.length - 1]?.total ?? 0
    : 0;
  const negToday = volumeChart.data
    ? volumeChart.data[volumeChart.data.length - 1]?.negative ?? 0
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <LBDPageHeader
        eyebrow="INTELLIGENCE ANALYST"
        title={`${greeting}, ${firstName}`}
        subtitle="Daily sentiment monitoring, escalation queue, and competitive intelligence."
      />

      {/* ── ROW 1: KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LBDStatCard
          label="Escalations Pending"
          value={escalation.isLoading ? '—' : escalCount}
          accentClass={escalCount > 0 ? 'danger' : 'success'}
          isLoading={escalation.isLoading}
        />
        <LBDStatCard
          label="Intel Items Today"
          value={volumeChart.isLoading ? '—' : todayTotal}
          accentClass="info"
          isLoading={volumeChart.isLoading}
        />
        <LBDStatCard
          label="Negative Today"
          value={volumeChart.isLoading ? '—' : negToday}
          accentClass={negToday > 0 ? 'danger' : 'success'}
          isLoading={volumeChart.isLoading}
        />
        <LBDStatCard
          label="Tracked Competitors"
          value={competitors.isLoading ? '—' : (competitors.data?.length ?? 0)}
          accentClass="gold"
          isLoading={competitors.isLoading}
        />
      </div>

      {/* ── ROW 2: Sentiment Monitor ── */}
      <LBDCard
        title="Daily Sentiment Monitor"
        subtitle="Today vs yesterday vs 7-day average per engagement"
      >
        {sentiment.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-card-muted animate-pulse" />
            ))}
          </div>
        ) : !sentiment.data?.length ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">No sentiment data today</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sentiment.data.map((row: DailySentimentRow) => (
              <div
                key={row.engagement_id}
                className="rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => navigate(`/engagements/${row.engagement_id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-foreground truncate flex-1">
                    {row.engagement_title}
                  </p>
                  <TrendIcon trend={row.trend} />
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="rounded-lg bg-muted/20 px-1 py-1.5">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Today</p>
                    <SentimentPill score={row.today_avg} />
                  </div>
                  <div className="rounded-lg bg-muted/20 px-1 py-1.5">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Yest.</p>
                    <SentimentPill score={row.yesterday_avg} />
                  </div>
                  <div className="rounded-lg bg-muted/20 px-1 py-1.5">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">7d Avg</p>
                    <SentimentPill score={row.week_avg} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </LBDCard>

      {/* ── ROW 3: Escalation Queue + Intel Volume Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Escalation Queue */}
        <LBDCard
          title="Escalation Queue"
          subtitle="Escalated items awaiting action"
          action={
            escalCount > 0 ? (
              <span className="font-mono text-[10px] text-red-400 tracking-widest">
                {escalCount} PENDING
              </span>
            ) : undefined
          }
        >
          {escalation.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-lg bg-card-muted animate-pulse" />
              ))}
            </div>
          ) : !escalation.data?.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/60" />
              <p className="text-sm text-muted-foreground">Escalation queue is clear</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {escalation.data.map((item: IntelEscalationRow) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[10px] font-mono text-muted-foreground truncate">
                          {item.engagement_title}
                        </p>
                        {item.is_urgent && (
                          <span className="text-[9px] font-mono text-red-400 border border-red-800/40 rounded px-1 py-0.5 bg-red-950/40">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {item.headline}
                      </p>
                    </div>
                    <SentimentPill score={item.sentiment_score} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.reach_tier && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${reachBadgeClass(item.reach_tier)}`}>
                        {item.reach_tier.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                    {item.platform && (
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {item.platform}
                      </span>
                    )}
                    <div className="flex-1" />
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-md bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                      onClick={() => updateStatus.mutate({ id: item.id, status: 'in_progress' })}
                      disabled={updateStatus.isPending}
                      title="Acknowledge"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      ACK
                    </button>
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-md bg-blue-950/60 border border-blue-800/40 text-blue-400 hover:bg-blue-900/60 transition-colors"
                      onClick={() => navigate(`/engagements/${item.engagement_id}`)}
                      title="View"
                    >
                      <Eye className="w-3 h-3" />
                      VIEW
                    </button>
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-md bg-muted/40 border border-border text-muted-foreground hover:border-muted transition-colors"
                      onClick={() => updateStatus.mutate({ id: item.id, status: 'monitor_only' })}
                      disabled={updateStatus.isPending}
                      title="Dismiss"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </LBDCard>

        {/* Intel Volume Chart */}
        <LBDCard
          title="Intel Volume — Last 7 Days"
          subtitle="Daily item count by sentiment range"
        >
          {volumeChart.isLoading ? (
            <div className="h-64 bg-card-muted animate-pulse rounded-xl" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={volumeChart.data}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                  barSize={20}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111118',
                      border: '1px solid #2d2d3a',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {value}
                      </span>
                    )}
                    iconSize={8}
                    iconType="square"
                  />
                  <Bar dataKey="positive" stackId="a" fill="#22c55e" name="Positive" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="neutral"  stackId="a" fill="#f59e0b" name="Neutral"  radius={[0, 0, 0, 0]} />
                  <Bar dataKey="negative" stackId="a" fill="#ef4444" name="Negative" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </LBDCard>

      </div>

      {/* ── ROW 4: Competitor Activity Feed ── */}
      <LBDCard
        title="Competitor Activity Feed"
        subtitle="Last 10 profiles by most recently updated"
        padding="none"
      >
        <LBDDataTable<CompetitorFeedRow>
          columns={competitorColumns}
          data={competitors.data ?? []}
          isLoading={competitors.isLoading}
          searchable
          searchPlaceholder="Search competitors…"
          exportFilename="competitor-feed"
          onRowClick={(row) => navigate(`/engagements/${row.engagement_id}`)}
          emptyMessage="No competitor profiles tracked yet."
        />
      </LBDCard>

    </div>
  );
}

/* ─────────────────────────────────────────────
   Helper
───────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
