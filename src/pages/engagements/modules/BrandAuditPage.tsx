/**
 * BrandAuditPage
 *
 * Leadership Brand Audit & Scorecard module.
 * Route: /engagements/:id/brand-audit
 *
 * Sections:
 *  1. Audit Header — overall score, target, gap, status, audit selector
 *  2. 12-Dimension Scorecard — premium slider-based scoring interface
 *  3. Visual Analytics — radar chart, gap chart, trajectory
 *  4. Repositioning Roadmap — inline table + PDF export
 *
 * Auto-save on change via debounced mutation.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus, Save, ChevronDown, CheckCircle, Clock, Copy,
} from 'lucide-react';
import { LBDPageHeader } from '@/components/ui/lbd';
import { LBDConfirmDialog } from '@/components/ui/lbd/LBDConfirmDialog';
import { toast } from '@/components/ui/lbd';
import { cn } from '@/lib/utils';
import {
  useBrandAuditList,
  useCreateBrandAudit,
  useUpdateBrandAudit,
  calcOverall,
  type BrandAudit,
  type ScoresMap,
  type RoadmapItem,
} from '@/hooks/useBrandAudit';

import DimensionScorecard from '@/pages/engagements/brand-audit/DimensionScorecard';
import BrandAnalytics from '@/pages/engagements/brand-audit/BrandAnalytics';
import RepositioningRoadmap from '@/pages/engagements/brand-audit/RepositioningRoadmap';

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function BrandAuditPage() {
  const { id: engagementId } = useParams<{ id: string }>();

  /* ── Data layer ───────────────────────────────────────────────── */
  const { data: audits = [], isLoading } = useBrandAuditList(engagementId);
  const createMutation = useCreateBrandAudit(engagementId ?? '');
  const updateMutation = useUpdateBrandAudit(engagementId ?? '');

  /* ── Selected audit ───────────────────────────────────────────── */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAudit = useMemo(
    () => audits.find((a) => a.id === selectedId) ?? audits[0] ?? null,
    [audits, selectedId],
  );

  // Auto-select first audit on load
  useEffect(() => {
    if (!selectedId && audits.length > 0) {
      setSelectedId(audits[0].id);
    }
  }, [audits, selectedId]);

  /* ── Local edit state ─────────────────────────────────────────── */
  const [localScores, setLocalScores] = useState<ScoresMap | null>(null);
  const [localTarget, setLocalTarget] = useState<number | null>(null);
  const [localRoadmap, setLocalRoadmap] = useState<RoadmapItem[] | null>(null);
  const [dirty, setDirty] = useState(false);

  // Sync local state when selected audit changes
  useEffect(() => {
    if (selectedAudit) {
      setLocalScores(selectedAudit.scores);
      setLocalTarget(selectedAudit.target_score);
      setLocalRoadmap(selectedAudit.repositioning_roadmap);
      setDirty(false);
    }
  }, [selectedAudit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived values ───────────────────────────────────────────── */
  const scores = localScores ?? selectedAudit?.scores ?? {};
  const overall = calcOverall(scores);
  const targetScore = localTarget ?? selectedAudit?.target_score ?? null;
  const gap = targetScore != null ? (targetScore - overall).toFixed(1) : '—';
  const roadmap = localRoadmap ?? selectedAudit?.repositioning_roadmap ?? [];

  // Is this audit finalised (read-only)?
  // We treat audits older than the newest as "finalised" unless it's the only one.
  const isFinalised = selectedAudit
    ? audits.length > 1 && selectedAudit.id !== audits[0].id
    : false;

  /* ── Score change handler ─────────────────────────────────────── */
  const handleScoresChange = useCallback((next: ScoresMap) => {
    setLocalScores(next);
    setDirty(true);
  }, []);

  const handleTargetChange = useCallback((val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0 && n <= 10) {
      setLocalTarget(n);
      setDirty(true);
    }
  }, []);

  const handleRoadmapChange = useCallback((next: RoadmapItem[]) => {
    setLocalRoadmap(next);
    setDirty(true);
  }, []);

  /* ── Save ─────────────────────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    if (!selectedAudit) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedAudit.id,
        scores: localScores ?? selectedAudit.scores,
        overall_score: overall,
        target_score: localTarget,
        repositioning_roadmap: localRoadmap ?? [],
      });
      setDirty(false);
      toast.success('Audit saved', 'Brand audit scores and roadmap have been saved.');
    } catch (err: unknown) {
      toast.error('Save failed', (err as Error).message);
    }
  }, [selectedAudit, localScores, overall, localTarget, localRoadmap, updateMutation]);

  /* ── Create new audit ─────────────────────────────────────────── */
  const [showPrefillConfirm, setShowPrefillConfirm] = useState(false);

  const createNew = useCallback(async (prefill: boolean) => {
    try {
      const result = await createMutation.mutateAsync(
        prefill && audits.length > 0 ? { prefillFrom: audits[0] } : undefined,
      );
      setSelectedId(result.id);
      setShowPrefillConfirm(false);
      toast.success('New audit created', prefill ? 'Pre-filled with previous scores.' : 'Starting with default scores.');
    } catch (err: unknown) {
      toast.error('Create failed', (err as Error).message);
    }
  }, [createMutation, audits]);

  const handleNewAudit = useCallback(() => {
    if (audits.length > 0) {
      setShowPrefillConfirm(true);
    } else {
      createNew(false);
    }
  }, [audits.length, createNew]);

  /* ── Dropdown state ───────────────────────────────────────────── */
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Loading state ────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="p-6">
        <LBDPageHeader eyebrow="STRATEGY" title="Leadership Brand Audit" description="Loading audit data…" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ── No audits state ──────────────────────────────────────────── */
  if (!selectedAudit) {
    return (
      <div className="p-6">
        <LBDPageHeader
          eyebrow="STRATEGY"
          title="Leadership Brand Audit"
          description="Evaluate brand perception across 12 strategic dimensions."
          actions={
            <button
              type="button"
              onClick={handleNewAudit}
              disabled={createMutation.isPending}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold',
                'bg-accent text-black hover:bg-accent/90 transition-colors',
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              New Audit
            </button>
          }
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-4">No brand audits yet. Create your first audit to begin scoring.</p>
          <button
            type="button"
            onClick={() => createNew(false)}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-black hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Audit
          </button>
        </div>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-8">
      {/* ── Page header ─────────────────────────────────────────── */}
      <LBDPageHeader
        eyebrow="STRATEGY"
        title="Leadership Brand Audit"
        description="Evaluate brand perception across 12 strategic dimensions with target-gap analysis."
        actions={
          <div className="flex items-center gap-2">
            {/* Audit selector dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                {new Date(selectedAudit.audit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                <ChevronDown className="w-3 h-3" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-border bg-card shadow-xl z-50">
                  {audits.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setSelectedId(a.id); setDropdownOpen(false); }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-xs hover:bg-accent/10 transition-colors flex items-center justify-between',
                        a.id === selectedAudit.id && 'bg-accent/5 text-accent font-semibold',
                      )}
                    >
                      <span>{new Date(a.audit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="text-muted-foreground font-mono">{(a.overall_score ?? 0).toFixed(1)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save button */}
            {!isFinalised && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || updateMutation.isPending}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                  dirty
                    ? 'bg-accent text-black hover:bg-accent/90'
                    : 'border border-border text-muted-foreground opacity-50',
                )}
              >
                <Save className="w-3.5 h-3.5" />
                {updateMutation.isPending ? 'Saving…' : 'Save Draft'}
              </button>
            )}

            {/* New audit button */}
            <button
              type="button"
              onClick={handleNewAudit}
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Audit
            </button>
          </div>
        }
      />

      {/* ── Section 1: Audit header / scoreboard ────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Audit date */}
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] font-mono tracking-widest text-muted-foreground mb-1">AUDIT DATE</p>
          <p className="text-sm font-semibold text-foreground">
            {new Date(selectedAudit.audit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Overall score */}
        <div className="rounded-xl border-2 border-accent/40 bg-card p-4 text-center">
          <p className="text-[10px] font-mono tracking-widest text-accent mb-1">OVERALL SCORE</p>
          <p className="text-3xl font-bold text-accent font-mono">
            {overall.toFixed(1)}<span className="text-base text-muted-foreground">/10</span>
          </p>
        </div>

        {/* Target score */}
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] font-mono tracking-widest text-muted-foreground mb-1">TARGET SCORE</p>
          {isFinalised ? (
            <p className="text-lg font-bold text-foreground font-mono">{targetScore ?? '—'}</p>
          ) : (
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={targetScore ?? ''}
              onChange={(e) => handleTargetChange(e.target.value)}
              className="w-16 text-center text-lg font-bold font-mono bg-transparent border-b border-border text-foreground focus:outline-none focus:border-accent"
              placeholder="—"
            />
          )}
        </div>

        {/* Gap */}
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] font-mono tracking-widest text-muted-foreground mb-1">GAP</p>
          <p className={cn(
            'text-lg font-bold font-mono',
            typeof gap === 'string' ? 'text-muted-foreground'
              : parseFloat(gap) >= 2 ? 'text-red-400'
              : parseFloat(gap) >= 1 ? 'text-amber-400'
              : 'text-emerald-400',
          )}>
            {gap}
          </p>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] font-mono tracking-widest text-muted-foreground mb-1">STATUS</p>
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold',
            isFinalised
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
          )}>
            {isFinalised ? <><CheckCircle className="w-3 h-3" /> Finalised</> : <><Clock className="w-3 h-3" /> Draft</>}
          </span>
        </div>
      </div>

      {/* ── Section 2: 12-Dimension Scorecard ───────────────────── */}
      <section>
        <h2 className="text-xs font-mono tracking-widest text-muted-foreground mb-4 uppercase">
          12-Dimension Scorecard
        </h2>
        <DimensionScorecard
          scores={scores}
          onChange={handleScoresChange}
          readOnly={isFinalised}
        />
      </section>

      {/* ── Section 3: Visual Analytics ─────────────────────────── */}
      <section>
        <h2 className="text-xs font-mono tracking-widest text-muted-foreground mb-4 uppercase">
          Visual Analytics
        </h2>
        <BrandAnalytics
          scores={scores}
          allAudits={audits}
        />
      </section>

      {/* ── Section 4: Repositioning Roadmap ────────────────────── */}
      <section>
        <RepositioningRoadmap
          items={roadmap}
          onChange={handleRoadmapChange}
          readOnly={isFinalised}
        />
      </section>

      {/* ── Pre-fill confirm dialog ─────────────────────────────── */}
      <LBDConfirmDialog
        open={showPrefillConfirm}
        onCancel={() => { setShowPrefillConfirm(false); createNew(false); }}
        onConfirm={() => createNew(true)}
        variant="info"
        title="Pre-fill from last audit?"
        description="Would you like to start with the scores from the most recent audit as a baseline? You can also start fresh."
        confirmLabel="Pre-fill Scores"
        cancelLabel="Start Fresh"
      />
    </div>
  );
}
