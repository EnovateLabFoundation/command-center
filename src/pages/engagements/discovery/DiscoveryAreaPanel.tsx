/**
 * DiscoveryAreaPanel
 *
 * Right-column content panel for a single discovery area.
 * Renders:
 *  - Area title, description, and "Feeds into" chips
 *  - Collapsible guided question prompts (read-only)
 *  - Large confidential notes textarea with auto-grow
 *  - AI Summarise button → renders bullet summary box below notes
 *  - Completion indicator (has content vs. empty)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/lbd';
import type { DiscoveryArea } from './discoveryAreas';
import type { AreaData } from '@/hooks/useDiscoverySession';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface DiscoveryAreaPanelProps {
  area:              DiscoveryArea;
  areaData:          AreaData;
  isLocked:          boolean;
  isSummarising:     boolean;
  onNotesChange:     (notes: string) => void;
  onSummarise:       () => Promise<void>;
}

/* ─────────────────────────────────────────────
   Auto-grow textarea helper
───────────────────────────────────────────── */

function AutoGrowTextarea({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value:       string;
  onChange:    (v: string) => void;
  disabled?:   boolean;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={8}
      className={cn(
        'w-full bg-[#0a0a0c] rounded-xl px-4 py-3.5 text-sm text-foreground',
        'border border-border/60 placeholder:text-muted-foreground/30',
        'focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/30',
        'resize-none transition-all leading-relaxed font-mono text-xs',
        'min-h-[220px]',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    />
  );
}

/* ─────────────────────────────────────────────
   Feeds-into chip
───────────────────────────────────────────── */

function FeedsChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-accent/8 text-accent/70 border border-accent/15">
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function DiscoveryAreaPanel({
  area,
  areaData,
  isLocked,
  isSummarising,
  onNotesChange,
  onSummarise,
}: DiscoveryAreaPanelProps) {
  const [promptsExpanded, setPromptsExpanded] = useState(false);

  const hasNotes   = areaData.notes.trim().length > 0;
  const hasSummary = areaData.summary.trim().length > 0;
  const hasBullets = hasSummary
    ? areaData.summary.split('\n').filter(Boolean).length > 0
    : false;

  const handleSummarise = useCallback(async () => {
    try {
      await onSummarise();
      toast.success('Summary generated', `AI summary ready for ${area.title}.`);
    } catch (err: unknown) {
      toast.error('Summarise failed', (err as Error).message);
    }
  }, [onSummarise, area.title]);

  return (
    <div className="space-y-5 h-full">

      {/* ── Area header ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-accent/60 tracking-widest uppercase">
                Area {area.index} of 7
              </span>
              {hasNotes && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                  Notes captured
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground">{area.title}</h2>
            <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed max-w-xl">
              {area.description}
            </p>
          </div>
          {isLocked && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50 flex-none">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-mono text-[10px]">Session Locked</span>
            </div>
          )}
        </div>

        {/* Feeds into chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          <span className="text-[10px] font-mono text-muted-foreground/40 mr-1">Feeds into:</span>
          {area.feedsInto.map((f) => (
            <FeedsChip key={f} label={f} />
          ))}
        </div>
      </div>

      {/* ── Guided prompts (collapsible) ─────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <button
          type="button"
          onClick={() => setPromptsExpanded((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/2 transition-colors"
          aria-expanded={promptsExpanded}
        >
          <span className="text-[11px] font-mono text-muted-foreground/60 tracking-wide uppercase">
            Guided Discovery Prompts
          </span>
          {promptsExpanded
            ? <ChevronUp  className="w-3.5 h-3.5 text-muted-foreground/40" aria-hidden="true" />
            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" aria-hidden="true" />
          }
        </button>
        {promptsExpanded && (
          <div className="border-t border-border/30 px-4 py-3 bg-white/[0.015] space-y-2">
            {area.prompts.map((prompt, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="flex-none w-4 h-4 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[9px] font-mono text-accent/60 mt-0.5"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <p className="text-xs text-muted-foreground/60 leading-relaxed">{prompt}</p>
              </div>
            ))}
            <p className="text-[10px] font-mono text-muted-foreground/30 mt-2 pt-2 border-t border-border/20">
              These prompts are for reference only — notes are free-form.
            </p>
          </div>
        )}
      </div>

      {/* ── Notes field ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase">
            Lead Advisor Notes
            <span className="ml-2 text-red-400/60">— Confidential</span>
          </label>
          {!isLocked && (
            <button
              type="button"
              onClick={handleSummarise}
              disabled={!hasNotes || isSummarising}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                hasNotes && !isSummarising
                  ? 'bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20'
                  : 'bg-muted/20 border border-border text-muted-foreground/40 cursor-not-allowed',
              )}
              aria-label={`Generate AI summary for ${area.title}`}
            >
              {isSummarising
                ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                : <Sparkles className="w-3 h-3" aria-hidden="true" />
              }
              {isSummarising ? 'Summarising…' : 'AI Summarise'}
            </button>
          )}
        </div>

        <AutoGrowTextarea
          value={areaData.notes}
          onChange={onNotesChange}
          disabled={isLocked}
          placeholder={
            `Enter your confidential notes for ${area.title} here…\n\n` +
            `Use the Guided Prompts above as reference. This field is free-form — ` +
            `write in whatever format works best for your analysis.`
          }
        />

        {!hasNotes && !isLocked && (
          <p className="text-[10px] font-mono text-muted-foreground/30">
            Use the guided prompts above for reference. Notes auto-save every 30 seconds.
          </p>
        )}
      </div>

      {/* ── AI Summary output ────────────────────────────────────────────── */}
      {hasSummary && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            <span className="text-[11px] font-mono text-accent/70 tracking-wide uppercase">
              AI-Generated Summary
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">
              gpt-4o-mini · confidential
            </span>
          </div>
          <div className="space-y-2">
            {hasBullets
              ? areaData.summary
                  .split('\n')
                  .filter(Boolean)
                  .map((bullet, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-accent/60 text-sm flex-none mt-0.5" aria-hidden="true">•</span>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {bullet.replace(/^[•\-]\s*/, '')}
                      </p>
                    </div>
                  ))
              : (
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {areaData.summary}
                </p>
              )
            }
          </div>
          {!isLocked && (
            <button
              type="button"
              onClick={handleSummarise}
              disabled={isSummarising}
              className="text-[10px] font-mono text-accent/50 hover:text-accent transition-colors disabled:opacity-40"
            >
              {isSummarising ? 'Regenerating…' : 'Regenerate summary'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
