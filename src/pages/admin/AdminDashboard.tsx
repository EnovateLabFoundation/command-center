/**
 * AdminDashboard  (/admin/dashboard)
 *
 * Super Admin Command Centre — dense, real-time overview of the entire LBD-SIP
 * platform state. Accessible only to super_admin role.
 *
 * Layout:
 *   ROW 1 — Portfolio KPI strip (4 LBDStatCard components)
 *   ROW 2 — Engagement Health Board (full-width LBDDataTable)
 *   ROW 3 — Team Activity Feed (60%) | Integration Health panel (40%)
 *   ROW 4 — User Management summary (50%) | Security Event Log (50%)
 *
 * All sections auto-refresh every 60 seconds via React Query refetchInterval.
 */

import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Zap,
  AlertTriangle,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Shield,
} from 'lucide-react';
import {
  LBDPageHeader,
  LBDCard,
  LBDBadge,
  LBDStatCard,
  LBDDataTable,
  LBDLoadingSkeleton,
  type ColumnDef,
} from '@/components/ui/lbd';
import {
  usePortfolioKPIs,
  useEngagementHealthBoard,
  useTeamActivityFeed,
  useIntegrationHealth,
  useUserManagementSummary,
  useSecurityEventLog,
  type EngagementHealthRow,
  type ActivityItem,
  type IntegrationRow,
  type UserSummaryRow,
  type SecurityEventRow,
} from '@/hooks/useAdminDashboard';

/* ─────────────────────────────────────────────
   Formatting helpers
───────────────────────────────────────────── */

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Maps audit action → a colour class for the feed */
function actionColor(action: string): string {
  switch (action) {
    case 'create': return 'text-green-400';
    case 'update': return 'text-accent';
    case 'delete': return 'text-destructive';
    case 'export': return 'text-blue-400';
    default:       return 'text-muted-foreground';
  }
}

/** Icon indicating integration sync health */
function SyncIcon({ status, isActive }: { status: string | null; isActive: boolean }) {
  if (!isActive) return <MinusCircle className="w-4 h-4 text-muted-foreground shrink-0" />;
  if (status === 'healthy')  return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
  if (status === 'error')    return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
  return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
}

/* ─────────────────────────────────────────────
   Column definitions
───────────────────────────────────────────── */

const healthBoardColumns: ColumnDef<EngagementHealthRow>[] = [
  {
    key: 'computed_rag',
    label: 'RAG',
    width: '70px',
    align: 'center',
    render: (_v, row) => (
      <LBDBadge variant="rag" value={row.computed_rag} />
    ),
    noExport: true,
  },
  {
    key: 'title',
    label: 'Engagement',
    sortable: true,
  },
  {
    key: 'client_name',
    label: 'Client',
    sortable: true,
  },
  {
    key: 'phase',
    label: 'Phase',
    width: '90px',
    align: 'center',
    render: (_v, row) => (
      <LBDBadge variant="phase" value={String(row.phase).replace('Phase ', '')} />
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: '100px',
    render: (_v, row) => (
      <LBDBadge variant="status" value={row.status} />
    ),
  },
  {
    key: 'lead_advisor',
    label: 'Lead Advisor',
    sortable: true,
  },
  {
    key: 'latest_intel_days',
    label: 'Intel Age',
    width: '100px',
    align: 'right',
    render: (_v, row) => {
      const days = row.latest_intel_days as number | null;
      if (days === null) {
        return <span className="text-muted-foreground text-xs italic">No intel</span>;
      }
      const colour =
        days > 14 ? 'text-destructive' :
        days > 7  ? 'text-amber-400' :
                    'text-green-400';
      return <span className={`text-xs font-mono ${colour}`}>{days}d</span>;
    },
  },
];

const userColumns: ColumnDef<UserSummaryRow>[] = [
  {
    key: 'full_name',
    label: 'Name',
    sortable: true,
  },
  {
    key: 'email',
    label: 'Email',
    render: (_v, row) => (
      <span className="font-mono text-xs text-muted-foreground">{row.email}</span>
    ),
  },
  {
    key: 'role',
    label: 'Role',
    render: (_v, row) => (
      <LBDBadge variant="role" value={row.role} />
    ),
  },
  {
    key: 'mfa_enabled',
    label: 'MFA',
    width: '60px',
    align: 'center',
    render: (_v, row) =>
      row.mfa_enabled
        ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
        : <XCircle className="w-4 h-4 text-amber-400 mx-auto" />,
    noExport: true,
  },
  {
    key: 'is_active',
    label: 'Status',
    width: '90px',
    render: (_v, row) => (
      <LBDBadge variant="status" value={row.is_active ? 'active' : 'inactive'} />
    ),
  },
  {
    key: 'last_login',
    label: 'Last Login',
    render: (_v, row) =>
      row.last_login
        ? formatRelativeTime(row.last_login as string)
        : <span className="text-muted-foreground">—</span>,
  },
];

const securityColumns: ColumnDef<SecurityEventRow>[] = [
  {
    key: 'action',
    label: 'Event',
    width: '90px',
    render: (_v, row) => (
      <span className={`text-xs font-mono uppercase font-semibold ${actionColor(row.action)}`}>
        {row.action}
      </span>
    ),
  },
  {
    key: 'user_name',
    label: 'User',
    sortable: true,
  },
  {
    key: 'ip_address',
    label: 'IP Address',
    render: (_v, row) => (
      <span className="font-mono text-xs text-muted-foreground">
        {(row.ip_address as string | null) ?? '—'}
      </span>
    ),
  },
  {
    key: 'table_name',
    label: 'Target',
    render: (_v, row) => (
      <span className="font-mono text-xs text-accent/70">{row.table_name}</span>
    ),
  },
  {
    key: 'created_at',
    label: 'When',
    width: '90px',
    render: (_v, row) => (
      <span className="text-xs text-muted-foreground">
        {formatRelativeTime(row.created_at as string)}
      </span>
    ),
  },
];

/* ─────────────────────────────────────────────
   AdminDashboard component
───────────────────────────────────────────── */

export default function AdminDashboard() {
  const navigate = useNavigate();

  const kpis        = usePortfolioKPIs();
  const healthBoard = useEngagementHealthBoard();
  const activity    = useTeamActivityFeed();
  const integs      = useIntegrationHealth();
  const users       = useUserManagementSummary();
  const security    = useSecurityEventLog();

  // Derive integration health accent dynamically
  const healthPct = kpis.data?.integrationHealthPct ?? 100;
  const integAccent =
    healthPct < 70 ? 'danger' :
    healthPct < 90 ? 'gold'   :
                     'success';

  return (
    <div className="p-6 space-y-6">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <LBDPageHeader
        eyebrow="SUPER ADMIN"
        title="Command Dashboard"
        subtitle="Real-time platform intelligence — portfolio status, team activity, and system health."
        actions={
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            <span className="text-[11px] font-mono tracking-wide">
              Auto-refresh every 60s
            </span>
          </div>
        }
      />

      {/* ── ROW 1: Portfolio KPI strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LBDStatCard
          label="Active Engagements"
          value={kpis.isLoading ? '—' : (kpis.data?.activeEngagements ?? 0)}
          subLabel="across all clients"
          accentClass="gold"
          loading={kpis.isLoading}
          onClick={() => navigate('/engagements')}
        />
        <LBDStatCard
          label="Total Clients"
          value={kpis.isLoading ? '—' : (kpis.data?.totalClients ?? 0)}
          subLabel="active accounts"
          accentClass="info"
          loading={kpis.isLoading}
        />
        <LBDStatCard
          label="Integration Health"
          value={kpis.isLoading ? '—' : `${healthPct}%`}
          subLabel="platforms healthy"
          accentClass={integAccent}
          loading={kpis.isLoading}
          onClick={() => navigate('/admin/integrations')}
        />
        <LBDStatCard
          label="Open Escalations"
          value={kpis.isLoading ? '—' : (kpis.data?.openEscalations ?? 0)}
          subLabel="require action"
          accentClass={(kpis.data?.openEscalations ?? 0) > 0 ? 'danger' : 'success'}
          loading={kpis.isLoading}
        />
      </div>

      {/* ── ROW 2: Engagement Health Board ──────────────────────────── */}
      <LBDCard
        title="Engagement Health Board"
        padding="none"
        action={
          <button
            onClick={() => navigate('/engagements')}
            className="text-xs text-accent hover:text-accent/70 transition-colors"
          >
            View All →
          </button>
        }
      >
        <LBDDataTable
          columns={healthBoardColumns}
          data={healthBoard.data ?? []}
          rowKey={row => row.id}
          isLoading={healthBoard.isLoading}
          onRowClick={row => navigate(`/engagements/${row.id}`)}
          enableSearch
          searchPlaceholder="Search engagements…"
          enablePagination
          defaultPageSize={10}
          enableExport
          exportFilename="engagement-health-board"
          stickyHeader
          emptyTitle="No active engagements"
          emptyDescription="Active and paused engagements will appear here."
          emptyIcon={<Briefcase className="w-8 h-8" />}
        />
      </LBDCard>

      {/* ── ROW 3: Activity Feed + Integration Health ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Team Activity Feed — 60% (col-span-3) */}
        <div className="lg:col-span-3">
          <LBDCard
            title="Team Activity Feed"
            padding="none"
            action={
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
                LAST 20 EVENTS
              </span>
            }
          >
            {activity.isLoading ? (
              <LBDLoadingSkeleton variant="list" count={6} />
            ) : (activity.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Activity className="w-6 h-6 opacity-40" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-border">
                {(activity.data ?? []).map((item: ActivityItem) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <Activity className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">
                        <span className="font-medium">{item.user_name}</span>
                        {' · '}
                        <span className={`font-mono font-semibold ${actionColor(item.action)}`}>
                          {item.action}
                        </span>
                        {' '}
                        <span className="text-muted-foreground">on</span>
                        {' '}
                        <span className="font-mono text-accent/80 text-[11px]">{item.table_name}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono pt-0.5">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </LBDCard>
        </div>

        {/* Integration Health Panel — 40% (col-span-2) */}
        <div className="lg:col-span-2">
          <LBDCard
            title="Integration Health"
            padding="none"
            action={
              <button
                onClick={() => navigate('/admin/integrations')}
                className="text-xs text-accent hover:text-accent/70 transition-colors"
              >
                Configure →
              </button>
            }
          >
            {integs.isLoading ? (
              <LBDLoadingSkeleton variant="list" count={4} />
            ) : (integs.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Zap className="w-6 h-6 opacity-40" />
                <p className="text-sm">No integrations configured</p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-border">
                {(integs.data ?? []).map((int: IntegrationRow) => (
                  <li
                    key={int.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <Zap className="w-4 h-4 text-accent/60 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {int.platform_name}
                      </p>
                      {int.last_sync_at && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {formatRelativeTime(int.last_sync_at as string)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SyncIcon
                        status={int.sync_status as string | null}
                        isActive={int.is_active as boolean}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground capitalize">
                        {int.is_active
                          ? ((int.sync_status as string | null) ?? 'unknown')
                          : 'disabled'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </LBDCard>
        </div>
      </div>

      {/* ── ROW 4: User Summary + Security Event Log ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* User Management Summary */}
        <LBDCard
          title="User Management"
          padding="none"
          action={
            <button
              onClick={() => navigate('/admin/users')}
              className="text-xs text-accent hover:text-accent/70 transition-colors"
            >
              Manage →
            </button>
          }
        >
          <LBDDataTable
            columns={userColumns}
            data={users.data ?? []}
            rowKey={row => row.id}
            isLoading={users.isLoading}
            enableSearch
            searchPlaceholder="Search users…"
            enablePagination
            defaultPageSize={8}
            emptyTitle="No users found"
            emptyDescription="Platform users will appear here."
            emptyIcon={<Users className="w-8 h-8" />}
          />
        </LBDCard>

        {/* Security Event Log */}
        <LBDCard
          title="Security Event Log"
          padding="none"
          action={
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
                LAST 10 EVENTS
              </span>
            </div>
          }
        >
          {security.isLoading ? (
            <LBDLoadingSkeleton variant="table" rows={5} />
          ) : (security.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <AlertTriangle className="w-6 h-6 opacity-40" />
              <p className="text-sm">No security events recorded</p>
            </div>
          ) : (
            <LBDDataTable
              columns={securityColumns}
              data={security.data ?? []}
              rowKey={row => row.id}
              isLoading={security.isLoading}
              emptyTitle="No security events"
              emptyDescription="Auth and sensitive actions appear here."
              emptyIcon={<Shield className="w-8 h-8" />}
            />
          )}
        </LBDCard>
      </div>

    </div>
  );
}
