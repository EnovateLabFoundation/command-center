/**
 * BrandAnalytics
 *
 * Three exportable charts for the Brand Audit module:
 *  1. Brand Dimension Radar Chart — current vs target
 *  2. Gap Analysis Bar Chart — horizontal bars sorted by gap
 *  3. Brand Trajectory Line Chart — overall score over time
 *
 * Each chart wrapped in an exportable container (html2canvas → JPEG).
 */

import { useRef, useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { BRAND_DIMENSIONS, type ScoresMap, type BrandAudit } from '@/hooks/useBrandAudit';

/* ─────────────────────────────────────────────
   Export helper
───────────────────────────────────────────── */

async function exportJpeg(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
  if (!ref.current) return;
  const canvas = await html2canvas(ref.current, { backgroundColor: '#111', scale: 2 });
  const link = document.createElement('a');
  link.download = `${filename}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.92);
  link.click();
}

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface BrandAnalyticsProps {
  scores: ScoresMap;
  allAudits: BrandAudit[];
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function BrandAnalytics({ scores, allAudits }: BrandAnalyticsProps) {
  const radarRef = useRef<HTMLDivElement>(null);
  const gapRef = useRef<HTMLDivElement>(null);
  const trajectoryRef = useRef<HTMLDivElement>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  /** Handle export with loading state */
  const handleExport = async (ref: React.RefObject<HTMLDivElement | null>, id: string, filename: string) => {
    setExportingId(id);
    try {
      await exportJpeg(ref, filename);
    } finally {
      setExportingId(null);
    }
  };

  /* ── Radar data ───────────────────────────────────────────────── */
  const radarData = useMemo(() =>
    BRAND_DIMENSIONS.map((dim) => ({
      dimension: dim.length > 16 ? dim.slice(0, 14) + '…' : dim,
      fullName: dim,
      current: scores[dim]?.current ?? 0,
      target: scores[dim]?.target ?? 0,
    })),
    [scores],
  );

  /* ── Gap data (sorted largest first) ──────────────────────────── */
  const gapData = useMemo(() =>
    BRAND_DIMENSIONS
      .map((dim) => {
        const s = scores[dim];
        const gap = (s?.target ?? 0) - (s?.current ?? 0);
        return { dimension: dim, gap, current: s?.current ?? 0, target: s?.target ?? 0 };
      })
      .sort((a, b) => b.gap - a.gap),
    [scores],
  );

  /* ── Trajectory data ──────────────────────────────────────────── */
  const trajectoryData = useMemo(() =>
    [...allAudits]
      .sort((a, b) => a.audit_date.localeCompare(b.audit_date))
      .map((a) => ({
        date: new Date(a.audit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
        score: a.overall_score ?? 0,
      })),
    [allAudits],
  );

  return (
    <div className="space-y-6">
      {/* ── 1. Radar chart ──────────────────────────────────────── */}
      <ChartCard
        title="Brand Dimension Radar"
        chartRef={radarRef}
        exporting={exportingId === 'radar'}
        onExport={() => handleExport(radarRef, 'radar', 'brand-radar')}
      >
        <ResponsiveContainer width="100%" height={380}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 10]}
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Radar
              name="Target"
              dataKey="target"
              stroke="#1e3a5f"
              fill="#1e3a5f"
              fillOpacity={0.15}
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
            <Radar
              name="Current"
              dataKey="current"
              stroke="#C9A84C"
              fill="#C9A84C"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="line"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E1E2E',
                border: '1px solid hsl(240 15% 22%)',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#fff',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 2. Gap analysis bar chart ───────────────────────────── */}
      <ChartCard
        title="Gap Analysis"
        chartRef={gapRef}
        exporting={exportingId === 'gap'}
        onExport={() => handleExport(gapRef, 'gap', 'brand-gap-analysis')}
      >
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={gapData} layout="vertical" margin={{ left: 120, right: 20, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              dataKey="dimension"
              type="category"
              width={110}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E1E2E',
                border: '1px solid hsl(240 15% 22%)',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#fff',
              }}
            />
            <Bar dataKey="gap" name="Gap" radius={[0, 4, 4, 0]}>
              {gapData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.gap >= 4 ? '#ef4444' : entry.gap >= 2 ? '#f59e0b' : '#10b981'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 3. Brand trajectory ─────────────────────────────────── */}
      {trajectoryData.length > 1 && (
        <ChartCard
          title="Brand Score Trajectory"
          chartRef={trajectoryRef}
          exporting={exportingId === 'trajectory'}
          onExport={() => handleExport(trajectoryRef, 'trajectory', 'brand-trajectory')}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trajectoryData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E1E2E',
                  border: '1px solid hsl(240 15% 22%)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#C9A84C"
                strokeWidth={2}
                dot={{ r: 4, fill: '#C9A84C', stroke: '#1E1E2E', strokeWidth: 2 }}
                name="Overall Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ChartCard wrapper with export button
───────────────────────────────────────────── */

function ChartCard({
  title,
  chartRef,
  children,
  exporting,
  onExport,
}: {
  title: string;
  chartRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  exporting: boolean;
  onExport: () => void;
}) {
  return (
    <div ref={chartRef} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase">{title}</h3>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-md',
            'border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors',
            exporting && 'opacity-50 pointer-events-none',
          )}
        >
          <Download className="w-3 h-3" />
          {exporting ? 'Exporting…' : 'JPEG'}
        </button>
      </div>
      {children}
    </div>
  );
}
