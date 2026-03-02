/**
 * EngagementList
 *
 * Displays all engagements the current user has access to in a filterable
 * data table. Clicking a row navigates to the engagement workspace.
 * Data is sourced from EngagementContext (already fetched by the provider).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, RefreshCw, Plus } from 'lucide-react';
import { useEngagement, type Engagement } from '@/contexts/EngagementContext';
import {
  LBDPageHeader,
  LBDCard,
  LBDBadge,
  LBDEmptyState,
  LBDLoadingSkeleton,
} from '@/components/ui/lbd';
import { cn } from '@/lib/utils';
import NewEngagementModal from './NewEngagementModal';

/* ─────────────────────────────────────────────
   Status filter options
───────────────────────────────────────────── */

type StatusFilter = 'all' | 'active' | 'paused';

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all',    label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

/* ─────────────────────────────────────────────
   RAG badge mapping
───────────────────────────────────────────── */

const ragVariant: Record<Engagement['health_rag'], 'green' | 'amber' | 'red'> = {
  green: 'green',
  amber: 'amber',
  red:   'red',
};

const statusVariant: Record<Engagement['status'], 'green' | 'amber' | 'outline'> = {
  active: 'green',
  paused: 'amber',
  closed: 'outline',
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function EngagementList() {
  const navigate = useNavigate();
  const { engagements, isLoading, error, refetch, setSelectedEngagement } = useEngagement();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  /* Derived filtered list */
  const filtered = engagements.filter((e) => {
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function handleRowClick(engagement: Engagement) {
    setSelectedEngagement(engagement);
    navigate(`/engagements/${engagement.id}`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <LBDPageHeader
        eyebrow="ENGAGEMENTS"
        title="Engagement Portfolio"
        description="All active and paused client engagements assigned to you."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              aria-label="Refresh engagements"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Refresh
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              New Engagement
            </button>
          </div>
        }
      />

      {/* ── Toolbar ─────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 mt-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search engagements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search engagements"
          className={cn(
            'flex-1 max-w-xs bg-card rounded-lg px-3 py-1.5 text-xs',
            'border border-border placeholder:text-muted-foreground/50',
            'text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        />

        {/* Status filter pills */}
        <div className="flex items-center gap-1" role="group" aria-label="Filter by status">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                statusFilter === opt.value
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border',
              )}
              aria-pressed={statusFilter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────── */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <LBDLoadingSkeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <LBDCard className="p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-xs text-accent hover:underline"
          >
            Try again
          </button>
        </LBDCard>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <LBDEmptyState
          icon={<Briefcase className="w-8 h-8" />}
          title={engagements.length === 0 ? 'No Engagements' : 'No Results'}
          description={
            engagements.length === 0
              ? 'Active engagements will appear here once created.'
              : 'No engagements match your current filters.'
          }
        />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-2" role="list" aria-label="Engagement list">
          {filtered.map((engagement) => (
            <LBDCard
              key={engagement.id}
              role="listitem"
              className="px-4 py-3.5 cursor-pointer hover:border-accent/30 transition-colors group"
              onClick={() => handleRowClick(engagement)}
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleRowClick(engagement)}
              aria-label={`Open engagement: ${engagement.title}`}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex-none w-8 h-8 rounded-lg bg-accent/5 border border-border flex items-center justify-center group-hover:border-accent/20 transition-colors">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                    {engagement.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    Phase {engagement.phase}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-none">
                  <LBDBadge variant={statusVariant[engagement.status]} size="sm">
                    {engagement.status.toUpperCase()}
                  </LBDBadge>
                  <LBDBadge variant={ragVariant[engagement.health_rag]} size="sm">
                    {engagement.health_rag.toUpperCase()}
                  </LBDBadge>
                </div>
              </div>
            </LBDCard>
          ))}
        </div>
      )}

      {/* Count footer */}
      {!isLoading && filtered.length > 0 && (
        <p className="mt-4 text-[10px] font-mono text-muted-foreground/50 text-right">
          {filtered.length} engagement{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* New Engagement modal */}
      <NewEngagementModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={(engagementId) => {
          refetch();
          navigate(`/engagements/${engagementId}`);
        }}
      />
    </div>
  );
}
