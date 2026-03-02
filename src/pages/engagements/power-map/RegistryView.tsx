/**
 * RegistryView
 *
 * Full LBDDataTable for all stakeholders with:
 *  - Filters: Category, Alignment, Strategic Priority, Search
 *  - 11 columns: Name, Role, Category, Influence, Alignment, Priority,
 *                Owner, Last Contact, Frequency, Risk Level, Actions
 *  - Row click → open edit drawer
 *  - CSV export
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Edit2, Trash2, Filter,
} from 'lucide-react';
import {
  LBDDataTable,
  LBDBadge,
} from '@/components/ui/lbd';
import type { ColumnDef } from '@/components/ui/lbd';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/lbd';
import type {
  StakeholderRow,
  StakeholderAlignment,
  StakeholderCategory,
  StrategicPriority,
} from '@/hooks/usePowerMap';
import {
  ALIGNMENT_LABELS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
} from '@/hooks/usePowerMap';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface RegistryViewProps {
  stakeholders:   StakeholderRow[];
  isLoading:      boolean;
  onEdit:         (row: StakeholderRow) => void;
  onDelete:       (id: string) => Promise<void>;
  tableRef?:      React.RefObject<HTMLDivElement>;
}

/* ─────────────────────────────────────────────
   Influence bar cell
───────────────────────────────────────────── */

function InfluenceBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground/30 text-xs font-mono">—</span>;
  const pct = (score / 10) * 100;
  const colour =
    score >= 8 ? 'bg-accent' :
    score >= 5 ? 'bg-emerald-400' :
    score >= 3 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <span className="text-xs font-mono text-foreground tabular-nums w-4">{score}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', colour)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Filter pill component
───────────────────────────────────────────── */

function FilterPill<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (v: T | '') => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | '')}
      className={cn(
        'px-2.5 py-1.5 rounded-lg text-xs border transition-colors',
        'bg-[#0a0a0c] focus:outline-none focus:ring-1 focus:ring-accent/40',
        value
          ? 'border-accent/40 text-accent'
          : 'border-border/60 text-muted-foreground/60',
      )}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ─────────────────────────────────────────────
   Alignment badge colours
───────────────────────────────────────────── */

const ALIGNMENT_BADGE_VARIANT = 'alignment' as const;

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function RegistryView({
  stakeholders, isLoading, onEdit, onDelete, tableRef,
}: RegistryViewProps) {
  const [filterCategory,  setFilterCategory]  = useState<StakeholderCategory | ''>('');
  const [filterAlignment, setFilterAlignment] = useState<StakeholderAlignment | ''>('');
  const [filterPriority,  setFilterPriority]  = useState<StrategicPriority | ''>('');
  const [deletingId,      setDeletingId]      = useState<string | null>(null);

  /* ── Filtered data ───────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return stakeholders.filter((s) => {
      if (filterCategory  && s.category           !== filterCategory)  return false;
      if (filterAlignment && s.alignment           !== filterAlignment) return false;
      if (filterPriority  && s.strategic_priority  !== filterPriority)  return false;
      return true;
    });
  }, [stakeholders, filterCategory, filterAlignment, filterPriority]);

  /* ── Delete handler ─────────────────────────────────────────── */
  const handleDelete = useCallback(async (row: StakeholderRow) => {
    if (!confirm(`Remove "${row.name}" from this engagement's stakeholder map?`)) return;
    setDeletingId(row.id);
    try {
      await onDelete(row.id);
      toast.success('Stakeholder removed', `${row.name} has been removed from the map.`);
    } catch (err: unknown) {
      toast.error('Delete failed', (err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }, [onDelete]);

  /* ── Columns ────────────────────────────────────────────────── */
  const columns = useMemo<ColumnDef<StakeholderRow>[]>(() => [
    {
      key:      'name',
      label:    'Name',
      sortable: true,
      width:    200,
      render:   (_, row) => (
        <div>
          <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">{row.name}</p>
          {row.role_position && (
            <p className="text-[10px] text-muted-foreground/50 truncate max-w-[180px]">{row.role_position}</p>
          )}
        </div>
      ),
    },
    {
      key:      'category',
      label:    'Category',
      sortable: true,
      width:    120,
      render:   (_, row) => (
        <LBDBadge variant="outline">
          {CATEGORY_LABELS[row.category] ?? row.category}
        </LBDBadge>
      ),
    },
    {
      key:      'influence_score',
      label:    'Influence',
      sortable: true,
      width:    110,
      render:   (_, row) => <InfluenceBar score={row.influence_score} />,
    },
    {
      key:      'alignment',
      label:    'Alignment',
      sortable: true,
      width:    110,
      render:   (_, row) => row.alignment ? (
        <LBDBadge variant={ALIGNMENT_BADGE_VARIANT} value={row.alignment as string}>
          {ALIGNMENT_LABELS[row.alignment]}
        </LBDBadge>
      ) : (
        <span className="text-muted-foreground/30 text-xs font-mono">—</span>
      ),
    },
    {
      key:      'strategic_priority',
      label:    'Priority',
      sortable: true,
      width:    100,
      render:   (_, row) => row.strategic_priority ? (
        <LBDBadge variant="priority" value={row.strategic_priority as string}>
          {PRIORITY_LABELS[row.strategic_priority]}
        </LBDBadge>
      ) : (
        <span className="text-muted-foreground/30 text-xs font-mono">—</span>
      ),
    },
    {
      key:      'owner_name',
      label:    'Relationship Owner',
      sortable: true,
      width:    150,
      render:   (_, row) => (
        <span className="text-xs text-muted-foreground/70">
          {row.owner_name ?? <span className="text-muted-foreground/30 font-mono">—</span>}
        </span>
      ),
    },
    {
      key:      'last_contact_date',
      label:    'Last Contact',
      sortable: true,
      width:    110,
      render:   (_, row) => {
        if (!row.last_contact_date) return <span className="text-muted-foreground/30 text-xs font-mono">—</span>;
        const d = new Date(row.last_contact_date);
        const isOverdue = (() => {
          const freq = row.contact_frequency?.toLowerCase() ?? '';
          let days = 90;
          if (freq.includes('week'))    days = 7;
          if (freq.includes('fortni'))  days = 14;
          if (freq.includes('month'))   days = 30;
          if (freq.includes('quarter')) days = 90;
          return Date.now() - d.getTime() > days * 864e5;
        })();
        return (
          <span className={cn(
            'text-xs font-mono',
            isOverdue ? 'text-amber-400' : 'text-muted-foreground/70',
          )}>
            {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
        );
      },
    },
    {
      key:      'contact_frequency',
      label:    'Freq',
      sortable: false,
      width:    90,
      render:   (_, row) => (
        <span className="text-xs text-muted-foreground/50 font-mono">
          {row.contact_frequency ?? '—'}
        </span>
      ),
    },
    {
      key:      'risk_level',
      label:    'Risk',
      sortable: false,
      width:    110,
      render:   (_, row) => {
        const risk = row.risk_level;
        if (!risk) return <span className="text-muted-foreground/30 text-xs font-mono">—</span>;
        const isHigh = risk.toLowerCase().includes('high') || risk.toLowerCase().includes('critical');
        return (
          <span className={cn(
            'text-xs font-mono',
            isHigh ? 'text-red-400' : 'text-muted-foreground/60',
          )}>
            {risk}
          </span>
        );
      },
    },
    {
      key:      '_actions',
      label:    '',
      sortable: false,
      width:    80,
      noExport: true,
      render:   (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(row); }}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground/50 hover:text-accent hover:bg-accent/10 transition-colors"
            title="Edit stakeholder"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
            disabled={deletingId === row.id}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground/50 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
            title="Remove stakeholder"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], [onEdit, handleDelete, deletingId]);

  /* ── Active filter count ─────────────────────────────────────── */
  const activeFilters = [filterCategory, filterAlignment, filterPriority].filter(Boolean).length;

  /* ── Toolbar ─────────────────────────────────────────────────── */
  const toolbarLeft = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-muted-foreground/50">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-[10px] font-mono uppercase tracking-wide">Filter</span>
        {activeFilters > 0 && (
          <span className="w-4 h-4 rounded-full bg-accent text-black text-[9px] font-bold flex items-center justify-center">
            {activeFilters}
          </span>
        )}
      </div>

      <FilterPill
        label="All Categories"
        value={filterCategory}
        onChange={setFilterCategory}
        options={(Object.keys(CATEGORY_LABELS) as StakeholderCategory[]).map((k) => ({
          value: k, label: CATEGORY_LABELS[k],
        }))}
      />
      <FilterPill
        label="All Alignments"
        value={filterAlignment}
        onChange={setFilterAlignment}
        options={(Object.keys(ALIGNMENT_LABELS) as StakeholderAlignment[]).map((k) => ({
          value: k, label: ALIGNMENT_LABELS[k],
        }))}
      />
      <FilterPill
        label="All Priorities"
        value={filterPriority}
        onChange={setFilterPriority}
        options={(Object.keys(PRIORITY_LABELS) as StrategicPriority[]).map((k) => ({
          value: k, label: PRIORITY_LABELS[k],
        }))}
      />
      {activeFilters > 0 && (
        <button
          type="button"
          onClick={() => { setFilterCategory(''); setFilterAlignment(''); setFilterPriority(''); }}
          className="text-[10px] font-mono text-accent/60 hover:text-accent transition-colors underline"
        >
          Clear
        </button>
      )}
    </div>
  );

  return (
    <div ref={tableRef}>
      <LBDDataTable<StakeholderRow>
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No stakeholders yet"
        emptyDescription="Add your first stakeholder to build the intelligence map."
        enableSearch
        searchPlaceholder="Search by name, role…"
        enablePagination
        defaultPageSize={25}
        enableExport
        exportFilename="stakeholder-registry"
        toolbarLeft={toolbarLeft}
        stickyHeader
        onRowClick={onEdit}
      />
    </div>
  );
}
