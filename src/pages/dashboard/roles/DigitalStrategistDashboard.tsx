/**
 * DigitalStrategistDashboard
 *
 * Three sections:
 *  1. Social Performance Strip  — KPI cards per platform (published, scheduled, sentiment)
 *  2. Content Calendar          — Mon–Sun grid with content items per day
 *  3. Platform Reach Trend      — Line chart of content published/scheduled last 14 days by platform
 */
import { format, parseISO, isToday, isPast } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  LBDPageHeader,
  LBDCard,
  LBDStatCard,
  LBDBadge,
} from '@/components/ui/lbd';
import { useAuthStore } from '@/stores/authStore';
import {
  useSocialPlatformKPIs,
  useContentCalendar,
  usePlatformTrend,
  type PlatformKPI,
  type CalendarDaySlot,
} from '@/hooks/useDigitalStrategistDashboard';
import { Megaphone, Calendar, CheckCircle2 } from 'lucide-react';

/* ─────────────────────────────────────────────
   Platform colour palette for the line chart
───────────────────────────────────────────── */

const PLATFORM_COLORS: Record<string, string> = {
  twitter:    '#38bdf8',
  x:          '#38bdf8',
  linkedin:   '#60a5fa',
  facebook:   '#818cf8',
  instagram:  '#f472b6',
  youtube:    '#f87171',
  tiktok:     '#a78bfa',
};

function getPlatformColor(platform: string, idx: number): string {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

const FALLBACK_COLORS = ['#c084fc', '#fb923c', '#34d399', '#facc15', '#a3e635'];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function platformIcon(platform: string): string {
  const icons: Record<string, string> = {
    twitter: 'X',
    x: 'X',
    linkedin: 'in',
    facebook: 'f',
    instagram: 'ig',
    youtube: 'yt',
    tiktok: 'tt',
  };
  return icons[platform.toLowerCase()] ?? platform.slice(0, 2).toUpperCase();
}

function sentimentColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score > 0.3) return 'text-emerald-400';
  if (score < -0.3) return 'text-red-400';
  return 'text-amber-400';
}

function contentStatusDot(status: string): string {
  const map: Record<string, string> = {
    published: 'bg-emerald-400',
    scheduled: 'bg-amber-400',
    draft:     'bg-muted-foreground',
    review:    'bg-blue-400',
    archived:  'bg-muted-foreground/30',
  };
  return map[status] ?? 'bg-muted-foreground';
}

function extractPlatforms(data: Record<string, number | string>[]): string[] {
  if (!data.length) return [];
  return Object.keys(data[0]).filter(k => k !== 'date');
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function DigitalStrategistDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const platformKPIs   = useSocialPlatformKPIs();
  const calendar       = useContentCalendar();
  const platformTrend  = usePlatformTrend();

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const greeting  = getGreeting();

  // KPIs
  const totalPublished = platformKPIs.data?.reduce((a, b) => a + b.total_published, 0) ?? 0;
  const totalScheduled = platformKPIs.data?.reduce((a, b) => a + b.scheduled_count, 0) ?? 0;
  const totalRecent    = platformKPIs.data?.reduce((a, b) => a + b.recent_items, 0) ?? 0;
  const activePlatforms = platformKPIs.data?.length ?? 0;

  // Derive dynamic platform list from trend data
  const trendPlatforms = platformTrend.data ? extractPlatforms(platformTrend.data) : [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <LBDPageHeader
        eyebrow="DIGITAL STRATEGIST"
        title={`${greeting}, ${firstName}`}
        subtitle="Platform performance, content calendar, and publishing trends."
      />

      {/* ── ROW 1: KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LBDStatCard
          label="Active Platforms"
          value={platformKPIs.isLoading ? '—' : activePlatforms}
          accentClass="gold"
          isLoading={platformKPIs.isLoading}
        />
        <LBDStatCard
          label="Total Published"
          value={platformKPIs.isLoading ? '—' : totalPublished}
          accentClass="success"
          isLoading={platformKPIs.isLoading}
        />
        <LBDStatCard
          label="Scheduled"
          value={platformKPIs.isLoading ? '—' : totalScheduled}
          accentClass="info"
          isLoading={platformKPIs.isLoading}
        />
        <LBDStatCard
          label="Active Last 7 Days"
          value={platformKPIs.isLoading ? '—' : totalRecent}
          accentClass="gold"
          isLoading={platformKPIs.isLoading}
        />
      </div>

      {/* ── ROW 2: Platform KPI Cards ── */}
      <LBDCard
        title="Social Performance by Platform"
        subtitle="Content output and sentiment from social intel"
      >
        {platformKPIs.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-xl bg-card-muted animate-pulse" />
            ))}
          </div>
        ) : !platformKPIs.data?.length ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">No platform data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {platformKPIs.data.map((kpi: PlatformKPI) => (
              <div
                key={kpi.platform}
                className="rounded-xl border border-border bg-card p-3 space-y-2"
              >
                {/* Platform badge */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: PLATFORM_COLORS[kpi.platform.toLowerCase()] ?? '#6b7280' }}
                  >
                    {platformIcon(kpi.platform)}
                  </span>
                  <p className="text-xs font-medium text-foreground capitalize">{kpi.platform}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">Published</p>
                    <p className="text-sm font-mono text-foreground">{kpi.total_published}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">Scheduled</p>
                    <p className="text-sm font-mono text-foreground">{kpi.scheduled_count}</p>
                  </div>
                </div>

                {/* Sentiment */}
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase">Sentiment</p>
                  <span className={`text-[10px] font-mono ${sentimentColor(kpi.avg_sentiment)}`}>
                    {kpi.avg_sentiment !== null ? kpi.avg_sentiment.toFixed(2) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </LBDCard>

      {/* ── ROW 3: Content Calendar ── */}
      <LBDCard
        title="Content Calendar"
        subtitle="This week Mon – Sun"
      >
        {calendar.isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="h-32 rounded-xl bg-card-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {(calendar.data ?? []).map((day: CalendarDaySlot) => {
              const isCurrentDay = isToday(new Date(day.iso));
              const isPastDay    = !isCurrentDay && isPast(new Date(day.iso + 'T23:59:59'));
              return (
                <div
                  key={day.iso}
                  className={`rounded-xl border p-2 min-h-[120px] space-y-1 transition-colors
                    ${isCurrentDay
                      ? 'border-accent/50 bg-accent/5'
                      : 'border-border bg-card'
                    }
                    ${isPastDay ? 'opacity-60' : ''}
                  `}
                >
                  <p className={`text-[10px] font-mono tracking-wide uppercase mb-1.5
                    ${isCurrentDay ? 'text-accent' : 'text-muted-foreground'}`}>
                    {day.label}
                  </p>
                  {day.items.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/40 italic">Empty</p>
                  ) : (
                    <div className="space-y-1">
                      {day.items.slice(0, 4).map(item => (
                        <div
                          key={item.id}
                          className="flex items-start gap-1.5 cursor-pointer group"
                          onClick={() => navigate(`/engagements/${item.engagement_title}`)}
                          title={`${item.title} — ${item.engagement_title}`}
                        >
                          <span className={`flex-none mt-1 w-1.5 h-1.5 rounded-full ${contentStatusDot(item.status)}`} />
                          <p className="text-[10px] text-foreground/80 line-clamp-2 group-hover:text-foreground transition-colors leading-tight">
                            {item.title}
                          </p>
                        </div>
                      ))}
                      {day.items.length > 4 && (
                        <p className="text-[9px] font-mono text-muted-foreground/60 pl-3">
                          +{day.items.length - 4} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border flex-wrap">
          {[
            { label: 'Published', cls: 'bg-emerald-400' },
            { label: 'Scheduled', cls: 'bg-amber-400' },
            { label: 'Draft',     cls: 'bg-muted-foreground' },
            { label: 'In Review', cls: 'bg-blue-400' },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cls}`} />
              <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </LBDCard>

      {/* ── ROW 4: Platform Reach Trend ── */}
      <LBDCard
        title="Platform Publishing Trend"
        subtitle="Items published or scheduled per platform — last 14 days"
      >
        {platformTrend.isLoading ? (
          <div className="h-64 bg-card-muted animate-pulse rounded-xl" />
        ) : !trendPlatforms.length ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">No content data for the last 14 days</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={platformTrend.data}
                margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
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
                  interval={1}
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
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>
                      {value}
                    </span>
                  )}
                  iconSize={8}
                  iconType="line"
                />
                {trendPlatforms.map((platform, idx) => (
                  <Line
                    key={platform}
                    type="monotone"
                    dataKey={platform}
                    name={platform.charAt(0).toUpperCase() + platform.slice(1)}
                    stroke={getPlatformColor(platform, idx)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
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
