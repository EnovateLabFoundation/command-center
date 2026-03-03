/**
 * WardTableView
 *
 * Table-based view for Ward and Polling Unit geographic levels.
 * At this granularity, map rendering is impractical — data is shown
 * in a filterable, exportable LBDDataTable instead.
 */

import { useMemo, useState } from 'react';
import { LBDDataTable, type ColumnDef, LBDSentimentBadge, type SentimentScore } from '@/components/ui/lbd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { NIGERIA_STATES } from '@/hooks/useGeospatial';

interface WardRow {
  state: string;
  lga: string;
  ward: string;
  polling_unit: string;
  intel_count: number;
  avg_sentiment: number | null;
  last_updated: string;
  field_reports: number;
  [key: string]: unknown;
}

interface WardTableViewProps {
  intelItems: Array<{
    narrative_theme: string | null;
    sentiment_score: number | null;
    date_logged: string;
  }>;
}

/**
 * Parse narrative_theme like "Lagos > Ikeja > Ward 3" into parts.
 */
function parseGeoTheme(theme: string): { state: string; lga: string; ward: string } {
  const parts = theme.split('>').map((p) => p.trim());
  return {
    state: parts[0] ?? '',
    lga: parts[1] ?? '',
    ward: parts[2] ?? '',
  };
}

const columns: ColumnDef<WardRow>[] = [
  { key: 'state', label: 'State', sortable: true },
  { key: 'lga', label: 'LGA', sortable: true },
  { key: 'ward', label: 'Ward', sortable: true },
  { key: 'intel_count', label: 'Intel Items', sortable: true, align: 'center' },
  {
    key: 'avg_sentiment',
    label: 'Avg Sentiment',
    sortable: true,
    align: 'center',
    render: (val) => {
      if (val == null) return <span className="text-muted-foreground">—</span>;
      const score = Math.round(Math.max(-2, Math.min(2, val as number))) as SentimentScore;
      return <LBDSentimentBadge score={score} size="sm" />;
    },
  },
  { key: 'last_updated', label: 'Last Updated', sortable: true },
  { key: 'field_reports', label: 'Reports', sortable: true, align: 'center' },
];

export default function WardTableView({ intelItems }: WardTableViewProps) {
  const [stateFilter, setStateFilter] = useState<string>('all');

  /** Build ward-level rows from intel items */
  const rows = useMemo(() => {
    const wardMap = new Map<string, {
      state: string; lga: string; ward: string;
      sentSum: number; sentCount: number; total: number;
      lastDate: string;
    }>();

    for (const item of intelItems) {
      if (!item.narrative_theme) continue;
      const { state, lga, ward } = parseGeoTheme(item.narrative_theme);
      if (!state) continue;
      const key = `${state}|${lga}|${ward}`;
      const existing = wardMap.get(key) ?? {
        state, lga, ward, sentSum: 0, sentCount: 0, total: 0, lastDate: '',
      };
      existing.total++;
      if (item.sentiment_score != null) {
        existing.sentSum += Number(item.sentiment_score);
        existing.sentCount++;
      }
      if (item.date_logged > existing.lastDate) existing.lastDate = item.date_logged;
      wardMap.set(key, existing);
    }

    return Array.from(wardMap.values()).map((r): WardRow => ({
      state: r.state,
      lga: r.lga || '—',
      ward: r.ward || '—',
      polling_unit: '—',
      intel_count: r.total,
      avg_sentiment: r.sentCount > 0 ? r.sentSum / r.sentCount : null,
      last_updated: r.lastDate || '—',
      field_reports: r.total,
    }));
  }, [intelItems]);

  /** Apply state filter */
  const filteredRows = useMemo(
    () => stateFilter === 'all' ? rows : rows.filter((r) => r.state === stateFilter),
    [rows, stateFilter],
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Filter by State:</Label>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {NIGERIA_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <LBDDataTable
        columns={columns}
        data={filteredRows}
        enableSearch
        enablePagination
        defaultPageSize={25}
        enableExport
        exportFilename="ward-level-intelligence"
        emptyTitle="No ward-level data"
        emptyDescription="Field reports with ward-level detail will appear here."
      />
    </div>
  );
}
