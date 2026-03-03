/**
 * CommsDashboard
 *
 * Three sections:
 *  1. Narrative Health Scores — avg sentiment per engagement (30d) with trend arrows
 *  2. Active Campaigns Board  — comms_initiatives status='in_progress'
 *  3. Upcoming Comms Events   — content + touchpoints this week
 */
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
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
  useNarrativeSentiment,
  useActiveInitiatives,
  useUpcomingCommsEvents,
  type InitiativeRow,
  type CommsEventItem,
  type NarrativeHealthRow,
} from '@/hooks/useCommsDashboard';
import { TrendingUp, TrendingDown, Minus, Megaphone, Calendar } from 'lucide-react';

/* ─────────────────────────────────────────────
   Column definitions
───────────────────────────────────────────── */

const initiativeColumns: ColumnDef<InitiativeRow>[] = [
  {
    key: 'key_message',
    label: 'Key Message',
    sortable: true,
    render: (_v, row) => (
      <span className="font-medium text-foreground line-clamp-2 text-sm">
        {row.key_message ?? '—'}
      </span>
    ),
  },
  {
    key: 'policy_area',
    label: 'Policy Area',
    render: (_v, row) => (
      <span className="text-xs text-muted-foreground">{row.policy_area ?? '—'}</span>
    ),
  },
  {
    key: 'target_audience',
    label: 'Audience',
    render: (_v, row) => (
      <span className="text-xs text-muted-foreground">{row.target_audience ?? '—'}</span>
    ),
  },
  {
    key: 'launch_date',
    label: 'Launch',
    sortable: true,
    render: (_v, row) => (
      <span className="text-xs font-mono text-accent">
        {row.launch_date ? format(parseISO(row.launch_date), 'd MMM') : '—'}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (_v, row) => <LBDBadge variant="status" value={row.status} />,
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

function sentimentBand(score: number | null): { label: string; cls: string } {
  if (score === null) return { label: 'No data', cls: 'text-muted-foreground' };
  if (score > 0.3)  return { label: 'Positive',  cls: 'text-emerald-400' };
  if (score < -0.3) return { label: 'Negative',  cls: 'text-red-400' };
  return { label: 'Neutral', cls: 'text-amber-400' };
}

function scoreToBar(score: number | null): number {
  if (score === null) return 50;
  return Math.round(((score + 1) / 2) * 100);
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up')   return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function platformColor(platform: string | null): string {
  const map: Record<string, string> = {
    twitter: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    x:       'bg-sky-500/20 text-sky-400 border-sky-500/30',
    linkedin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    facebook: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[(platform ?? '').toLowerCase()] ?? 'bg-muted/30 text-muted-foreground border-border';
}

function formatDateShort(iso: string): string {
  try { return format(parseISO(iso), 'EEE d MMM'); } catch { return iso; }
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function CommsDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const sentiment  = useNarrativeSentiment();
  const initiatives = useActiveInitiatives();
  const events     = useUpcomingCommsEvents();

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const greeting  = getGreeting();

  // KPIs
  const activeInitCount = initiatives.data?.length ?? 0;
  const negEngCount = sentiment.data?.filter(r => (r.avg_sentiment_30d ?? 0) < -0.3).length ?? 0;
  const thisWeekCount = events.data?.length ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <LBDPageHeader
        eyebrow="COMMUNICATIONS DIRECTOR"
        title={`${greeting}, ${firstName}`}
        subtitle="Narrative health, active campaigns, and this week's comms schedule."
      />

      {/* ── ROW 1: KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LBDStatCard
          label="Active Initiatives"
          value={initiatives.isLoading ? '—' : activeInitCount}
          accentClass="gold"
          loading={initiatives.isLoading}
        />
        <LBDStatCard
          label="Tracked Engagements"
          value={sentiment.isLoading ? '—' : (sentiment.data?.length ?? 0)}
          accentClass="info"
          loading={sentiment.isLoading}
        />
        <LBDStatCard
          label="Negative Narrative"
          value={sentiment.isLoading ? '—' : negEngCount}
          accentClass={negEngCount > 0 ? 'danger' : 'success'}
          loading={sentiment.isLoading}
        />
        <LBDStatCard
          label="Events This Week"
          value={events.isLoading ? '—' : thisWeekCount}
          accentClass="gold"
          loading={events.isLoading}
        />
      </div>

      {/* ── ROW 2: Narrative Health Scores ── */}
      <LBDCard
        title="Narrative Health Scores"
        subtitle="Average sentiment per engagement — last 30 days vs last 7 days"
      >
        {sentiment.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-card-muted animate-pulse" />
            ))}
          </div>
        ) : !sentiment.data?.length ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">No sentiment data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sentiment.data.map((row: NarrativeHealthRow) => {
              const band = sentimentBand(row.avg_sentiment_30d);
              const barPct = scoreToBar(row.avg_sentiment_30d);
              return (
                <div
                  key={row.engagement_id}
                  className="rounded-xl border border-border bg-card p-3 space-y-2 cursor-pointer hover:border-accent/30 transition-colors"
                  onClick={() => navigate(`/engagements/${row.engagement_id}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground truncate flex-1">
                      {row.engagement_title}
                    </p>
                    <TrendIcon trend={row.trend} />
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono ${band.cls}`}>
                      {band.label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {row.item_count} items
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </LBDCard>

      {/* ── ROW 3: Active Campaigns ── */}
      <LBDCard
        title="Active Campaigns"
        subtitle="Comms initiatives currently in progress"
        padding="none"
        action={
          activeInitCount > 0 ? (
            <span className="font-mono text-[10px] text-accent tracking-widest flex items-center gap-1">
              <Megaphone className="w-3 h-3" />
              {activeInitCount} IN PROGRESS
            </span>
          ) : undefined
        }
      >
        <LBDDataTable<InitiativeRow>
          columns={initiativeColumns}
          data={initiatives.data ?? []}
          isLoading={initiatives.isLoading}
          searchable
          searchPlaceholder="Search initiatives…"
          exportFilename="active-initiatives"
          emptyMessage="No initiatives currently in progress."
          onRowClick={(row) => navigate(`/engagements/${row.engagement_id}`)}
        />
      </LBDCard>

      {/* ── ROW 4: Upcoming Comms Events ── */}
      <LBDCard
        title="This Week's Comms Schedule"
        subtitle="Content items and touchpoints Mon – Sun"
        action={
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {thisWeekCount} EVENTS
          </span>
        }
      >
        {events.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg bg-card-muted animate-pulse" />
            ))}
          </div>
        ) : !events.data?.length ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Nothing scheduled this week</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {events.data.map((evt: CommsEventItem) => (
              <div
                key={`${evt.type}-${evt.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-accent/20 transition-colors cursor-pointer"
                onClick={() => navigate(`/engagements/${evt.engagement_id}`)}
              >
                <div className="flex-none">
                  {evt.type === 'content'
                    ? <Megaphone className="w-3.5 h-3.5 text-accent" />
                    : <Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground">{evt.engagement_title}</p>
                  <p className="text-sm text-foreground truncate">{evt.title}</p>
                </div>
                <div className="flex-none flex items-center gap-2">
                  {evt.platform && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${platformColor(evt.platform)}`}>
                      {evt.platform.toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs font-mono text-accent">
                    {formatDateShort(evt.scheduled_date)}
                  </span>
                </div>
              </div>
            ))}
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
