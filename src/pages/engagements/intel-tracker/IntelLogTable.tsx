/**
 * IntelLogTable
 *
 * Scrollable table of intel items with:
 *  - Expandable rows (click row → show full summary, raw content, URL, action form)
 *  - Inline action status update
 *  - Escalate button → calls onEscalate
 *  - Source type badge, sentiment badge, urgency flag
 */

import { useState, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, Zap, Trash2, CheckCircle2,
  Clock, Eye, ArrowUpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelItem, ActionStatus } from '@/hooks/useIntelTracker';
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_COLOUR,
  ACTION_STATUS_LABELS,
} from '@/hooks/useIntelTracker';
import SentimentBadge from './SentimentBadge';

/* ─────────────────────────────────────────────
   Action status config
───────────────────────────────────────────── */

const ACTION_STATUS_CONFIG: Record<ActionStatus, {
  label: string;
  className: string;
  icon: React.ElementType;
}> = {
  pending:      { label: 'Pending',      className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',   icon: Clock },
  in_progress:  { label: 'In Progress',  className: 'text-blue-400 bg-blue-500/10 border-blue-500/30',      icon: Eye },
  done:         { label: 'Done',         className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  monitor_only: { label: 'Monitor Only', className: 'text-muted-foreground bg-muted/20 border-border/40',   icon: Eye },
};

function ActionStatusBadge({ status }: { status: ActionStatus | null }) {
  if (!status) return <span className="text-muted-foreground/30 text-[10px] font-mono">—</span>;
  const { label, className, icon: Icon } = ACTION_STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono', className)}>
      <Icon className="w-2.5 h-2.5 flex-none" />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Reach tier badge
───────────────────────────────────────────── */

function ReachBadge({ tier }: { tier: number | null }) {
  if (!tier) return <span className="text-muted-foreground/30 text-[10px] font-mono">—</span>;
  const colours = [
    '', // 0 unused
    'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'text-red-400 bg-red-500/10 border-red-500/30',
  ];
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-bold',
      colours[tier] ?? colours[1],
    )}>
      T{tier}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Expanded row content
───────────────────────────────────────────── */

interface ExpandedRowProps {
  item:           IntelItem;
  onStatusChange: (id: string, status: ActionStatus) => void;
  onEscalate:     (item: IntelItem) => void;
  onDelete:       (id: string) => void;
  isEscalating:   boolean;
  isDeleting:     boolean;
}

function ExpandedRow({
  item, onStatusChange, onEscalate, onDelete,
  isEscalating, isDeleting,
}: ExpandedRowProps) {
  return (
    <div className="px-4 pb-4 pt-3 bg-[#0a0a0c] border-t border-border/30 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Summary */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Summary</p>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {item.summary || <span className="text-muted-foreground/30 italic">No summary provided.</span>}
          </p>
        </div>

        {/* Raw content */}
        {item.raw_content && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Raw Content Preview</p>
            <div className="bg-[#0e0e10] rounded-lg border border-border/40 px-3 py-2 max-h-[100px] overflow-y-auto">
              <p className="text-[11px] font-mono text-muted-foreground/60 leading-relaxed whitespace-pre-wrap">
                {item.raw_content.slice(0, 600)}{item.raw_content.length > 600 ? '…' : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Source URL */}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-accent/70 hover:text-accent transition-colors font-mono"
        >
          <ExternalLink className="w-3 h-3" />
          View source: {item.url.length > 70 ? item.url.slice(0, 70) + '…' : item.url}
        </a>
      )}

      {/* Action status update row */}
      <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-border/20">
        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wide">Update Status:</span>
        {(Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map((status) => {
          const { label, className } = ACTION_STATUS_CONFIG[status];
          const isActive = item.action_status === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(item.id, status)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all',
                isActive
                  ? cn(className, 'ring-1')
                  : 'border-border/40 text-muted-foreground/40 hover:border-border hover:text-muted-foreground',
              )}
            >
              {label}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Escalate */}
        {!item.is_escalated && (
          <button
            type="button"
            onClick={() => onEscalate(item)}
            disabled={isEscalating}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
              'border border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors',
              isEscalating && 'opacity-50 cursor-not-allowed',
            )}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            {isEscalating ? 'Escalating…' : 'Escalate'}
          </button>
        )}
        {item.is_escalated && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/40 text-red-400 bg-red-500/10 opacity-60">
            <Zap className="w-3.5 h-3.5" />
            Escalated
          </span>
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${item.headline}"? This cannot be undone.`)) onDelete(item.id);
          }}
          disabled={isDeleting}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
            'border border-border/40 text-muted-foreground/50 hover:border-red-500/40 hover:text-red-400 transition-colors',
            isDeleting && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */

interface IntelLogTableProps {
  items:          IntelItem[];
  isLoading:      boolean;
  onStatusChange: (id: string, status: ActionStatus) => void;
  onEscalate:     (item: IntelItem) => void;
  onDelete:       (id: string) => void;
  escalatingId:   string | null;
  deletingId:     string | null;
}

export default function IntelLogTable({
  items, isLoading,
  onStatusChange, onEscalate, onDelete,
  escalatingId, deletingId,
}: IntelLogTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 overflow-hidden animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-border/30 bg-muted/10" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 p-12 text-center">
        <p className="text-sm text-muted-foreground/50">No intelligence items match the current filters.</p>
        <p className="text-[11px] font-mono text-muted-foreground/30 mt-1">Add items using the "Add Intel Item" button above.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      {/* Table header */}
      <div className="grid bg-[#0e0e10] border-b border-border/60 px-4 py-2.5 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest"
        style={{ gridTemplateColumns: '100px 1fr 100px 120px 90px 90px 110px 110px 60px' }}
      >
        <span>Date</span>
        <span>Headline / Source</span>
        <span>Type</span>
        <span>Sentiment</span>
        <span>Reach</span>
        <span>Theme</span>
        <span>Action</span>
        <span>Status</span>
        <span className="text-right">Flags</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {items.map((item) => {
          const isExpanded  = expandedIds.has(item.id);
          const dateStr = new Date(item.date_logged).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: '2-digit',
          });

          return (
            <div key={item.id} className={cn('group', isExpanded && 'bg-[#0a0a0c]/50')}>
              {/* Main row */}
              <div
                className={cn(
                  'grid items-center px-4 py-3 cursor-pointer gap-3',
                  'hover:bg-white/[0.02] transition-colors',
                  item.is_urgent && !item.is_escalated && 'border-l-2 border-amber-500/60',
                  item.is_escalated && 'border-l-2 border-red-500/60',
                )}
                style={{ gridTemplateColumns: '100px 1fr 100px 120px 90px 90px 110px 110px 60px' }}
                onClick={() => toggle(item.id)}
                role="button"
                aria-expanded={isExpanded}
              >
                {/* Date */}
                <span className="text-[11px] font-mono text-muted-foreground/60">{dateStr}</span>

                {/* Headline + source */}
                <div className="min-w-0">
                  <p className={cn(
                    'text-xs font-semibold text-foreground truncate',
                    item.is_urgent && 'text-amber-300',
                  )}>
                    {item.headline}
                  </p>
                  {item.source_name && (
                    <p className="text-[10px] text-muted-foreground/50 font-mono truncate">{item.source_name}</p>
                  )}
                </div>

                {/* Source type */}
                <div>
                  {item.source_type ? (
                    <span className={cn(
                      'inline-flex px-1.5 py-0.5 rounded-md border text-[10px] font-mono',
                      SOURCE_TYPE_COLOUR[item.source_type],
                    )}>
                      {SOURCE_TYPE_LABELS[item.source_type]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30 text-[10px] font-mono">—</span>
                  )}
                </div>

                {/* Sentiment */}
                <SentimentBadge score={item.sentiment_score} showScore />

                {/* Reach tier */}
                <ReachBadge tier={item.reach_tier} />

                {/* Theme */}
                <span className="text-[10px] font-mono text-muted-foreground/60 truncate">
                  {item.narrative_theme ?? '—'}
                </span>

                {/* Action required */}
                <span className="text-[10px] font-mono text-muted-foreground/60 truncate">
                  {item.action_required
                    ? <span className="text-amber-400">Required</span>
                    : <span className="text-muted-foreground/30">None</span>
                  }
                </span>

                {/* Action status */}
                <ActionStatusBadge status={item.action_status} />

                {/* Flags */}
                <div className="flex items-center gap-1 justify-end">
                  {item.is_urgent && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-none" title="Urgent" />
                  )}
                  {item.is_escalated && (
                    <Zap className="w-3.5 h-3.5 text-red-400 flex-none" title="Escalated" />
                  )}
                  {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40 ml-1" />
                    : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40 ml-1 transition-colors" />
                  }
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <ExpandedRow
                  item={item}
                  onStatusChange={onStatusChange}
                  onEscalate={onEscalate}
                  onDelete={onDelete}
                  isEscalating={escalatingId === item.id}
                  isDeleting={deletingId === item.id}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[#0e0e10] border-t border-border/30">
        <span className="text-[10px] font-mono text-muted-foreground/40">
          {items.length} item{items.length !== 1 ? 's' : ''} · Click any row to expand detail
        </span>
      </div>
    </div>
  );
}
