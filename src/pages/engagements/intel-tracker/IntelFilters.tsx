/**
 * IntelFilters
 *
 * Filter bar for the Intelligence Log table.
 * Controls: Date From/To | Source Type | Sentiment Range | Action Status
 *           Narrative Theme | Urgent Only toggle
 */

import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceType, ActionStatus } from '@/hooks/useIntelTracker';
import { SOURCE_TYPE_LABELS, ACTION_STATUS_LABELS } from '@/hooks/useIntelTracker';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface IntelFilterState {
  dateFrom:        string;
  dateTo:          string;
  sourceType:      SourceType | '';
  sentimentRange:  'all' | 'positive' | 'neutral' | 'negative';
  actionStatus:    ActionStatus | '';
  narrativeTheme:  string;
  urgentOnly:      boolean;
}

export const DEFAULT_FILTERS: IntelFilterState = {
  dateFrom:       '',
  dateTo:         '',
  sourceType:     '',
  sentimentRange: 'all',
  actionStatus:   '',
  narrativeTheme: '',
  urgentOnly:     false,
};

/* ─────────────────────────────────────────────
   Helper select component
───────────────────────────────────────────── */

function FilterSelect<T extends string>({
  value, onChange, options, placeholder, active,
}: {
  value: T | '';
  onChange: (v: T | '') => void;
  options: { value: T; label: string }[];
  placeholder: string;
  active?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | '')}
      className={cn(
        'px-2.5 py-1.5 rounded-lg text-xs border transition-colors bg-[#0a0a0c]',
        'focus:outline-none focus:ring-1 focus:ring-accent/40',
        active
          ? 'border-accent/40 text-accent'
          : 'border-border/60 text-muted-foreground/60',
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function DateInput({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'px-2.5 py-1.5 rounded-lg text-xs border transition-colors bg-[#0a0a0c]',
        'focus:outline-none focus:ring-1 focus:ring-accent/40',
        value ? 'border-accent/40 text-accent' : 'border-border/60 text-muted-foreground/40',
      )}
    />
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

interface IntelFiltersProps {
  filters:          IntelFilterState;
  onChange:         (f: IntelFilterState) => void;
  availableThemes:  string[];
}

export default function IntelFilters({ filters, onChange, availableThemes }: IntelFiltersProps) {
  const set = <K extends keyof IntelFilterState>(key: K, value: IntelFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const activeCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.sourceType,
    filters.sentimentRange !== 'all',
    filters.actionStatus,
    filters.narrativeTheme,
    filters.urgentOnly,
  ].filter(Boolean).length;

  const hasFilters = activeCount > 0;

  const sourceOptions = (Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((k) => ({
    value: k, label: SOURCE_TYPE_LABELS[k],
  }));
  const actionOptions = (Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map((k) => ({
    value: k, label: ACTION_STATUS_LABELS[k],
  }));
  const sentimentOptions = [
    { value: 'positive' as const, label: 'Positive (>+0.3)' },
    { value: 'neutral'  as const, label: 'Neutral (−0.5 to +0.3)' },
    { value: 'negative' as const, label: 'Negative (<−0.5)' },
  ];
  const themeOptions = availableThemes.map((t) => ({ value: t, label: t }));

  return (
    <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl border border-border/40 bg-card/30">
      <div className="flex items-center gap-1.5 text-muted-foreground/50 flex-none">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-[10px] font-mono uppercase tracking-wide">Filters</span>
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-accent text-black text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </div>

      {/* Date From / To */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-muted-foreground/40">From</span>
        <DateInput
          value={filters.dateFrom}
          onChange={(v) => set('dateFrom', v)}
          placeholder="From"
        />
        <span className="text-[10px] font-mono text-muted-foreground/40">To</span>
        <DateInput
          value={filters.dateTo}
          onChange={(v) => set('dateTo', v)}
          placeholder="To"
        />
      </div>

      {/* Source Type */}
      <FilterSelect<SourceType>
        value={filters.sourceType}
        onChange={(v) => set('sourceType', v)}
        options={sourceOptions}
        placeholder="All Sources"
        active={!!filters.sourceType}
      />

      {/* Sentiment */}
      <FilterSelect<IntelFilterState['sentimentRange']>
        value={filters.sentimentRange === 'all' ? '' : filters.sentimentRange}
        onChange={(v) => set('sentimentRange', v || 'all')}
        options={sentimentOptions}
        placeholder="All Sentiment"
        active={filters.sentimentRange !== 'all'}
      />

      {/* Action Status */}
      <FilterSelect<ActionStatus>
        value={filters.actionStatus}
        onChange={(v) => set('actionStatus', v)}
        options={actionOptions}
        placeholder="All Actions"
        active={!!filters.actionStatus}
      />

      {/* Narrative Theme */}
      {themeOptions.length > 0 && (
        <FilterSelect<string>
          value={filters.narrativeTheme}
          onChange={(v) => set('narrativeTheme', v)}
          options={themeOptions}
          placeholder="All Themes"
          active={!!filters.narrativeTheme}
        />
      )}

      {/* Urgent Only toggle */}
      <button
        type="button"
        onClick={() => set('urgentOnly', !filters.urgentOnly)}
        className={cn(
          'px-2.5 py-1.5 rounded-lg text-xs border transition-colors font-semibold',
          filters.urgentOnly
            ? 'border-red-500/50 bg-red-500/10 text-red-400'
            : 'border-border/60 text-muted-foreground/60 hover:border-border',
        )}
      >
        ⚡ Urgent Only
      </button>

      {/* Clear all */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="inline-flex items-center gap-1 text-[10px] font-mono text-accent/60 hover:text-accent transition-colors"
        >
          <X className="w-3 h-3" />
          Clear all
        </button>
      )}
    </div>
  );
}
