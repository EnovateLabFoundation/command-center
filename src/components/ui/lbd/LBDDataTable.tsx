import {
  useState,
  useMemo,
  useCallback,
  type ReactNode,
  type ChangeEvent,
} from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDLoadingSkeleton } from './LBDLoadingSkeleton';
import { LBDEmptyState } from './LBDEmptyState';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  /** Custom cell renderer */
  render?: (value: unknown, row: T, index: number) => ReactNode;
  /** Column hidden from CSV export */
  noExport?: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface LBDDataTableProps<T extends Record<string, unknown>> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Unique row key extractor */
  rowKey?: (row: T, index: number) => string | number;
  isLoading?: boolean;
  loadingRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Alias for emptyTitle */
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  enableSearch?: boolean;
  /** Alias for enableSearch */
  searchable?: boolean;
  searchPlaceholder?: string;
  enablePagination?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  enableRowSelection?: boolean;
  onSelectedRowsChange?: (rows: T[]) => void;
  enableExport?: boolean;
  exportFilename?: string;
  onRowClick?: (row: T) => void;
  /** Slot rendered left of the search bar */
  toolbarLeft?: ReactNode;
  /** Slot rendered right of the search bar */
  toolbarRight?: ReactNode;
  className?: string;
  stickyHeader?: boolean;
}

/* ─────────────────────────────────────────────
   CSV export helper
───────────────────────────────────────────── */

function exportCSV<T extends Record<string, unknown>>(
  columns: ColumnDef<T>[],
  data: T[],
  filename: string,
) {
  const exportCols = columns.filter((c) => !c.noExport);
  const header = exportCols.map((c) => `"${c.label}"`).join(',');
  const rows = data.map((row) =>
    exportCols
      .map((c) => {
        const val = String(row[c.key] ?? '');
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(','),
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────
   Sort icon
───────────────────────────────────────────── */

function SortIcon({ colKey, sortConfig }: { colKey: string; sortConfig: SortConfig | null }) {
  if (!sortConfig || sortConfig.key !== colKey) {
    return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40" aria-hidden="true" />;
  }
  return sortConfig.direction === 'asc'
    ? <ChevronUp className="w-3 h-3 text-accent" aria-hidden="true" />
    : <ChevronDown className="w-3 h-3 text-accent" aria-hidden="true" />;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export function LBDDataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  isLoading = false,
  loadingRows = 6,
  emptyTitle: emptyTitleProp,
  emptyDescription = 'There are no items to display.',
  emptyMessage,
  emptyIcon,
  enableSearch: enableSearchProp,
  searchable,
  searchPlaceholder = 'Search…',
  enablePagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  enableRowSelection = false,
  onSelectedRowsChange,
  enableExport = false,
  exportFilename = 'export',
  onRowClick,
  toolbarLeft,
  toolbarRight,
  className,
  stickyHeader = false,
}: LBDDataTableProps<T>) {
  const enableSearch = enableSearchProp ?? searchable ?? true;
  const emptyTitle = emptyTitleProp ?? emptyMessage ?? 'No records found';
  const [searchQuery, setSearchQuery]       = useState('');
  const [sortConfig, setSortConfig]         = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage]       = useState(1);
  const [pageSize, setPageSize]             = useState(defaultPageSize);
  const [selectedKeys, setSelectedKeys]     = useState<Set<string | number>>(new Set());

  /* ── Search + sort ── */
  const processed = useMemo(() => {
    let rows = [...data];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q)),
      );
    }

    if (sortConfig) {
      rows.sort((a, b) => {
        const av = String(a[sortConfig.key] ?? '');
        const bv = String(b[sortConfig.key] ?? '');
        const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  }, [data, searchQuery, sortConfig]);

  /* ── Pagination ── */
  const totalRows  = processed.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const start      = (safePage - 1) * pageSize;
  const pageRows   = enablePagination ? processed.slice(start, start + pageSize) : processed;

  /* ── Row keys ── */
  const getKey = useCallback(
    (row: T, index: number) => rowKey ? rowKey(row, index) : index,
    [rowKey],
  );

  /* ── Sort toggle ── */
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc')  return { key, direction: 'desc' };
      return null; // third click clears
    });
    setCurrentPage(1);
  };

  /* ── Search change ── */
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  /* ── Row selection ── */
  const allPageSelected = pageRows.length > 0 && pageRows.every((_, i) => selectedKeys.has(getKey(_, i + start)));

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageRows.forEach((_, i) => next.delete(getKey(_, i + start)));
      } else {
        pageRows.forEach((_, i) => next.add(getKey(_, i + start)));
      }
      onSelectedRowsChange?.(processed.filter((_, i) => next.has(getKey(_, i))));
      return next;
    });
  };

  const toggleRow = (key: string | number, row: T) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onSelectedRowsChange?.(processed.filter((_, i) => next.has(getKey(_, i))));
      return next;
    });
    void row; // suppress unused warning
  };

  /* ── Export ── */
  const handleExport = () => exportCSV(columns, processed, exportFilename);

  /* ── Render ── */
  const alignClass = (a?: string) =>
    a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';

  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {/* ── Toolbar ── */}
      {(enableSearch || enableExport || toolbarLeft || toolbarRight) && (
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {toolbarLeft}

          {enableSearch && (
            <div className="relative flex-1 min-w-[180px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearch}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                aria-label="Search table"
              />
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {toolbarRight}
            {enableExport && (
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Export to CSV"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Export
              </button>
            )}
            {enableRowSelection && selectedKeys.size > 0 && (
              <span className="text-xs font-mono text-accent px-2 py-1 bg-accent/10 rounded-md border border-accent/20">
                {selectedKeys.size} selected
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Table wrapper ── */}
      {isLoading ? (
        <LBDLoadingSkeleton variant="table" rows={loadingRows} cols={columns.length} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              aria-label="Data table"
              aria-rowcount={totalRows}
            >
              {/* ── Head ── */}
              <thead
                className={cn(
                  'bg-card/80 border-b border-border',
                  stickyHeader && 'sticky top-0 z-10',
                )}
              >
                <tr>
                  {enableRowSelection && (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-border bg-background accent-accent w-3.5 h-3.5 cursor-pointer"
                        aria-label="Select all rows on this page"
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'px-4 py-3 font-mono text-[10px] tracking-widest text-muted-foreground',
                        alignClass(col.align),
                        col.sortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
                      )}
                      style={col.width ? { width: col.width } : undefined}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      aria-sort={
                        col.sortable && sortConfig?.key === col.key
                          ? sortConfig.direction === 'asc' ? 'ascending' : 'descending'
                          : col.sortable ? 'none' : undefined
                      }
                      scope="col"
                    >
                      <div
                        className={cn(
                          'inline-flex items-center gap-1',
                          col.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {col.label}
                        {col.sortable && (
                          <SortIcon colKey={col.key} sortConfig={sortConfig} />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ── Body ── */}
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                      className="bg-card"
                    >
                      <LBDEmptyState
                        icon={emptyIcon}
                        title={emptyTitle}
                        description={searchQuery ? `No results for "${searchQuery}"` : emptyDescription}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => {
                    const key = getKey(row, idx + start);
                    const isSelected = selectedKeys.has(key);
                    return (
                      <tr
                        key={key}
                        className={cn(
                          'border-b border-border/40 transition-colors',
                          'bg-card hover:bg-card/80',
                          isSelected && 'bg-accent/5 hover:bg-accent/10',
                          onRowClick && 'cursor-pointer',
                        )}
                        onClick={() => onRowClick?.(row)}
                        aria-selected={enableRowSelection ? isSelected : undefined}
                      >
                        {enableRowSelection && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(key, row)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-border bg-background accent-accent w-3.5 h-3.5 cursor-pointer"
                              aria-label={`Select row ${idx + 1}`}
                            />
                          </td>
                        )}
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={cn(
                              'px-4 py-3 text-foreground/90',
                              alignClass(col.align),
                            )}
                          >
                            {col.render
                              ? col.render(row[col.key], row, idx + start)
                              : String(row[col.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {enablePagination && !isLoading && totalRows > 0 && (
        <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
          {/* Row info + page size */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {start + 1}–{Math.min(start + pageSize, totalRows)} of{' '}
              <span className="text-foreground font-mono">{totalRows}</span>
            </span>
            <label className="flex items-center gap-1.5">
              Rows:
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-card border border-border rounded px-1.5 py-0.5 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1" aria-label="Pagination">
            <PagBtn
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              aria-label="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </PagBtn>
            <PagBtn
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </PagBtn>

            {/* Page number bubbles */}
            {getPageNumbers(safePage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-xs">…</span>
              ) : (
                <PagBtn
                  key={p}
                  onClick={() => setCurrentPage(Number(p))}
                  active={safePage === p}
                  aria-label={`Page ${p}`}
                  aria-current={safePage === p ? 'page' : undefined}
                >
                  {p}
                </PagBtn>
              ),
            )}

            <PagBtn
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </PagBtn>
            <PagBtn
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              aria-label="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </PagBtn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page-number button helper
───────────────────────────────────────────── */

interface PagBtnProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  'aria-label'?: string;
  'aria-current'?: 'page' | undefined;
}

function PagBtn({ children, onClick, disabled, active, ...aria }: PagBtnProps) {
  return (
    <button
      {...aria}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-accent text-accent-foreground font-semibold'
          : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border',
        disabled && 'opacity-30 pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Page number range helper
───────────────────────────────────────────── */

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [];
  pages.push(1);
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}
