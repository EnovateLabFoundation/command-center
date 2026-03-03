/**
 * ContentListView
 *
 * Standard LBDDataTable of all content_items for the engagement.
 * Columns: Title | Platform | Status | Scheduled Date | Approval Stage |
 * Engagement Metrics (if published) | Actions.
 */

import { format } from 'date-fns';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LBDDataTable, type ColumnDef } from '@/components/ui/lbd/LBDDataTable';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/hooks/useContentCalendar';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-primary/20 text-primary',
  scheduled: 'bg-accent/20 text-accent',
  published: 'bg-green-500/20 text-green-400',
  archived: 'bg-muted text-muted-foreground/60',
};

interface Props {
  items: ContentItem[];
  isLoading: boolean;
  onView: (item: ContentItem) => void;
  onEdit: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
}

export default function ContentListView({ items, isLoading, onView, onEdit, onDelete }: Props) {
  const columns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'title', label: 'TITLE', sortable: true },
    {
      key: 'platform',
      label: 'PLATFORM',
      render: (v) => v ? <Badge variant="outline" className="text-[10px]">{String(v)}</Badge> : '—',
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (v) => (
        <Badge className={cn('text-[10px]', STATUS_COLORS[String(v)] ?? '')}>
          {String(v)}
        </Badge>
      ),
    },
    {
      key: 'scheduled_date',
      label: 'SCHEDULED',
      sortable: true,
      render: (v) => v ? format(new Date(String(v)), 'dd MMM yyyy') : '—',
    },
    { key: 'approval_stage', label: 'APPROVAL', render: (v) => v ? String(v) : '—' },
    {
      key: 'engagement_metrics',
      label: 'METRICS',
      render: (v, row) => {
        if (String(row.status) !== 'published' || !v) return '—';
        const m = v as Record<string, number>;
        const total = (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0);
        return <span className="font-mono text-xs text-accent">{total} eng.</span>;
      },
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      noExport: true,
      render: (_v, row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onView(row as unknown as ContentItem); }}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(row as unknown as ContentItem); }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(row as unknown as ContentItem); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <LBDDataTable
      columns={columns}
      data={items as unknown as Record<string, unknown>[]}
      isLoading={isLoading}
      rowKey={(row) => String(row.id)}
      enableSearch
      enableExport
      exportFilename="content-items"
      emptyTitle="No content items"
      emptyDescription="Create your first content item to get started."
      onRowClick={(row) => onView(row as unknown as ContentItem)}
    />
  );
}
