/**
 * CompetitorsPage
 *
 * Main page for the Competitor Intelligence Profiler module.
 *
 * Layout:
 *   - LBDPageHeader with "Add Competitor" and "Compare" buttons
 *   - Left sidebar (240px): scrollable list of competitor profiles
 *   - Main area: active competitor profile view or compare view
 *
 * State:
 *   - selectedId: currently selected competitor profile
 *   - showDrawer: add/edit drawer open state
 *   - editTarget: competitor being edited (null = new)
 *   - compareMode: whether the compare analytics view is shown
 */

import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Eye,
  Plus,
  BarChart3,
  Shield,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LBDPageHeader,
  LBDEmptyState,
  LBDLoadingSkeleton,
  LBDBadge,
  toast,
} from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCompetitors } from '@/hooks/useCompetitors';
import type { CompetitorProfile } from '@/hooks/useCompetitors';
import CompetitorProfileView from '@/pages/engagements/competitors/CompetitorProfile';
import CompetitorCompare from '@/pages/engagements/competitors/CompetitorCompare';
import AddCompetitorDrawer from '@/pages/engagements/competitors/AddCompetitorDrawer';

export default function CompetitorsPage() {
  const { id: engagementId } = useParams<{ id: string }>();

  const {
    competitors,
    isLoading,
    createCompetitor,
    updateCompetitor,
    deleteCompetitor,
  } = useCompetitors(engagementId);

  /* ── Local state ─────────────────────────────────────────────── */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<CompetitorProfile | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [search, setSearch] = useState('');

  /* ── Derived ─────────────────────────────────────────────────── */
  const filtered = search
    ? competitors.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : competitors;

  const selectedCompetitor = competitors.find((c) => c.id === selectedId) ?? null;

  /* Auto-select first competitor if none selected */
  if (!selectedId && competitors.length > 0 && !compareMode) {
    // Defer to avoid setState during render
    setTimeout(() => setSelectedId(competitors[0].id), 0);
  }

  /* ── Handlers ────────────────────────────────────────────────── */
  const handleSave = useCallback(async (data: Record<string, any>) => {
    try {
      if (editTarget) {
        await updateCompetitor.mutateAsync({ id: editTarget.id, ...data } as any);
        toast('Competitor Updated', { type: 'success' });
      } else {
        const result = await createCompetitor.mutateAsync(data as any);
        setSelectedId(result.id);
        toast('Competitor Added', { type: 'success' });
      }
      setShowDrawer(false);
      setEditTarget(null);
    } catch (err: any) {
      toast(err.message ?? 'Error saving competitor', { type: 'error' });
    }
  }, [editTarget, createCompetitor, updateCompetitor]);

  const handleEdit = useCallback(() => {
    if (selectedCompetitor) {
      setEditTarget(selectedCompetitor);
      setShowDrawer(true);
    }
  }, [selectedCompetitor]);

  const handleAdd = useCallback(() => {
    setEditTarget(null);
    setShowDrawer(true);
  }, []);

  /* ── Loading ─────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <LBDLoadingSkeleton className="h-16 rounded-xl" />
        <div className="flex gap-4">
          <LBDLoadingSkeleton className="w-60 h-96 rounded-xl" />
          <LBDLoadingSkeleton className="flex-1 h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <LBDPageHeader
        eyebrow="INTELLIGENCE"
        title="Competitor Intelligence"
        description="Competitive landscape monitoring — track opposition activity, positioning, and messaging."
        actions={
          <div className="flex items-center gap-2">
            {competitors.length >= 2 && (
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setCompareMode(!compareMode); }}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                {compareMode ? 'Back to Profiles' : 'Compare'}
              </Button>
            )}
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Competitor
            </Button>
          </div>
        }
      />

      {/* Compare mode */}
      {compareMode ? (
        <CompetitorCompare
          competitors={competitors}
          onBack={() => setCompareMode(false)}
        />
      ) : competitors.length === 0 ? (
        /* Empty state */
        <LBDEmptyState
          icon={<Eye className="w-8 h-8" />}
          title="No Competitors Profiled"
          description="Add competitor profiles to begin monitoring their activity, messaging, and digital presence."
          action={{ label: 'Add First Competitor', onClick: handleAdd }}
        />
      ) : (
        /* Main layout: sidebar + profile */
        <div className="flex gap-4 flex-1 min-h-0">
          {/* ── Left Sidebar ──────────────────────────────────── */}
          <aside className="w-60 flex-none flex flex-col border border-border rounded-xl bg-card overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-1">
              {filtered.map((c) => {
                const isActive = c.id === selectedId;
                const threatHigh = (c.threat_score ?? 0) > 7;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedId(c.id); setCompareMode(false); }}
                    className={cn(
                      'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      isActive
                        ? 'bg-accent/10 border-l-2 border-l-accent'
                        : 'hover:bg-card/80 border-l-2 border-l-transparent',
                    )}
                  >
                    {/* Initials avatar */}
                    <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center flex-none">
                      <span className="text-[10px] font-bold text-foreground">
                        {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-xs font-medium truncate', isActive ? 'text-accent' : 'text-foreground')}>
                        {c.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.role_position ?? 'No role set'}
                      </p>
                    </div>
                    {threatHigh && (
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-none" aria-label="High threat" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Count */}
            <div className="px-4 py-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground">
                {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} profiled
              </p>
            </div>
          </aside>

          {/* ── Main Profile View ─────────────────────────────── */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {selectedCompetitor ? (
              <CompetitorProfileView
                competitor={selectedCompetitor}
                engagementId={engagementId!}
                onEdit={handleEdit}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a competitor from the sidebar
              </div>
            )}
          </main>
        </div>
      )}

      {/* Add/Edit Drawer */}
      <AddCompetitorDrawer
        open={showDrawer}
        onClose={() => { setShowDrawer(false); setEditTarget(null); }}
        onSave={handleSave}
        editData={editTarget}
        isSaving={createCompetitor.isPending || updateCompetitor.isPending}
      />
    </div>
  );
}
