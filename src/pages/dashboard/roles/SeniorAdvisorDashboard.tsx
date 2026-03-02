/**
 * SeniorAdvisorDashboard
 *
 * Four sections:
 *  1. KPI summary strip
 *  2. Alignment Distribution Donut (Recharts PieChart)
 *  3. Overdue Critical Stakeholders table
 *  4. Two columns: High-Risk Scenarios | Alliance Gap Alerts
 */
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
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
  useAlignmentDistribution,
  useOverdueStakeholders,
  useHighRiskScenarios,
  useAllianceGaps,
  type OverdueStakeholder,
  type ScenarioRiskRow,
  type AllianceGapRow,
} from '@/hooks/useSeniorAdvisorDashboard';
import { ShieldAlert, Users, AlertTriangle } from 'lucide-react';

/* ─────────────────────────────────────────────
   Alignment chart colours
───────────────────────────────────────────── */

const ALIGNMENT_COLORS: Record<string, string> = {
  hostile:    '#ef4444',
  neutral:    '#f59e0b',
  supportive: '#22c55e',
  champion:   '#3b82f6',
};

/* ─────────────────────────────────────────────
   Column definitions
───────────────────────────────────────────── */

const overdueColumns: ColumnDef<OverdueStakeholder>[] = [
  {
    key: 'name',
    label: 'Stakeholder',
    sortable: true,
    render: (_v, row) => (
      <span className="font-medium text-foreground">{row.name}</span>
    ),
  },
  {
    key: 'role_position',
    label: 'Role',
    render: (_v, row) => (
      <span className="text-xs text-muted-foreground">{row.role_position ?? '—'}</span>
    ),
  },
  {
    key: 'alignment',
    label: 'Alignment',
    sortable: true,
    render: (_v, row) => <LBDBadge variant="alignment" value={row.alignment} />,
  },
  {
    key: 'days_overdue',
    label: 'Days Since Contact',
    sortable: true,
    render: (_v, row) => {
      const d = row.days_overdue;
      const cls = d > 60 ? 'text-red-400' : d > 30 ? 'text-amber-400' : 'text-emerald-400';
      return (
        <span className={`font-mono text-xs ${cls}`}>
          {d >= 999 ? 'Never' : `${d}d`}
        </span>
      );
    },
  },
  {
    key: 'engagement_title',
    label: 'Engagement',
    render: (_v, row) => (
      <span className="text-xs text-muted-foreground truncate max-w-[160px] block">{row.engagement_title}</span>
    ),
  },
];

const scenarioColumns: ColumnDef<ScenarioRiskRow>[] = [
  {
    key: 'name',
    label: 'Scenario',
    sortable: true,
    render: (_v, row) => (
      <span className="font-medium text-foreground line-clamp-2">{row.name}</span>
    ),
  },
  {
    key: 'probability',
    label: 'Prob',
    render: (_v, row) => <LBDBadge variant="priority" value={row.probability} />,
  },
  {
    key: 'impact_score',
    label: 'Impact',
    sortable: true,
    render: (_v, row) => {
      const s = row.impact_score ?? 0;
      const cls = s >= 8 ? 'text-red-400' : s >= 5 ? 'text-amber-400' : 'text-muted-foreground';
      return <span className={`font-mono text-xs ${cls}`}>{s ?? '—'}/10</span>;
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

const gapColumns: ColumnDef<AllianceGapRow>[] = [
  {
    key: 'name',
    label: 'Stakeholder',
    sortable: true,
    render: (_v, row) => (
      <span className="font-medium text-foreground">{row.name}</span>
    ),
  },
  {
    key: 'alignment',
    label: 'Alignment',
    render: (_v, row) => <LBDBadge variant="alignment" value={row.alignment} />,
  },
  {
    key: 'influence_score',
    label: 'Influence',
    sortable: true,
    render: (_v, row) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.influence_score ?? '—'}/10
      </span>
    ),
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
   Component
───────────────────────────────────────────── */

export default function SeniorAdvisorDashboard() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();

  const alignDist  = useAlignmentDistribution();
  const overdue    = useOverdueStakeholders();
  const scenarios  = useHighRiskScenarios();
  const gaps       = useAllianceGaps();

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const greeting  = getGreeting();

  // Derive KPIs from loaded data
  const totalStakeholders = alignDist.data?.reduce((a, b) => a + b.count, 0) ?? 0;
  const overdueCount      = overdue.data?.length ?? 0;
  const scenarioCount     = scenarios.data?.length ?? 0;
  const gapCount          = gaps.data?.length ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <LBDPageHeader
        eyebrow="SENIOR ADVISOR"
        title={`${greeting}, ${firstName}`}
        subtitle="Stakeholder universe, risk register, and alliance intelligence."
      />

      {/* ── ROW 1: KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LBDStatCard
          label="Total Stakeholders"
          value={alignDist.isLoading ? '—' : totalStakeholders}
          accentClass="gold"
          isLoading={alignDist.isLoading}
        />
        <LBDStatCard
          label="Overdue (Critical)"
          value={overdue.isLoading ? '—' : overdueCount}
          accentClass={overdueCount > 0 ? 'danger' : 'success'}
          isLoading={overdue.isLoading}
        />
        <LBDStatCard
          label="High-Risk Scenarios"
          value={scenarios.isLoading ? '—' : scenarioCount}
          accentClass={scenarioCount > 0 ? 'danger' : 'success'}
          isLoading={scenarios.isLoading}
        />
        <LBDStatCard
          label="Alliance Gaps"
          value={gaps.isLoading ? '—' : gapCount}
          accentClass={gapCount > 0 ? 'danger' : 'info'}
          isLoading={gaps.isLoading}
        />
      </div>

      {/* ── ROW 2: Donut + Overdue Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Alignment Donut */}
        <LBDCard title="Stakeholder Alignment" subtitle="Across all assigned engagements">
          {alignDist.isLoading ? (
            <div className="h-48 bg-card-muted animate-pulse rounded-xl" />
          ) : !alignDist.data?.length ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">No stakeholder data</p>
              </div>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alignDist.data}
                    dataKey="count"
                    nameKey="alignment"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="78%"
                    strokeWidth={2}
                    stroke="rgba(0,0,0,0.3)"
                  >
                    {alignDist.data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ALIGNMENT_COLORS[entry.alignment] ?? '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#111118',
                      border: '1px solid #2d2d3a',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                    itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                    formatter={(value: number, name: string) => [value, name.toUpperCase()]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {value}
                      </span>
                    )}
                    iconSize={8}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </LBDCard>

        {/* Overdue Stakeholders */}
        <div className="lg:col-span-2">
          <LBDCard
            title="Overdue — Critical Stakeholders"
            subtitle="strategic_priority = critical, last contact > 30 days"
            padding="none"
          >
            <LBDDataTable<OverdueStakeholder>
              columns={overdueColumns}
              data={overdue.data ?? []}
              isLoading={overdue.isLoading}
              searchable
              searchPlaceholder="Search stakeholders…"
              onRowClick={(row) => navigate(`/engagements/${row.engagement_id}`)}
              emptyMessage="All critical stakeholders contacted recently."
            />
          </LBDCard>
        </div>

      </div>

      {/* ── ROW 3: Scenarios + Alliance Gaps ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* High-Risk Scenarios */}
        <LBDCard
          title="High-Risk Scenario Register"
          subtitle="probability = high OR impact ≥ 8"
          padding="none"
          action={
            scenarioCount > 0 ? (
              <span className="font-mono text-[10px] text-red-400 tracking-widest flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                {scenarioCount} ACTIVE
              </span>
            ) : undefined
          }
        >
          <LBDDataTable<ScenarioRiskRow>
            columns={scenarioColumns}
            data={scenarios.data ?? []}
            isLoading={scenarios.isLoading}
            onRowClick={(row) => navigate(`/engagements/${row.engagement_id}`)}
            emptyMessage="No high-risk scenarios at present."
          />
        </LBDCard>

        {/* Alliance Gaps */}
        <LBDCard
          title="Alliance Gap Alerts"
          subtitle="Critical stakeholders with hostile or neutral alignment"
          padding="none"
          action={
            gapCount > 0 ? (
              <span className="font-mono text-[10px] text-amber-400 tracking-widest flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {gapCount} GAPS
              </span>
            ) : undefined
          }
        >
          <LBDDataTable<AllianceGapRow>
            columns={gapColumns}
            data={gaps.data ?? []}
            isLoading={gaps.isLoading}
            onRowClick={(row) => navigate(`/engagements/${row.engagement_id}`)}
            emptyMessage="No critical alliance gaps identified."
          />
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
