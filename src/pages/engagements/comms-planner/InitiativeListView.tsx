/**
 * InitiativeListView
 *
 * LBDDataTable list of all comms_initiatives for an engagement.
 * Displays status with auto-overdue calculation and truncated text fields.
 */

import { LBDDataTable, type ColumnDef } from '@/components/ui/lbd';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { type Initiative, type ResponsibleUser, STATUS_CONFIG } from '@/hooks/useCommsPlanner';

/* ─────────────────────────────────────────── */

interface Props {
  data: Initiative[];
  loading: boolean;
  users: ResponsibleUser[];
  onEdit: (i: Initiative) => void;
  onDelete: (id: string) => void;
}

/** Truncate text to maxLen characters */
function trunc(text: string | null, maxLen = 40): string {
  if (!text) return '—';
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export default function InitiativeListView({ data, loading, users, onEdit, onDelete }: Props) {
  const userMap = new Map(users.map(u => [u.id, u]));

  const columns: ColumnDef<Initiative>[] = [
    { key: 'policy_area', label: 'Policy Area', sortable: true, width: 130 },
    { key: 'communication_phase', label: 'Phase', sortable: true, width: 100 },
    { key: 'target_audience', label: 'Audience', sortable: true, width: 120, render: v => trunc(v as string) },
    { key: 'key_message', label: 'Key Message', width: 180, render: v => <span className="text-xs">{trunc(v as string, 50)}</span> },
    {
      key: 'primary_channel', label: 'Channel', width: 100,
      render: v => v ? <Badge variant="outline" className="text-[10px] font-mono">{v as string}</Badge> : '—',
    },
    {
      key: 'responsible_id', label: 'Responsible', width: 140,
      render: v => {
        const u = userMap.get(v as string);
        if (!u) return <span className="text-muted-foreground text-xs">Unassigned</span>;
        return (
          <span className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={u.avatar_url ?? ''} />
              <AvatarFallback className="text-[8px]">{u.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs truncate max-w-[90px]">{u.full_name}</span>
          </span>
        );
      },
    },
    {
      key: 'launch_date', label: 'Launch', sortable: true, width: 100,
      render: v => v ? format(new Date(v as string), 'dd MMM yyyy') : '—',
    },
    {
      key: 'displayStatus', label: 'Status', sortable: true, width: 100,
      render: v => {
        const cfg = STATUS_CONFIG[v as string] ?? STATUS_CONFIG['not_started'];
        return <Badge variant="outline" className={`text-[10px] border ${cfg.color}`}>{cfg.label}</Badge>;
      },
    },
    { key: 'success_metric', label: 'Metric', width: 120, render: v => <span className="text-xs">{trunc(v as string, 30)}</span> },
    { key: 'actual_result', label: 'Result', width: 100, render: v => <span className="text-xs">{trunc(v as string, 30)}</span> },
    {
      key: 'id', label: '', width: 80, noExport: true,
      render: (_v, row) => (
        <span className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(row); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); onDelete(row.id); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <LBDDataTable<Initiative>
      columns={columns}
      data={data}
      isLoading={loading}
      enableSearch
      enablePagination
      defaultPageSize={15}
      enableExport
      exportFilename="comms-initiatives"
      emptyTitle="No initiatives yet"
      emptyDescription="Add your first communications initiative to get started."
      stickyHeader
    />
  );
}
