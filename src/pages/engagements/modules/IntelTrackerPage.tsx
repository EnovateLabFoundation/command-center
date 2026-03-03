/**
 * IntelTrackerPage
 *
 * Intelligence & Sentiment Tracker module.
 * Route: /engagements/:id/intel-tracker
 *
 * Tabs:
 *  • Intelligence Log — searchable, filterable log table with expandable rows
 *  • Analytics       — 5 Recharts charts (sentiment trend, heatmap, theme volume, pie, combo)
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus, RefreshCw, List, BarChart2,
} from 'lucide-react';
import { LBDPageHeader } from '@/components/ui/lbd';
import { toast } from '@/components/ui/lbd';
import { cn } from '@/lib/utils';
import {
  useIntelList,
  useAddIntelItem,
  useUpdateIntelItem,
  useDeleteIntelItem,
  useEscalateItem,
  type IntelItem,
  type ActionStatus,
} from '@/hooks/useIntelTracker';

import KPIStrip       from '@/pages/engagements/intel-tracker/KPIStrip';
import IntelFilters, {
  type IntelFilterState,
  DEFAULT_FILTERS,
} from '@/pages/engagements/intel-tracker/IntelFilters';
import IntelLogTable  from '@/pages/engagements/intel-tracker/IntelLogTable';
import IntelDrawer, { type IntelFormValues } from '@/pages/engagements/intel-tracker/IntelDrawer';
import IntelAnalytics from '@/pages/engagements/intel-tracker/IntelAnalytics';

/* ─────────────────────────────────────────────
   Tabs
───────────────────────────────────────────── */

type TabId = 'log' | 'analytics';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'log',       label: 'Intelligence Log', icon: List      },
  { id: 'analytics', label: 'Analytics',         icon: BarChart2 },
];

/* ─────────────────────────────────────────────
   Filter logic
───────────────────────────────────────────── */

function applyFilters(items: IntelItem[], f: IntelFilterState): IntelItem[] {
  return items.filter((item) => {
    if (f.dateFrom && item.date_logged < f.dateFrom) return false;
    if (f.dateTo   && item.date_logged > f.dateTo)   return false;
    if (f.sourceType     && item.source_type      !== f.sourceType)     return false;
    if (f.actionStatus   && item.action_status    !== f.actionStatus)   return false;
    if (f.narrativeTheme && item.narrative_theme  !== f.narrativeTheme) return false;
    if (f.urgentOnly && !item.is_urgent) return false;

    if (f.sentimentRange !== 'all') {
      const s = item.sentiment_score ?? 0;
      if (f.sentimentRange === 'positive' && s <= 0.3)  return false;
      if (f.sentimentRange === 'neutral'  && (s < -0.5 || s > 0.3)) return false;
      if (f.sentimentRange === 'negative' && s >= -0.5) return false;
    }

    return true;
  });
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function IntelTrackerPage() {
  const { id: engagementId } = useParams<{ id: string }>();

  /* ── Data ─────────────────────────────────────────────────────── */
  const {
    data: items = [],
    isLoading,
    dataUpdatedAt,
    refetch,
    isFetching,
  } = useIntelList(engagementId);

  const addMutation      = useAddIntelItem(engagementId ?? '');
  const updateMutation   = useUpdateIntelItem(engagementId ?? '');
  const deleteMutation   = useDeleteIntelItem(engagementId ?? '');
  const escalateMutation = useEscalateItem(engagementId ?? '');

  /* ── UI state ─────────────────────────────────────────────────── */
  const [activeTab,    setActiveTab]    = useState<TabId>('log');
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<IntelItem | null>(null);
  const [filters,      setFilters]      = useState<IntelFilterState>(DEFAULT_FILTERS);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  /* ── Available themes (derived from existing items) ──────────── */
  const availableThemes = useMemo(() => {
    const themes = new Set<string>();
    items.forEach((i) => { if (i.narrative_theme) themes.add(i.narrative_theme); });
    return Array.from(themes).sort();
  }, [items]);

  /* ── Filtered items ───────────────────────────────────────────── */
  const filteredItems = useMemo(() => applyFilters(items, filters), [items, filters]);

  /* ── Drawer handlers ──────────────────────────────────────────── */
  const openAdd     = useCallback(() => { setEditTarget(null); setDrawerOpen(true); }, []);
  const closeDrawer = useCallback(() => { setDrawerOpen(false); setEditTarget(null); }, []);

  const handleSave = useCallback(async (values: IntelFormValues) => {
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...values });
        toast.success('Item updated', 'Intelligence item has been updated.');
      } else {
        await addMutation.mutateAsync(values);
        toast.success('Item logged', 'Intelligence item has been added to the tracker.');
      }
      closeDrawer();
    } catch (err: unknown) {
      toast.error('Save failed', (err as Error).message);
    }
  }, [editTarget, addMutation, updateMutation, closeDrawer]);

  /* ── Status update (inline) ───────────────────────────────────── */
  const handleStatusChange = useCallback(async (id: string, status: ActionStatus) => {
    try {
      await updateMutation.mutateAsync({ id, action_status: status });
      toast.success('Status updated');
    } catch (err: unknown) {
      toast.error('Update failed', (err as Error).message);
    }
  }, [updateMutation]);

  /* ── Escalate ─────────────────────────────────────────────────── */
  const handleEscalate = useCallback(async (item: IntelItem) => {
    setEscalatingId(item.id);
    try {
      await escalateMutation.mutateAsync({ itemId: item.id, headline: item.headline });
      toast.success(
        'Item escalated',
        'Lead Advisor has been notified of this urgent intelligence item.',
      );
    } catch (err: unknown) {
      toast.error('Escalation failed', (err as Error).message);
    } finally {
      setEscalatingId(null);
    }
  }, [escalateMutation]);

  /* ── Delete ───────────────────────────────────────────────────── */
  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Item deleted', 'Intelligence item has been removed.');
    } catch (err: unknown) {
      toast.error('Delete failed', (err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }, [deleteMutation]);

  /* ── Last updated label ───────────────────────────────────────── */
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : null;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">

      {/* ── Page header ─────────────────────────────────────────── */}
      <LBDPageHeader
        eyebrow="INTELLIGENCE"
        title="Intelligence & Sentiment Tracker"
        description={
          lastUpdated
            ? `Live intelligence feed — monitor, tag, and escalate · Last updated ${lastUpdated}`
            : 'Monitor, score, and escalate intelligence items across the engagement.'
        }
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
              title="Refresh intel feed"
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
              Add Intel Item
            </button>
          </div>
        }
      />

      {/* ── KPI strip ───────────────────────────────────────────── */}
      <KPIStrip items={items} />

      {/* ── Sub-tab navigation ──────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border/40 -mb-2">
        {TABS.map((tab) => {
          const Icon     = tab.icon;
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

      {/* ── Intelligence Log tab ────────────────────────────────── */}
      {activeTab === 'log' && (
        <div className="space-y-4 mt-4">
          <IntelFilters
            filters={filters}
            onChange={setFilters}
            availableThemes={availableThemes}
          />
          <IntelLogTable
            items={filteredItems}
            isLoading={isLoading}
            onStatusChange={handleStatusChange}
            onEscalate={handleEscalate}
            onDelete={handleDelete}
            escalatingId={escalatingId}
            deletingId={deletingId}
          />
        </div>
      )}

      {/* ── Analytics tab ───────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="mt-4">
          <IntelAnalytics items={items} />
        </div>
      )}

      {/* ── Drawer ──────────────────────────────────────────────── */}
      <IntelDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        initial={editTarget}
        onSave={handleSave}
        isSaving={addMutation.isPending || updateMutation.isPending}
        availableThemes={availableThemes}
      />

    </div>
  );
}
