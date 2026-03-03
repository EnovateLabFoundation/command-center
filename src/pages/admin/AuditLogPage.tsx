/**
 * AuditLogPage
 *
 * Full audit log viewer for super_admin. Displays all audit_logs entries
 * with filtering by user, action type, table, and date range.
 * Supports CSV export for compliance/legal review.
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ScrollText, Eye } from 'lucide-react';
import {
  LBDPageHeader, LBDDataTable, LBDModal, LBDBadge,
} from '@/components/ui/lbd';
import type { ColumnDef } from '@/components/ui/lbd';
import { useAuditLogs, type AuditLogRow } from '@/hooks/useAuditLogs';

/* ─────────────────────────────────────────────
   Filter options
───────────────────────────────────────────── */

const ACTION_OPTIONS = ['create', 'read', 'update', 'delete', 'login', 'logout', 'export'];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function AuditLogPage() {
  const [filterAction, setFilterAction] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [detailRow, setDetailRow] = useState<AuditLogRow | null>(null);

  const { data: logs = [], isLoading } = useAuditLogs({
    action: filterAction || undefined,
    tableName: filterTable || undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo ? `${filterDateTo}T23:59:59Z` : undefined,
  });

  /** Unique table names for filter dropdown (computed from data) */
  const tableNames = useMemo(
    () => [...new Set(logs.map((l) => l.table_name))].sort(),
    [logs],
  );

  const columns = useMemo<ColumnDef<AuditLogRow>[]>(() => [
    {
      key: 'created_at',
      label: 'Timestamp',
      sortable: true,
      width: 160,
      render: (v) => format(new Date(v as string), 'dd MMM yyyy HH:mm:ss'),
    },
    { key: 'user_name', label: 'User', sortable: true },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (v) => {
        const a = v as string;
        const variant = a === 'delete' ? 'red' as const
          : a === 'login' || a === 'logout' ? 'green' as const
          : 'outline' as const;
        return <LBDBadge variant={variant} value={a} size="sm" />;
      },
    },
    { key: 'table_name', label: 'Table', sortable: true },
    {
      key: 'record_id',
      label: 'Record',
      render: (v) => v
        ? <span className="font-mono text-[10px] text-muted-foreground">{String(v).slice(0, 8)}…</span>
        : '—',
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      render: (v) => v ? <span className="font-mono text-xs">{String(v)}</span> : '—',
    },
    {
      key: 'id',
      label: 'Details',
      align: 'center' as const,
      noExport: true,
      render: (_v, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailRow(row); }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          title="View details"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ], []);

  /* ── Filter toolbar ── */
  const filterBar = (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={filterAction}
        onChange={(e) => setFilterAction(e.target.value)}
        className="px-2 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Filter by action"
      >
        <option value="">All Actions</option>
        {ACTION_OPTIONS.map((a) => (
          <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
        ))}
      </select>
      <select
        value={filterTable}
        onChange={(e) => setFilterTable(e.target.value)}
        className="px-2 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Filter by table"
      >
        <option value="">All Tables</option>
        {tableNames.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <input
        type="date"
        value={filterDateFrom}
        onChange={(e) => setFilterDateFrom(e.target.value)}
        className="px-2 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Date from"
      />
      <span className="text-xs text-muted-foreground">to</span>
      <input
        type="date"
        value={filterDateTo}
        onChange={(e) => setFilterDateTo(e.target.value)}
        className="px-2 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Date to"
      />
      {(filterAction || filterTable || filterDateFrom || filterDateTo) && (
        <button
          onClick={() => { setFilterAction(''); setFilterTable(''); setFilterDateFrom(''); setFilterDateTo(''); }}
          className="text-xs text-accent hover:text-accent/80 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <LBDPageHeader
        eyebrow="PLATFORM · ADMIN"
        title="Audit Log"
        description="Review all platform activity. Filterable by user, action, table, and date range."
      />

      <LBDDataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        enableExport
        exportFilename="audit-log-export"
        searchPlaceholder="Search audit logs…"
        emptyIcon={<ScrollText className="w-8 h-8" />}
        emptyTitle="No audit events found"
        emptyDescription="Audit events will appear here as users interact with the platform."
        toolbarLeft={filterBar}
        defaultPageSize={25}
        onRowClick={(row) => setDetailRow(row)}
      />

      {/* ── Detail Modal ── */}
      <LBDModal
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title="Audit Event Details"
        description={detailRow ? format(new Date(detailRow.created_at), 'dd MMM yyyy HH:mm:ss') : ''}
      >
        {detailRow && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block">User</span>
                <span className="text-foreground">{detailRow.user_name}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Action</span>
                <LBDBadge variant="outline" value={detailRow.action} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Table</span>
                <span className="text-foreground font-mono text-xs">{detailRow.table_name}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Record ID</span>
                <span className="text-foreground font-mono text-xs">{detailRow.record_id ?? '—'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">IP Address</span>
                <span className="text-foreground font-mono text-xs">{detailRow.ip_address ?? '—'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">User Agent</span>
                <span className="text-foreground text-xs truncate block">{detailRow.user_agent ?? '—'}</span>
              </div>
            </div>

            {detailRow.old_values && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Previous Values</span>
                <pre className="p-3 rounded-lg bg-background border border-border text-xs text-foreground/80 overflow-auto max-h-40">
                  {JSON.stringify(detailRow.old_values, null, 2)}
                </pre>
              </div>
            )}

            {detailRow.new_values && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">New Values</span>
                <pre className="p-3 rounded-lg bg-background border border-border text-xs text-foreground/80 overflow-auto max-h-40">
                  {JSON.stringify(detailRow.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </LBDModal>
    </div>
  );
}
