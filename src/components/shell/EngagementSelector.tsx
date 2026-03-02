/**
 * EngagementSelector
 *
 * Header dropdown that lets the user switch between their active engagements.
 * Reads and writes to EngagementContext. The selected engagement is persisted
 * to localStorage via the context setter.
 *
 * Rendered inside AppShell's top header bar.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Briefcase, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEngagement, type Engagement } from '@/contexts/EngagementContext';
import { LBDBadge } from '@/components/ui/lbd';

/* ─────────────────────────────────────────────
   RAG → badge variant map
───────────────────────────────────────────── */

const ragVariant: Record<Engagement['health_rag'], 'green' | 'amber' | 'red'> = {
  green: 'green',
  amber: 'amber',
  red:   'red',
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export function EngagementSelector() {
  const { engagements, selectedEngagement, setSelectedEngagement, isLoading } = useEngagement();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Close on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* Focus search input when dropdown opens */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const filtered = engagements.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelect(engagement: Engagement) {
    setSelectedEngagement(engagement);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select engagement"
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open
            ? 'bg-accent/10 border-accent/40 text-foreground'
            : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-accent/30',
        )}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-none" aria-hidden="true" />
        ) : (
          <Briefcase className="w-3.5 h-3.5 flex-none" aria-hidden="true" />
        )}

        <span className="max-w-[180px] truncate text-xs font-medium">
          {selectedEngagement ? selectedEngagement.title : 'Select Engagement'}
        </span>

        {selectedEngagement && (
          <LBDBadge variant={ragVariant[selectedEngagement.health_rag]} size="sm">
            {selectedEngagement.health_rag.toUpperCase()}
          </LBDBadge>
        )}

        <ChevronDown
          className={cn(
            'w-3 h-3 flex-none transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          aria-label="Engagement list"
          className={cn(
            'absolute top-full left-0 mt-1.5 z-50',
            'w-[280px] rounded-xl border border-border bg-card shadow-xl',
            'animate-in fade-in-0 zoom-in-95 duration-150',
          )}
        >
          {/* Search */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search engagements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'w-full bg-background rounded-lg px-3 py-1.5 text-xs',
                'border border-border placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'text-foreground',
              )}
              aria-label="Search engagements"
            />
          </div>

          {/* Engagement list */}
          <div className="max-h-[280px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                {engagements.length === 0 ? 'No active engagements' : 'No results found'}
              </p>
            )}

            {filtered.map((engagement) => {
              const isSelected = selectedEngagement?.id === engagement.id;
              return (
                <button
                  key={engagement.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(engagement)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                    'hover:bg-white/5 focus-visible:outline-none focus-visible:bg-white/5',
                    isSelected && 'bg-accent/5',
                  )}
                >
                  {/* Check / placeholder */}
                  <span className="flex-none w-3.5 h-3.5 flex items-center justify-center">
                    {isSelected && (
                      <Check className="w-3 h-3 text-accent" aria-hidden="true" />
                    )}
                  </span>

                  {/* Engagement info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-xs font-medium truncate',
                      isSelected ? 'text-accent' : 'text-foreground',
                    )}>
                      {engagement.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Phase {engagement.phase}
                    </p>
                  </div>

                  {/* RAG badge */}
                  <LBDBadge variant={ragVariant[engagement.health_rag]} size="sm">
                    {engagement.health_rag.toUpperCase()}
                  </LBDBadge>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {engagements.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                onClick={() => {
                  setSelectedEngagement(null);
                  setOpen(false);
                }}
                className="w-full text-center text-[10px] font-mono tracking-widest text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                CLEAR SELECTION
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
