/**
 * PowerMapPage
 *
 * Power & Stakeholder Intelligence Map module.
 * Route: /engagements/:id/power-map
 *
 * Two sub-tabs:
 *  • Registry View  — searchable/filterable LBDDataTable with full CRUD
 *  • Network Visualisation — React-Leaflet geographic map + node relationship graph
 *
 * Export: html2canvas + jspdf on both views.
 */

import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Network, UserPlus, Download,
  Table, Map as MapIcon, Loader2,
} from 'lucide-react';
import { LBDPageHeader } from '@/components/ui/lbd';
import { toast } from '@/components/ui/lbd';
import { cn } from '@/lib/utils';
import {
  useStakeholderList,
  useAddStakeholder,
  useUpdateStakeholder,
  useDeleteStakeholder,
  type StakeholderRow,
} from '@/hooks/usePowerMap';

import AnalyticsCards from '@/pages/engagements/power-map/AnalyticsCards';
import RegistryView   from '@/pages/engagements/power-map/RegistryView';
import NetworkMap     from '@/pages/engagements/power-map/NetworkMap';
import StakeholderDrawer from '@/pages/engagements/power-map/StakeholderDrawer';

/* ─────────────────────────────────────────────
   Sub-tab definitions
───────────────────────────────────────────── */

type TabId = 'registry' | 'network';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'registry', label: 'Registry View',         icon: Table   },
  { id: 'network',  label: 'Network Visualisation', icon: MapIcon },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function PowerMapPage() {
  const { id: engagementId } = useParams<{ id: string }>();

  /* ── Data ────────────────────────────────────────────────────── */
  const { data: stakeholders = [], isLoading, dataUpdatedAt } = useStakeholderList(engagementId);
  const addMutation    = useAddStakeholder(engagementId ?? '');
  const updateMutation = useUpdateStakeholder(engagementId ?? '');
  const deleteMutation = useDeleteStakeholder(engagementId ?? '');

  /* ── UI state ────────────────────────────────────────────────── */
  const [activeTab,     setActiveTab]     = useState<TabId>('registry');
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [editTarget,    setEditTarget]    = useState<StakeholderRow | null>(null);
  const [isExporting,   setIsExporting]   = useState(false);

  /* ── Export refs ─────────────────────────────────────────────── */
  const tableRef  = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<HTMLDivElement>(null);
  const graphRef  = useRef<HTMLDivElement>(null);

  /* ── Drawer handlers ─────────────────────────────────────────── */
  const openAdd  = useCallback(() => { setEditTarget(null); setDrawerOpen(true); }, []);
  const openEdit = useCallback((row: StakeholderRow) => { setEditTarget(row); setDrawerOpen(true); }, []);
  const closeDrawer = useCallback(() => { setDrawerOpen(false); setEditTarget(null); }, []);

  const handleSave = useCallback(async (values: Parameters<typeof addMutation.mutateAsync>[0] & { name: string }) => {
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...values });
        toast.success('Stakeholder updated', `${values.name} has been updated.`);
      } else {
        await addMutation.mutateAsync(values as Parameters<typeof addMutation.mutateAsync>[0]);
        toast.success('Stakeholder added', `${values.name} has been added to the map.`);
      }
      closeDrawer();
    } catch (err: unknown) {
      toast.error('Save failed', (err as Error).message);
    }
  }, [editTarget, addMutation, updateMutation, closeDrawer]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  /* ── Export ──────────────────────────────────────────────────── */
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then((m) => m.default),
        import('jspdf'),
      ]);

      const target =
        activeTab === 'registry' ? tableRef.current :
        mapRef.current ?? graphRef.current;

      if (!target) {
        toast.warning('Export failed', 'Could not find content to export.');
        return;
      }

      const canvas = await html2canvas(target, {
        backgroundColor: '#0e0e10',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });

      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0, 0,
        canvas.width / 2,
        canvas.height / 2,
      );

      const label = activeTab === 'registry' ? 'stakeholder-registry' : 'stakeholder-network';
      pdf.save(`${label}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Export complete', 'PDF has been downloaded.');
    } catch (err: unknown) {
      toast.error('Export failed', (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, [activeTab]);

  /* ── Last updated label ──────────────────────────────────────── */
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6 min-h-full">

      {/* ── Page header ─────────────────────────────────────────── */}
      <LBDPageHeader
        eyebrow="INTELLIGENCE"
        title="Power & Stakeholder Intelligence Map"
        description={
          lastUpdated
            ? `Stakeholder influence network and relationship intelligence · Last refreshed ${lastUpdated}`
            : 'Map decision-makers, allies, and opposition across the engagement.'
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                'border border-border/60 text-muted-foreground hover:text-foreground hover:border-border',
                (isExporting || isLoading) && 'opacity-50 cursor-not-allowed',
              )}
            >
              {isExporting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />
              }
              {isExporting ? 'Exporting…' : 'Export PDF'}
            </button>
            <button
              type="button"
              onClick={openAdd}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                'bg-accent text-black hover:bg-accent/90',
              )}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Stakeholder
            </button>
          </div>
        }
      />

      {/* ── Analytics cards ─────────────────────────────────────── */}
      <AnalyticsCards stakeholders={stakeholders} />

      {/* ── Sub-tab navigation ──────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border/40 pb-0 -mb-2">
        {TABS.map((tab) => {
          const Icon    = tab.icon;
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
      <div className="mt-4">
        {activeTab === 'registry' && (
          <RegistryView
            stakeholders={stakeholders}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={handleDelete}
            tableRef={tableRef}
          />
        )}
        {activeTab === 'network' && (
          <NetworkMap
            stakeholders={stakeholders}
            mapRef={mapRef}
            graphRef={graphRef}
          />
        )}
      </div>

      {/* ── Stakeholder drawer ───────────────────────────────────── */}
      <StakeholderDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        initial={editTarget}
        onSave={handleSave}
        isSaving={addMutation.isPending || updateMutation.isPending}
      />

    </div>
  );
}
