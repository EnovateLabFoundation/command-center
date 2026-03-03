/**
 * ScenariosPage
 *
 * Scenario Planning Matrix module.
 * Route: /engagements/:id/scenarios
 *
 * Three views:
 *  • Scenario Register — KPI strip + data table with trigger/resolve actions
 *  • Risk Matrix       — 3×3 probability × impact grid, exportable to JPEG
 *  • Decision Timeline — horizontal timeline + decision timing framework
 *
 * Real-time trigger monitoring via intel_items subscription.
 */

import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, RefreshCw, List, Grid3X3, Clock } from 'lucide-react';
import { LBDPageHeader } from '@/components/ui/lbd';
import { toast } from '@/components/ui/lbd';
import { cn } from '@/lib/utils';
import {
  useScenarioList,
  useAddScenario,
  useUpdateScenario,
  useTriggerScenario,
  useResolveScenario,
  type Scenario,
} from '@/hooks/useScenarios';

import ScenarioRegister from '@/pages/engagements/scenarios/ScenarioRegister';
import RiskMatrixView from '@/pages/engagements/scenarios/RiskMatrixView';
import DecisionTimeline from '@/pages/engagements/scenarios/DecisionTimeline';
import ScenarioDrawer, { type ScenarioFormValues } from '@/pages/engagements/scenarios/ScenarioDrawer';
import TriggerMonitor from '@/pages/engagements/scenarios/TriggerMonitor';

/* ─────────────────────────────────────────────
   Tab config
───────────────────────────────────────────── */

type TabId = 'register' | 'matrix' | 'timeline';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'register', label: 'Scenario Register', icon: List },
  { id: 'matrix',   label: 'Risk Matrix',       icon: Grid3X3 },
  { id: 'timeline', label: 'Decision Timeline',  icon: Clock },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function ScenariosPage() {
  const { id: engagementId } = useParams<{ id: string }>();

  /* ── Data ──────────────────────────────────────────────────────── */
  const {
    data: scenarios = [],
    isLoading,
    refetch,
    isFetching,
  } = useScenarioList(engagementId);

  const addMutation     = useAddScenario(engagementId ?? '');
  const updateMutation  = useUpdateScenario(engagementId ?? '');
  const triggerMutation = useTriggerScenario(engagementId ?? '');
  const resolveMutation = useResolveScenario(engagementId ?? '');

  /* ── UI state ─────────────────────────────────────────────────── */
  const [activeTab, setActiveTab]   = useState<TabId>('register');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Scenario | null>(null);

  /* ── Drawer handlers ──────────────────────────────────────────── */
  const openAdd = useCallback(() => {
    setEditTarget(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((s: Scenario) => {
    setEditTarget(s);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditTarget(null);
  }, []);

  const handleSave = useCallback(async (values: ScenarioFormValues) => {
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...values });
        toast.success('Scenario updated');
      } else {
        await addMutation.mutateAsync(values as any);
        toast.success('Scenario created');
      }
      closeDrawer();
    } catch (err: unknown) {
      toast.error('Save failed', (err as Error).message);
    }
  }, [editTarget, addMutation, updateMutation, closeDrawer]);

  /* ── Trigger / resolve ────────────────────────────────────────── */
  const handleTrigger = useCallback(async (s: Scenario) => {
    try {
      await triggerMutation.mutateAsync({ id: s.id, name: s.name });
      toast.success('Scenario triggered', `"${s.name}" response protocol activated.`);
    } catch (err: unknown) {
      toast.error('Trigger failed', (err as Error).message);
    }
  }, [triggerMutation]);

  const handleResolve = useCallback(async (s: Scenario) => {
    try {
      await resolveMutation.mutateAsync(s.id);
      toast.success('Scenario resolved');
    } catch (err: unknown) {
      toast.error('Resolve failed', (err as Error).message);
    }
  }, [resolveMutation]);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">
      {/* ── Page header ─────────────────────────────────────────── */}
      <LBDPageHeader
        eyebrow="INTELLIGENCE"
        title="Scenario Planning Matrix"
        description="Model possible futures, assess risk, and prepare strategic responses."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                'border border-border/60 text-muted-foreground/60 hover:text-foreground',
                'hover:border-border transition-colors',
                isFetching && 'opacity-50',
              )}
              title="Refresh scenarios"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </button>
            <button
              type="button"
              onClick={openAdd}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold',
                'bg-accent text-black hover:bg-accent/90 transition-colors',
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Scenario
            </button>
          </div>
        }
      />

      {/* ── Real-time trigger monitor ───────────────────────────── */}
      {engagementId && (
        <TriggerMonitor
          engagementId={engagementId}
          scenarios={scenarios}
          onViewScenario={(scenarioId) => {
            const s = scenarios.find((sc) => sc.id === scenarioId);
            if (s) openEdit(s);
          }}
        />
      )}

      {/* ── Sub-tab navigation ──────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border/40 -mb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground/60 hover:text-foreground',
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      {activeTab === 'register' && (
        <div className="mt-4">
          <ScenarioRegister
            scenarios={scenarios}
            isLoading={isLoading}
            onEdit={openEdit}
            onTrigger={handleTrigger}
            onResolve={handleResolve}
          />
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="mt-4">
          <RiskMatrixView scenarios={scenarios} />
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="mt-4">
          <DecisionTimeline scenarios={scenarios} />
        </div>
      )}

      {/* ── Drawer ──────────────────────────────────────────────── */}
      <ScenarioDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        initial={editTarget}
        onSave={handleSave}
        isSaving={addMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
