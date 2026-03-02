/**
 * LeadAdvisorDashboard
 *
 * Four sections:
 *  1. KPI Strip          — Active Engagements, Overdue Touchpoints, Pending Actions, Open Escalations
 *  2. Engagement Health  — Table of lead advisor's own portfolio with RAG status
 *  3. Escalation Inbox   — Urgent intel items awaiting action (2-col with touchpoints)
 *  4. Touchpoint Calendar— Upcoming touchpoints this week
 */
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  LBDPageHeader,
  LBDStatCard,
  LBDCard,
  LBDBadge,
  LBDDataTable,
  type ColumnDef,
} from '@/components/ui/lbd';
import { useAuthStore } from '@/stores/authStore';
import {
  useLeadAdvisorKPIs,
  useMyEngagements,
  useEscalationInbox,
  useUpcomingTouchpoints,
  useUpdateIntelStatus,
  type MyEngagementRow,
  type EscalationItem,
  type TouchpointItem,
} from '@/hooks/useLeadAdvisorDashboard';
import { Briefcase, AlertTriangle, Calendar, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

/* ─────────────────────────────────────────────
   Column definitions
───────────────────────────────────────────── */

const engagementColumns: ColumnDef<MyEngagementRow>[] = [
  {
    key: 'title',
    label: 'Engagement',
    sortable: true,
    render: (_v, row) => (
      <span className="font-medium text-foreground">{row.title}</span>
    ),
  },
  {
    key: 'client_name',
    label: 'Client',
    sortable: true,
  },
  {
    key: 'phase',
    label: 'Phase',
    render: (_v, row) => <LBDBadge variant="phase" value={String(row.phase).replace('Phase ', '')} />,
  },
  {
    key: 'computed_rag',
    label: 'Health',
    sortable: true,
    render: (_v, row) => <LBDBadge variant="rag" value={row.computed_rag} />,
  },
  {
    key: 'latest_intel_days',
    label: 'Last Intel',
    sortable: true,
    render: (_v, row) => {
      const d = row.latest_intel_days;
      if (d === null) return <span className="text-muted-foreground text-xs">No intel</span>;
      const cls = d > 14 ? 'text-red-400' : d > 7 ? 'text-amber-400' : 'text-emerald-400';
      return <span className={`text-xs font-mono ${cls}`}>{d}d ago</span>;
    },
  },
  {
    key: 'status',
    label: 'Status',
    render: (_v, row) => <LBDBadge variant="status" value={row.status} />,
  },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function sentimentColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score > 0.3) return 'text-emerald-400';
  if (score < -0.3) return 'text-red-400';
  return 'text-amber-400';
}

function sentimentLabel(score: number | null): string {
  if (score === null) return '—';
  if (score > 0.3) return '▲ Positive';
  if (score < -0.3) return '▼ Negative';
  return '◆ Neutral';
}

function formatDateShort(iso: string): string {
  try { return format(parseISO(iso), 'd MMM'); } catch { return iso; }
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function LeadAdvisorDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const userId = user?.id ?? '';

  const kpis      = useLeadAdvisorKPIs(userId);
  const engs      = useMyEngagements(userId);
  const escalation = useEscalationInbox();
  const touchpoints = useUpcomingTouchpoints();
  const updateStatus = useUpdateIntelStatus();

  const greeting = getGreeting();
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <LBDPageHeader
        eyebrow="LEAD ADVISOR"
        title={`${greeting}, ${firstName}`}
        subtitle="Portfolio oversight, escalations, and this week's schedule."
      />

      {/* ── ROW 1: KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LBDStatCard
          label="Active Engagements"
          value={kpis.isLoading ? '—' : (kpis.data?.activeEngagements ?? 0)}
          accentClass="gold"
          isLoading={kpis.isLoading}
        />
        <LBDStatCard
          label="Overdue Touchpoints"
          value={kpis.isLoading ? '—' : (kpis.data?.overdueCount ?? 0)}
          accentClass={kpis.data?.overdueCount ? 'danger' : 'success'}
          isLoading={kpis.isLoading}
        />
        <LBDStatCard
          label="Pending Actions"
          value={kpis.isLoading ? '—' : (kpis.data?.pendingActions ?? 0)}
          accentClass={kpis.data?.pendingActions ? 'danger' : 'success'}
          isLoading={kpis.isLoading}
        />
        <LBDStatCard
          label="Open Escalations"
          value={kpis.isLoading ? '—' : (kpis.data?.openEscalations ?? 0)}
          accentClass={kpis.data?.openEscalations ? 'danger' : 'info'}
          isLoading={kpis.isLoading}
        />
      </div>

      {/* ── ROW 2: Engagement Health Board ── */}
      <LBDCard title="My Portfolio" subtitle="Engagements where you are Lead Advisor" padding="none">
        <LBDDataTable<MyEngagementRow>
          columns={engagementColumns}
          data={engs.data ?? []}
          isLoading={engs.isLoading}
          searchable
          searchPlaceholder="Search engagements…"
          exportFilename="my-engagements"
          onRowClick={(row) => navigate(`/engagements/${row.id}`)}
          emptyMessage="No active engagements assigned to you."
        />
      </LBDCard>

      {/* ── ROW 3: Two columns — Escalation Inbox + Touchpoint Calendar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Escalation Inbox */}
        <LBDCard
          title="Escalation Inbox"
          subtitle="Urgent items requiring action"
          action={
            escalation.data?.length ? (
              <span className="font-mono text-[10px] text-amber-400 tracking-widest">
                {escalation.data.length} PENDING
              </span>
            ) : undefined
          }
        >
          {escalation.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-card-muted animate-pulse" />
              ))}
            </div>
          ) : !escalation.data?.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/60" />
              <p className="text-sm text-muted-foreground">No urgent items pending</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {escalation.data.map((item: EscalationItem) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {item.engagement_title}
                      </p>
                      <p className="text-sm font-medium text-foreground line-clamp-2 mt-0.5">
                        {item.headline}
                      </p>
                    </div>
                    <span className={`text-xs font-mono flex-none ${sentimentColor(item.sentiment_score)}`}>
                      {sentimentLabel(item.sentiment_score)}
                    </span>
                  </div>
                  {item.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {item.source_name && (
                      <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[100px]">
                        {item.source_name}
                      </span>
                    )}
                    <div className="flex-1" />
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-md bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                      onClick={() => updateStatus.mutate({ id: item.id, status: 'in_progress' })}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      ACK
                    </button>
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-md bg-muted/40 border border-border text-muted-foreground hover:border-muted transition-colors"
                      onClick={() => updateStatus.mutate({ id: item.id, status: 'monitor_only' })}
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="w-3 h-3" />
                      DISMISS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </LBDCard>

        {/* Touchpoint Calendar */}
        <LBDCard
          title="This Week's Schedule"
          subtitle="Cadence touchpoints Mon – Sun"
          action={
            <button
              className="text-[10px] font-mono text-accent hover:text-accent/70 tracking-widest flex items-center gap-1"
              onClick={() => navigate('/engagements')}
            >
              VIEW ALL <ArrowRight className="w-3 h-3" />
            </button>
          }
        >
          {touchpoints.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-lg bg-card-muted animate-pulse" />
              ))}
            </div>
          ) : !touchpoints.data?.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No touchpoints scheduled this week</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {touchpoints.data.map((t: TouchpointItem) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-accent/20 transition-colors"
                >
                  <div className="flex-none w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {t.engagement_title}
                    </p>
                    <p className="text-sm font-medium text-foreground truncate capitalize">
                      {t.touchpoint_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="text-xs font-mono text-accent">{formatDateShort(t.scheduled_date)}</p>
                    <LBDBadge variant="status" value={t.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </LBDCard>

      </div>
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
