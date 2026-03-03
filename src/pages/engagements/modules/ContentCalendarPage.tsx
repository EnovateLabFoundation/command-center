/**
 * ContentCalendarPage
 *
 * Main page for the Content Calendar & Asset Manager module.
 * Three tabs: Calendar | List | Asset Library.
 * Includes KPI strip, content creation modal, and performance chart.
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, CalendarDays, List, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LBDPageHeader } from '@/components/ui/lbd/LBDPageHeader';
import { LBDStatCard } from '@/components/ui/lbd/LBDStatCard';
import { useContentCalendar } from '@/hooks/useContentCalendar';
import type { ContentItem } from '@/hooks/useContentCalendar';
import ContentCalendarView from '@/pages/engagements/content-calendar/ContentCalendarView';
import ContentListView from '@/pages/engagements/content-calendar/ContentListView';
import ContentItemDrawer from '@/pages/engagements/content-calendar/ContentItemDrawer';
import ContentCreationModal from '@/pages/engagements/content-calendar/ContentCreationModal';
import AssetLibrary from '@/pages/engagements/content-calendar/AssetLibrary';
import PerformanceChart from '@/pages/engagements/content-calendar/PerformanceChart';
import { LBDConfirmDialog } from '@/components/ui/lbd/LBDConfirmDialog';
import { cn } from '@/lib/utils';

type ViewTab = 'calendar' | 'list' | 'assets';

export default function ContentCalendarPage() {
  const { id } = useParams<{ id: string }>();
  const {
    items, isLoading,
    assets, isAssetsLoading,
    createItem, updateItem, deleteItem,
    uploadAsset, deleteAsset, fetchAssets,
  } = useContentCalendar(id);

  const [view, setView] = useState<ViewTab>('calendar');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit'>('view');
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);

  /* ── KPI stats ── */
  const stats = useMemo(() => {
    const total = items.length;
    const drafts = items.filter((i) => i.status === 'draft').length;
    const scheduled = items.filter((i) => i.status === 'scheduled').length;
    const published = items.filter((i) => i.status === 'published').length;
    return { total, drafts, scheduled, published };
  }, [items]);

  const handleView = (item: ContentItem) => { setSelectedItem(item); setDrawerMode('view'); };
  const handleEdit = (item: ContentItem) => { setSelectedItem(item); setDrawerMode('edit'); };
  const handleDelete = (item: ContentItem) => setDeleteTarget(item);
  const confirmDelete = async () => {
    if (deleteTarget) await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  };

  const TABS: { key: ViewTab; label: string; icon: React.ReactNode }[] = [
    { key: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { key: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
    { key: 'assets', label: 'Asset Library', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <LBDPageHeader
        eyebrow="EXECUTION"
        title="Content Calendar"
        description="Plan, schedule, and track content across all channels."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Content
          </Button>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LBDStatCard label="Total Items" value={stats.total} />
        <LBDStatCard label="Drafts" value={stats.drafts} accentClass="gold" />
        <LBDStatCard label="Scheduled" value={stats.scheduled} accentClass="info" />
        <LBDStatCard label="Published" value={stats.published} accentClass="success" />
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      {view === 'calendar' && (
        <ContentCalendarView items={items} onItemClick={handleView} />
      )}
      {view === 'list' && (
        <ContentListView
          items={items}
          isLoading={isLoading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      {view === 'assets' && (
        <AssetLibrary
          assets={assets}
          isLoading={isAssetsLoading}
          onUpload={uploadAsset}
          onDelete={deleteAsset}
          onFetch={fetchAssets}
        />
      )}

      {/* Performance chart (below calendar/list views) */}
      {view !== 'assets' && <PerformanceChart items={items} />}

      {/* Drawers & Modals */}
      <ContentItemDrawer
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={(itemId, updates) => updateItem(itemId, updates)}
        mode={drawerMode}
      />

      <ContentCreationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(data) => createItem({ ...data, status: data.status as 'draft' | 'approved' | 'scheduled' | 'published' | 'archived' })}
      />

      <LBDConfirmDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Content Item"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
