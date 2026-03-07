/**
 * DiscoverySession
 *
 * Full-page confidential discovery session interface.
 * Route: /engagements/:id/discovery
 *
 * Layout:
 *  Left (35%):  Navigation panel — 7 area tabs with completion state
 *  Right (65%): Active area content — notes, AI summary, prompts
 *
 * Features:
 *  - Auto-save every 30 seconds (managed by useDiscoverySession)
 *  - AI Summarise per area via discovery-summarise Edge Function
 *  - Generates a print-ready Discovery Brief modal
 *  - Mark Complete locks the session and marks Step 2 complete in onboarding
 *  - Full read-only mode when session is locked
 *
 * Security:
 *  - RLS: only the lead_advisor on this engagement and super_admin can access
 *  - AI function receives only the raw notes text for the selected area
 *  - All AI calls logged in audit_logs
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  FileText,
  CheckCircle2,
  Lock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useEngagement }        from '@/contexts/EngagementContext';
import { useEngagementDetail }  from '@/hooks/useEngagementDetail';
import { useDiscoverySession }  from '@/hooks/useDiscoverySession';
import { useOnboarding }        from '@/hooks/useOnboarding';
import { toast, LBDLoadingSkeleton } from '@/components/ui/lbd';
import { DISCOVERY_AREAS }      from './discoveryAreas';
import DiscoveryAreaPanel       from './DiscoveryAreaPanel';
import DiscoveryBriefModal      from './DiscoveryBriefModal';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Left nav: area list item
───────────────────────────────────────────── */

interface AreaNavItemProps {
  index:     number;
  title:     string;
  hasNotes:  boolean;
  isActive:  boolean;
  isLocked:  boolean;
  onClick:   () => void;
}

function AreaNavItem({ index, title, hasNotes, isActive, isLocked, onClick }: AreaNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-accent/10 border border-accent/25 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/4 border border-transparent',
      )}
    >
      {/* Number / completion dot */}
      <div className={cn(
        'flex-none w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-mono font-bold transition-colors',
        hasNotes
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
          : isActive
            ? 'bg-accent/15 border-accent/40 text-accent'
            : 'bg-muted/20 border-border text-muted-foreground/50',
      )} aria-hidden="true">
        {hasNotes ? '✓' : index}
      </div>

      {/* Title */}
      <span className={cn(
        'text-xs font-medium leading-tight',
        isActive ? 'text-foreground' : 'text-muted-foreground',
      )}>
        {title}
      </span>

      {/* Locked badge */}
      {isLocked && <Lock className="w-3 h-3 text-muted-foreground/30 ml-auto flex-none" aria-hidden="true" />}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */

export default function DiscoverySession() {
  const { id: engagementId } = useParams<{ id: string }>();
  const navigate             = useNavigate();

  const [activeAreaIndex, setActiveAreaIndex] = useState(1);
  const [briefOpen, setBriefOpen]             = useState(false);

  /* ── Data ────────────────────────────────────────────────────────── */
  const { engagements }    = useEngagement();
  const ctxEngagement      = engagements.find((e) => e.id === engagementId);
  const { data: detail }   = useEngagementDetail(engagementId);
  const { updateStep }     = useOnboarding(engagementId);

  const {
    session,
    isLoading,
    error,
    localAreas,
    updateAreaNotes,
    save,
    isSaving,
    summarise,
    isSummarising,
    lock,
    isLocking,
    isDirty,
    completedCount,
    isLocked,
    isFullyComplete,
  } = useDiscoverySession(engagementId);

  /* ── Actions ─────────────────────────────────────────────────────── */

  const handleSave = useCallback(async () => {
    try {
      await save();
      toast.success('Progress saved', 'All discovery notes have been saved.');
    } catch (err: unknown) {
      toast.error('Save failed', (err as Error).message);
    }
  }, [save]);

  const handleMarkComplete = useCallback(async () => {
    if (!isFullyComplete) {
      toast.error('Cannot complete', 'All 7 areas must have notes before locking the session.');
      return;
    }
    try {
      await lock();
      // Mark Step 2 complete in onboarding tracker.
      // Must be awaited so localStorage is flushed before navigate() fires.
      await updateStep(2, 'complete', {
        discoverySessionId: session?.id,
        lockedAt:           new Date().toISOString(),
      });
      toast.success('Discovery session complete', 'Step 2 has been marked complete in the onboarding tracker.');
      navigate(`/engagements/${engagementId}/onboarding`);
    } catch (err: unknown) {
      toast.error('Lock failed', (err as Error).message);
    }
  }, [isFullyComplete, lock, updateStep, session?.id, engagementId, navigate]);

  /* ── Loading / error states ──────────────────────────────────────── */

  if (!engagementId) {
    return (
      <div className="p-8 text-sm text-muted-foreground">No engagement selected.</div>
    );
  }

  const clientName      = detail?.client_name      ?? ctxEngagement?.title ?? 'Client';
  const engagementTitle = detail?.client_name
    ? `${detail.client_name} — ${ctxEngagement?.title ?? ''}`
    : ctxEngagement?.title ?? 'Engagement';

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#09090b]">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex-none flex items-center justify-between px-6 py-3.5 border-b border-border bg-[#0c0c0e]">
        {/* Left: back + title */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/engagements/${engagementId}/onboarding`)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to Onboarding"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Onboarding
          </button>
          <span className="text-muted-foreground/30" aria-hidden="true">/</span>
          <div>
            <p className="text-[10px] font-mono tracking-widest text-red-400/70 uppercase">
              Confidential Discovery Session
            </p>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {clientName}
            </p>
          </div>
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-3">
          {/* Auto-save status */}
          {isDirty && !isLocked && (
            <p className="text-[10px] font-mono text-amber-400/60">
              Unsaved changes
            </p>
          )}
          {!isDirty && !isLoading && (
            <p className="text-[10px] font-mono text-muted-foreground/30">
              Auto-saves every 30s
            </p>
          )}

          {isLocked && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50 border border-border rounded-lg px-3 py-1.5">
              <Lock className="w-3 h-3" aria-hidden="true" />
              Session Locked
            </div>
          )}

          {!isLocked && (
            <>
              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isDirty
                    ? 'border-border text-foreground hover:border-accent/30 hover:text-accent'
                    : 'border-border text-muted-foreground/40 cursor-not-allowed',
                )}
              >
                {isSaving
                  ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  : <Save className="w-3 h-3" aria-hidden="true" />
                }
                {isSaving ? 'Saving…' : 'Save Progress'}
              </button>

              {/* Generate Brief */}
              <button
                type="button"
                onClick={() => setBriefOpen(true)}
                disabled={completedCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:border-accent/30 hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText className="w-3 h-3" aria-hidden="true" />
                Discovery Brief
              </button>

              {/* Mark Complete */}
              <button
                type="button"
                onClick={handleMarkComplete}
                disabled={isLocking || !isFullyComplete}
                title={!isFullyComplete ? 'Add notes to all 7 areas first' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isFullyComplete
                    ? 'bg-emerald-600/90 text-white hover:bg-emerald-600'
                    : 'bg-muted/20 border border-border text-muted-foreground/40 cursor-not-allowed',
                )}
              >
                {isLocking
                  ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  : <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                }
                Mark Complete
              </button>
            </>
          )}

          {isLocked && (
            <button
              type="button"
              onClick={() => setBriefOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:border-accent/30 hover:text-accent transition-colors"
            >
              <FileText className="w-3 h-3" aria-hidden="true" />
              View Brief
            </button>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left nav panel (35%) */}
        <div className="w-[35%] flex-none flex flex-col border-r border-border bg-[#0c0c0e] overflow-y-auto">
          {/* Progress summary */}
          <div className="px-4 pt-4 pb-3 border-b border-border/50">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground/40 uppercase mb-2">
              Session Progress
            </p>
            <div className="flex items-center gap-2">
              {/* Mini step dots */}
              <div className="flex gap-1">
                {DISCOVERY_AREAS.map((a) => {
                  const filled = (localAreas[String(a.index)]?.notes?.trim()?.length ?? 0) > 0;
                  return (
                    <div
                      key={a.index}
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        filled ? 'bg-emerald-500' : 'bg-muted/30 border border-border',
                      )}
                      title={a.title}
                      aria-label={`${a.title}: ${filled ? 'has notes' : 'empty'}`}
                    />
                  );
                })}
              </div>
              <span className="text-[11px] font-mono text-muted-foreground/50 ml-1">
                {completedCount}/7 areas
              </span>
            </div>
            {/* Simple bar */}
            <div className="mt-2 h-1 rounded-full bg-muted/20">
              <div
                className="h-1 rounded-full bg-accent/50 transition-all"
                style={{ width: `${(completedCount / 7) * 100}%` }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Area list */}
          <div className="flex-1 p-3 space-y-1">
            {isLoading && Array.from({ length: 7 }).map((_, i) => (
              <LBDLoadingSkeleton key={i} className="h-12 rounded-xl" />
            ))}
            {!isLoading && DISCOVERY_AREAS.map((area) => {
              const hasNotes = (localAreas[String(area.index)]?.notes?.trim()?.length ?? 0) > 0;
              return (
                <AreaNavItem
                  key={area.index}
                  index={area.index}
                  title={area.title}
                  hasNotes={hasNotes}
                  isActive={activeAreaIndex === area.index}
                  isLocked={isLocked}
                  onClick={() => setActiveAreaIndex(area.index)}
                />
              );
            })}
          </div>

          {/* Footer quality gate warning */}
          {!isLocked && !isFullyComplete && (
            <div className="px-4 py-3 border-t border-border/50">
              <div className="flex items-start gap-2 text-[10px] font-mono text-amber-400/60">
                <AlertTriangle className="w-3 h-3 flex-none mt-0.5" aria-hidden="true" />
                <p>All 7 areas must have notes to complete this session.</p>
              </div>
            </div>
          )}

          {isLocked && (
            <div className="px-4 py-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400/60">
                <Lock className="w-3 h-3" aria-hidden="true" />
                <p>Session complete and locked.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right content panel (65%) */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <LBDLoadingSkeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8">
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
                <p className="text-sm font-medium text-red-400">Failed to load discovery session</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 max-w-3xl">
              {/* Locked banner */}
              {isLocked && (
                <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <Lock className="w-4 h-4 text-emerald-400 flex-none" aria-hidden="true" />
                  <p className="text-xs text-emerald-400 font-medium">
                    This discovery session is locked and read-only. Step 2 has been marked complete.
                  </p>
                </div>
              )}

              {/* Active area panel */}
              {DISCOVERY_AREAS.filter((a) => a.index === activeAreaIndex).map((area) => (
                <DiscoveryAreaPanel
                  key={area.index}
                  area={area}
                  areaData={localAreas[String(area.index)] ?? { notes: '', summary: '' }}
                  isLocked={isLocked}
                  isSummarising={isSummarising[area.index] ?? false}
                  onNotesChange={(notes) => updateAreaNotes(area.index, notes)}
                  onSummarise={() => summarise(area.index, area.title)}
                />
              ))}

              {/* Next area navigation */}
              {!isLocked && activeAreaIndex < 7 && (
                <div className="mt-8 pt-6 border-t border-border/30 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveAreaIndex((p) => p + 1)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
                  >
                    Next Area →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Discovery Brief modal ────────────────────────────────────── */}
      <DiscoveryBriefModal
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
        clientName={clientName}
        engagementTitle={engagementTitle}
        leadAdvisor={detail?.lead_advisor_name ?? undefined}
        startDate={detail?.start_date ?? undefined}
        areas={localAreas}
      />
    </div>
  );
}
