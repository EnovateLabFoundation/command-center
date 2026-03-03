/**
 * CommsPlannerPage
 *
 * Governance Communications Planner at /engagements/:id/comms-planner.
 * Three views: List | Calendar | Channel Map,
 * plus Audience Coverage Analysis and exportable Status Board.
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, List, CalendarDays, LayoutGrid } from 'lucide-react';
import { LBDPageHeader, LBDStatCard, LBDConfirmDialog } from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useInitiativeList,
  useAddInitiative,
  useUpdateInitiative,
  useDeleteInitiative,
  useAudienceCoverage,
  useResponsibleUsers,
  type Initiative,
} from '@/hooks/useCommsPlanner';
import InitiativeDrawer from '@/pages/engagements/comms-planner/InitiativeDrawer';
import InitiativeListView from '@/pages/engagements/comms-planner/InitiativeListView';
import CalendarView from '@/pages/engagements/comms-planner/CalendarView';
import ChannelMapView from '@/pages/engagements/comms-planner/ChannelMapView';
import AudienceCoveragePanel from '@/pages/engagements/comms-planner/AudienceCoveragePanel';
import StatusBoardWidget from '@/pages/engagements/comms-planner/StatusBoardWidget';

/* ─────────────────────────────────────────── */

export default function CommsPlannerPage() {
  const { id } = useParams<{ id: string }>();
  const engagementId = id ?? '';

  /* ── Data hooks ── */
  const { data: initiatives = [], isLoading } = useInitiativeList(engagementId);
  const { data: audienceCoverage = [], isLoading: audienceLoading } = useAudienceCoverage(engagementId);
  const { data: responsibleUsers = [] } = useResponsibleUsers();
  const addMutation = useAddInitiative(engagementId);
  const updateMutation = useUpdateInitiative(engagementId);
  const deleteMutation = useDeleteInitiative(engagementId);

  /* ── Local UI state ── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Initiative | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const total = initiatives.length;
    const inProgress = initiatives.filter(i => i.displayStatus === 'in_progress').length;
    const complete = initiatives.filter(i => i.displayStatus === 'complete').length;
    const overdue = initiatives.filter(i => i.displayStatus === 'overdue').length;
    return { total, inProgress, complete, overdue };
  }, [initiatives]);

  /* ── Handlers ── */
  const openAdd = () => { setEditingItem(null); setDrawerOpen(true); };
  const openEdit = (item: Initiative) => { setEditingItem(item); setDrawerOpen(true); };

  const handleSave = async (values: Record<string, unknown>) => {
    if (values.id) {
      await updateMutation.mutateAsync(values as any);
    } else {
      await addMutation.mutateAsync(values as any);
    }
    setDrawerOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <LBDPageHeader
        eyebrow="STRATEGY"
        title="Comms Planner"
        description="Governance communications planning — campaigns, initiatives, and channel strategy."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Initiative
          </Button>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LBDStatCard label="Total Initiatives" value={kpis.total} loading={isLoading} />
        <LBDStatCard
          label="In Progress"
          value={kpis.inProgress}
          loading={isLoading}
          className="border-l-2 border-l-blue-500/50"
        />
        <LBDStatCard
          label="Complete"
          value={kpis.complete}
          loading={isLoading}
          className="border-l-2 border-l-emerald-500/50"
        />
        <LBDStatCard
          label="Overdue"
          value={kpis.overdue}
          loading={isLoading}
          className="border-l-2 border-l-red-500/50"
        />
      </div>

      {/* View Tabs */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><List className="h-3.5 w-3.5 mr-1.5" /> List</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Calendar</TabsTrigger>
          <TabsTrigger value="channel"><LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Channel Map</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <InitiativeListView
            data={initiatives}
            loading={isLoading}
            users={responsibleUsers}
            onEdit={openEdit}
            onDelete={id => setDeleteId(id)}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView data={initiatives} onClickInitiative={openEdit} />
        </TabsContent>

        <TabsContent value="channel">
          <ChannelMapView data={initiatives} onClickInitiative={openEdit} />
        </TabsContent>
      </Tabs>

      {/* Audience Coverage */}
      <AudienceCoveragePanel items={audienceCoverage} loading={audienceLoading} />

      {/* Status Board */}
      <StatusBoardWidget data={initiatives} />

      {/* Drawer */}
      <InitiativeDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingItem(null); }}
        onSave={handleSave}
        saving={addMutation.isPending || updateMutation.isPending}
        initiative={editingItem}
        responsibleUsers={responsibleUsers}
      />

      {/* Delete Confirm */}
      <LBDConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        title="Delete Initiative"
        description="Are you sure you want to delete this initiative? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
