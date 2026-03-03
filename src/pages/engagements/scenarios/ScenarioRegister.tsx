/**
 * ScenarioRegister
 *
 * KPI strip + DataTable register of all scenarios for the engagement.
 * Includes trigger/resolve actions with confirmation dialogs.
 */

import { useMemo, useState, useCallback } from 'react';
import {
  Target, AlertTriangle, Zap, BarChart3, Edit, Eye, Play, CheckCircle,
} from 'lucide-react';
import { LBDStatCard } from '@/components/ui/lbd/LBDStatCard';
import { LBDCard } from '@/components/ui/lbd/LBDCard';
import { LBDDataTable, type ColumnDef } from '@/components/ui/lbd/LBDDataTable';
import { LBDConfirmDialog } from '@/components/ui/lbd/LBDConfirmDialog';
import { cn } from '@/lib/utils';
import {
  type Scenario,
  PROBABILITY_CONFIG,
  STATUS_CONFIG,
} from '@/hooks/useScenarios';

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface ScenarioRegisterProps {
  scenarios: Scenario[];
  isLoading: boolean;
  onEdit: (s: Scenario) => void;
  onTrigger: (s: Scenario) => Promise<void>;
  onResolve: (s: Scenario) => Promise<void>;
}

/* ─────────────────────────────────────────────
   Impact bar helper
───────────────────────────────────────────── */

function ImpactBar({ score }: { score: number | null }) {
  const val = score ?? 0;
  const pct = (val / 10) * 100;
  // Colour gradient: green → amber → red
  const colour =
    val <= 3 ? 'bg-emerald-500' : val <= 6 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', colour)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-foreground">{val}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function ScenarioRegister({
  scenarios,
  isLoading,
  onEdit,
  onTrigger,
  onResolve,
}: ScenarioRegisterProps) {
  const [confirmTarget, setConfirmTarget] = useState<{ action: 'trigger' | 'resolve'; scenario: Scenario } | null>(null);
  const [confirming, setConfirming] = useState(false);

  /* ── KPIs ──────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const total = scenarios.length;
    const highProb = scenarios.filter((s) => s.probability === 'high').length;
    const triggered = scenarios.filter((s) => s.status === 'triggered').length;
    const avgImpact = total > 0
      ? (scenarios.reduce((sum, s) => sum + (s.impact_score ?? 0), 0) / total).toFixed(1)
      : '—';
    return { total, highProb, triggered, avgImpact };
  }, [scenarios]);

  /* ── Confirm handler ──────────────────────────────────────────── */
  const handleConfirm = useCallback(async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      if (confirmTarget.action === 'trigger') {
        await onTrigger(confirmTarget.scenario);
      } else {
        await onResolve(confirmTarget.scenario);
      }
    } finally {
      setConfirming(false);
      setConfirmTarget(null);
    }
  }, [confirmTarget, onTrigger, onResolve]);

  /* ── Table columns ─────────────────────────────────────────────── */
  const columns: ColumnDef<Scenario>[] = useMemo(() => [
    {
      key: 'name',
      label: 'SCENARIO',
      sortable: true,
      render: (_v, row) => (
        <span className={cn('font-medium', row.status === 'triggered' && 'text-red-400')}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'key_driver',
      label: 'KEY DRIVER',
      sortable: true,
      render: (_v, row) => (
        <span className="text-muted-foreground text-xs max-w-[180px] truncate block">
          {row.key_driver ?? '—'}
        </span>
      ),
    },
    {
      key: 'probability',
      label: 'PROBABILITY',
      sortable: true,
      render: (_v, row) => {
        const conf = PROBABILITY_CONFIG[row.probability ?? 'medium'];
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border', conf.color)}>
            {conf.label}
          </span>
        );
      },
    },
    {
      key: 'impact_score',
      label: 'IMPACT',
      sortable: true,
      render: (_v, row) => <ImpactBar score={row.impact_score} />,
    },
    {
      key: 'time_horizon_months',
      label: 'HORIZON',
      sortable: true,
      align: 'center',
      render: (_v, row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.time_horizon_months ? `${row.time_horizon_months}mo` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (_v, row) => {
        const conf = STATUS_CONFIG[row.status];
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border', conf.color)}>
            {conf.label}
          </span>
        );
      },
    },
    {
      key: 'updated_at',
      label: 'UPDATED',
      sortable: true,
      render: (_v, row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      noExport: true,
      render: (_v, row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(row); }}
            className="p-1.5 rounded hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          {row.status !== 'triggered' && row.status !== 'resolved' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmTarget({ action: 'trigger', scenario: row }); }}
              className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
              title="Trigger"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          )}
          {row.status === 'triggered' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmTarget({ action: 'resolve', scenario: row }); }}
              className="p-1.5 rounded hover:bg-emerald-500/10 transition-colors text-muted-foreground hover:text-emerald-400"
              title="Resolve"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ], [onEdit]);

  return (
    <div className="space-y-6">
      {/* ── KPI strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LBDStatCard label="Total Scenarios" value={kpis.total} />
        <LBDStatCard
          label="High Probability"
          value={kpis.highProb}
          accentClass={kpis.highProb > 0 ? 'danger' : undefined}
        />
        <LBDStatCard
          label="Triggered"
          value={kpis.triggered}
          accentClass={kpis.triggered > 0 ? 'danger' : undefined}
        />
        <LBDStatCard label="Avg Impact" value={kpis.avgImpact} />
      </div>

      {/* ── Data table ──────────────────────────────────────────── */}
      <LBDDataTable
        columns={columns}
        data={scenarios}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        enableSearch
        searchPlaceholder="Search scenarios…"
        enableExport
        exportFilename="scenarios-register"
        emptyTitle="No scenarios yet"
        emptyDescription="Create your first strategic scenario to begin planning."
        emptyIcon={<Target className="w-8 h-8" />}
      />

      {/* ── Confirm dialogs ─────────────────────────────────────── */}
      <LBDConfirmDialog
        open={!!confirmTarget}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        loading={confirming}
        variant={confirmTarget?.action === 'trigger' ? 'danger' : 'info'}
        title={
          confirmTarget?.action === 'trigger'
            ? `Trigger "${confirmTarget.scenario.name}"?`
            : `Resolve "${confirmTarget?.scenario.name ?? ''}"?`
        }
        description={
          confirmTarget?.action === 'trigger'
            ? 'This will activate the response protocol and notify the Lead Advisor.'
            : 'Mark this scenario as resolved. It can be re-activated if needed.'
        }
        confirmLabel={confirmTarget?.action === 'trigger' ? 'Trigger Scenario' : 'Resolve'}
      />
    </div>
  );
}
