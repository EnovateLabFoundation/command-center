/**
 * DiscoveryBriefModal
 *
 * Full-screen preview of the generated Discovery Brief — a professional
 * document formatted from all seven area summaries. Includes a
 * Print/Export PDF button that triggers the browser print dialog,
 * which allows saving as PDF via native OS print.
 */

import { useRef } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { DISCOVERY_AREAS } from './discoveryAreas';
import type { AreasRecord } from '@/hooks/useDiscoverySession';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface DiscoveryBriefModalProps {
  open:           boolean;
  onClose:        () => void;
  clientName:     string;
  engagementTitle: string;
  leadAdvisor:    string | undefined;
  startDate:      string | undefined;
  areas:          AreasRecord;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function DiscoveryBriefModal({
  open,
  onClose,
  clientName,
  engagementTitle,
  leadAdvisor,
  startDate,
  areas,
}: DiscoveryBriefModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  function handlePrint() {
    window.print();
  }

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Discovery Brief"
    >
      {/* Container */}
      <div className="relative w-full max-w-4xl h-[90vh] flex flex-col bg-[#0e0e10] rounded-2xl border border-border overflow-hidden">

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-none">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">Discovery Brief Preview</span>
            <span className="text-xs font-mono text-muted-foreground/50 ml-2">CONFIDENTIAL</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors print:hidden"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              Print / Export PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Discovery Brief"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors print:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable document ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div
            ref={printRef}
            className={cn(
              'max-w-3xl mx-auto px-8 py-10 space-y-8',
              'print:max-w-none print:px-10 print:py-8',
            )}
          >
            {/* Document header */}
            <div className="space-y-1 border-b border-border pb-6">
              <p className="text-[10px] font-mono tracking-[0.4em] text-accent uppercase">
                LBD Political Intelligence — Confidential
              </p>
              <h1 className="text-2xl font-bold text-foreground mt-3">
                Discovery Brief
              </h1>
              <p className="text-lg text-muted-foreground">{engagementTitle}</p>

              <div className="grid grid-cols-3 gap-6 mt-6 pt-4 border-t border-border/50">
                {[
                  { label: 'Client',        value: clientName },
                  { label: 'Lead Advisor',  value: leadAdvisor ?? '—' },
                  { label: 'Date',          value: today },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] font-mono tracking-widest text-muted-foreground/40 uppercase">{label}</p>
                    <p className="text-sm text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800/30">
                <p className="text-[10px] font-mono text-red-400/80 tracking-wide">
                  STRICTLY CONFIDENTIAL — This document contains privileged strategic intelligence.
                  Distribution is restricted to authorised personnel only.
                </p>
              </div>
            </div>

            {/* Area sections */}
            {DISCOVERY_AREAS.map((area) => {
              const data    = areas[String(area.index)];
              const notes   = data?.notes?.trim()   ?? '';
              const summary = data?.summary?.trim() ?? '';
              const hasContent = notes || summary;

              return (
                <div key={area.index} className="space-y-3">
                  {/* Area header */}
                  <div className="flex items-center gap-3">
                    <div className="flex-none w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <span className="text-xs font-mono font-bold text-accent">{area.index}</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                        {area.title}
                      </h2>
                      <p className="text-[10px] font-mono text-muted-foreground/50">
                        Feeds into: {area.feedsInto.join(' · ')}
                      </p>
                    </div>
                  </div>

                  {/* AI Summary bullets */}
                  {summary ? (
                    <div className="pl-10 space-y-1.5">
                      {summary.split('\n').filter(Boolean).map((line, i) => (
                        <p
                          key={i}
                          className="text-xs text-foreground leading-relaxed"
                        >
                          {line.trim()}
                        </p>
                      ))}
                    </div>
                  ) : notes ? (
                    <div className="pl-10">
                      <p className="text-xs text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
                        {notes}
                      </p>
                      <p className="text-[10px] font-mono text-amber-500/60 mt-1">
                        AI summary not yet generated for this area.
                      </p>
                    </div>
                  ) : (
                    <div className="pl-10">
                      <p className="text-[10px] font-mono text-muted-foreground/30 italic">
                        No notes captured for this area.
                      </p>
                    </div>
                  )}

                  {area.index < 7 && (
                    <div className="border-b border-border/30 pt-3" />
                  )}
                </div>
              );
            })}

            {/* Footer */}
            <div className="border-t border-border pt-6 mt-8">
              <p className="text-[9px] font-mono text-muted-foreground/30 text-center">
                Generated {today} · LBD Political Intelligence · Strictly Confidential
                {startDate && ` · Engagement commenced ${startDate}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
