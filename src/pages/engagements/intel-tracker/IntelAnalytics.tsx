/**
 * IntelAnalytics
 *
 * Five analytics charts for the Intel Tracker:
 *  1. Rolling Sentiment Line Chart (30-day rolling avg)
 *  2. Sentiment Heatmap Calendar (month grid)
 *  3. Narrative Theme Volume (stacked bar by sentiment)
 *  4. Source Type Pie Chart
 *  5. Intel Volume + Sentiment Combined (bars + line, 14 days)
 *
 * All charts: dark theme, gold accents.
 * Each chart has an "Export JPG" button via html2canvas.
 */

import { useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend, ResponsiveContainer,
} from 'recharts';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelItem } from '@/hooks/useIntelTracker';
import { sentimentHex } from '@/hooks/useIntelTracker';

/** Lazy-loaded AI brief panel to avoid bundle bloat */
const IntelBriefPanelLazy = lazy(() => import('./IntelBriefPanel'));

function IntelBriefPanelWrapper({ engagementId }: { engagementId: string }) {
  return (
    <Suspense fallback={null}>
      <IntelBriefPanelLazy engagementId={engagementId} />
    </Suspense>
  );
}

/* ─────────────────────────────────────────────
   Chart theme constants
───────────────────────────────────────────── */

const CHART_BG      = '#1E1E2E';
const AXIS_COLOUR   = '#4b5563';
const TICK_COLOUR   = '#6b7280';
const GRID_COLOUR   = '#1f2937';
const GOLD          = '#d4af37';
const EMERALD       = '#34d399';
const AMBER         = '#fbbf24';
const RED_SOFT      = '#f87171';

/* ─────────────────────────────────────────────
   Chart card wrapper
───────────────────────────────────────────── */

function ChartCard({
  title, subtitle, children, cardRef,
}: {
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
  cardRef:   React.RefObject<HTMLDivElement>;
}) {
  const handleExport = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, {
        backgroundColor: CHART_BG,
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
    } catch {
      console.error('Export failed');
    }
  }, [title, cardRef]);

  return (
    <div
      ref={cardRef}
      className="rounded-xl border border-border/60 overflow-hidden"
      style={{ background: CHART_BG }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={handleExport}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold',
            'border border-border/60 text-muted-foreground/60 hover:text-foreground hover:border-border transition-colors',
          )}
        >
          <Download className="w-3 h-3" />
          Export JPG
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Data helpers
───────────────────────────────────────────── */

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(isoDate(d));
  }
  return days;
}

function getLast14Days(): string[] {
  return getLast30Days().slice(-14);
}

/* ─────────────────────────────────────────────
   Custom tooltip
───────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0e0e10] border border-border/60 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-mono text-muted-foreground/60 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value % 1 !== 0
            ? (p.value > 0 ? '+' : '') + p.value.toFixed(2)
            : p.value}
        </p>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   1. Rolling Sentiment Line Chart (30 days)
───────────────────────────────────────────── */

function SentimentLineChart({ items }: { items: IntelItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const days = getLast30Days();
    // Map: date → avg sentiment
    const byDay: Record<string, number[]> = {};
    items.forEach((item) => {
      if (!item.sentiment_score) return;
      const d = item.date_logged.slice(0, 10);
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(item.sentiment_score);
    });

    return days.map((day) => {
      const scores = byDay[day] ?? [];
      const avg = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;
      return {
        date:  formatDate(new Date(day)),
        score: avg !== null ? parseFloat(avg.toFixed(2)) : null,
      };
    });
  }, [items]);

  // Colour segmented line: green >+0.5, amber 0–+0.5, red <0
  const sentDotColour = (score: number | null) =>
    score === null ? TICK_COLOUR :
    score > 0.5    ? EMERALD     :
    score >= 0     ? AMBER       : RED_SOFT;

  return (
    <ChartCard
      cardRef={ref}
      title="Rolling Sentiment Trend"
      subtitle="30-day daily average · Reference lines at 0 and +0.5 target"
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOUR} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: TICK_COLOUR, fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: AXIS_COLOUR }}
            tickLine={false}
            interval={4}
          />
          <YAxis
            domain={[-2, 2]}
            tick={{ fill: TICK_COLOUR, fontSize: 10, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v > 0 ? `+${v}` : String(v))}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0}    stroke={RED_SOFT}  strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: '0', fill: TICK_COLOUR, fontSize: 9 }} />
          <ReferenceLine y={0.5}  stroke={EMERALD}   strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: '+0.5 target', fill: TICK_COLOUR, fontSize: 9 }} />
          <Line
            type="monotone"
            dataKey="score"
            name="Avg Sentiment"
            stroke={GOLD}
            strokeWidth={2}
            dot={(props: { cx: number; cy: number; payload: { score: number | null } }) => {
              const c = sentDotColour(props.payload.score);
              return <circle key={`dot-${props.cx}`} cx={props.cx} cy={props.cy} r={3} fill={c} stroke="none" />;
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   2. Sentiment Heatmap Calendar
───────────────────────────────────────────── */

function HeatmapCalendar({ items }: { items: IntelItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const { weeks, month } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const mon  = now.getMonth();
    const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    // Build day→avgScore map for this month
    const byDay: Record<string, number[]> = {};
    items.forEach((item) => {
      if (!item.sentiment_score) return;
      const d = new Date(item.date_logged);
      if (d.getFullYear() === year && d.getMonth() === mon) {
        const key = isoDate(d);
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(item.sentiment_score);
      }
    });

    // Build calendar grid
    const firstDay = new Date(year, mon, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const cells: Array<{ day: number | null; score: number | null; key: string }> = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, score: null, key: `e-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = isoDate(new Date(year, mon, d));
      const scores = byDay[key] ?? [];
      const score  = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;
      cells.push({ day: d, score, key });
    }

    // Group into weeks of 7
    const weeksArr: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) weeksArr.push(cells.slice(i, i + 7));

    return { weeks: weeksArr, month: monthLabel };
  }, [items]);

  function cellColour(score: number | null): string {
    if (score === null) return '#1f2937';
    if (score >= 0.3)  return `rgba(52, 211, 153, ${0.3 + Math.min(score / 2, 0.7)})`;
    if (score >= -0.5) return `rgba(251, 191, 36, ${0.3 + Math.min(Math.abs(score) / 2, 0.5)})`;
    return `rgba(248, 113, 113, ${0.3 + Math.min(Math.abs(score) / 2, 0.7)})`;
  }

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <ChartCard
      cardRef={ref}
      title="Sentiment Heatmap Calendar"
      subtitle={`${month} — Green = positive · Red = negative · Grey = no data`}
    >
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[9px] font-mono text-muted-foreground/40">{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((cell) => (
              <div
                key={cell.key}
                className="aspect-square rounded flex items-center justify-center relative"
                style={{
                  backgroundColor: cell.day ? cellColour(cell.score) : 'transparent',
                  border:          cell.day ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
                title={cell.day
                  ? `${cell.day}: ${cell.score !== null
                      ? (cell.score > 0 ? '+' : '') + cell.score.toFixed(2)
                      : 'no data'}`
                  : ''}
              >
                {cell.day && (
                  <span className="text-[10px] font-mono text-white/60">{cell.day}</span>
                )}
              </div>
            ))}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-3 pt-1 justify-center">
          {[
            { label: 'Positive', colour: 'rgba(52, 211, 153, 0.6)' },
            { label: 'Neutral',  colour: 'rgba(251, 191, 36, 0.5)' },
            { label: 'Negative', colour: 'rgba(248, 113, 113, 0.6)' },
            { label: 'No data',  colour: '#1f2937' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.colour }} />
              <span className="text-[9px] font-mono text-muted-foreground/40">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   3. Narrative Theme Volume (stacked bar)
───────────────────────────────────────────── */

function ThemeVolumeChart({ items }: { items: IntelItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const days30Ago = new Date();
    days30Ago.setDate(days30Ago.getDate() - 30);

    const recent = items.filter(
      (i) => new Date(i.date_logged) >= days30Ago && !!i.narrative_theme,
    );

    // Count by theme + sentiment bucket
    const map: Record<string, { positive: number; neutral: number; negative: number }> = {};
    recent.forEach((item) => {
      const theme = item.narrative_theme!;
      if (!map[theme]) map[theme] = { positive: 0, neutral: 0, negative: 0 };
      const s = item.sentiment_score ?? 0;
      if (s > 0.3) map[theme].positive++;
      else if (s >= -0.5) map[theme].neutral++;
      else map[theme].negative++;
    });

    return Object.entries(map)
      .map(([theme, counts]) => ({ theme: theme.length > 20 ? theme.slice(0, 18) + '…' : theme, ...counts }))
      .sort((a, b) => (b.positive + b.neutral + b.negative) - (a.positive + a.neutral + a.negative))
      .slice(0, 10);
  }, [items]);

  if (data.length === 0) {
    return (
      <ChartCard cardRef={ref} title="Narrative Theme Volume" subtitle="Last 30 days — no themed items yet">
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground/40">No themed items in the last 30 days.</p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      cardRef={ref}
      title="Narrative Theme Volume"
      subtitle="Last 30 days · Stacked by sentiment"
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOUR} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: TICK_COLOUR, fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: AXIS_COLOUR }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="theme"
            width={78}
            tick={{ fill: TICK_COLOUR, fontSize: 9, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', color: TICK_COLOUR }}
          />
          <Bar dataKey="positive" name="Positive" stackId="a" fill={EMERALD}  radius={[0, 0, 0, 0]} />
          <Bar dataKey="neutral"  name="Neutral"  stackId="a" fill={AMBER}    radius={[0, 0, 0, 0]} />
          <Bar dataKey="negative" name="Negative" stackId="a" fill={RED_SOFT} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   4. Source Type Pie Chart
───────────────────────────────────────────── */

const SOURCE_PIE_COLOURS: Record<string, string> = {
  print:     '#60a5fa',
  digital:   '#c084fc',
  broadcast: '#fb923c',
  social:    '#f472b6',
};

function SourcePieChart({ items }: { items: IntelItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => {
      const t = i.source_type ?? 'unknown';
      counts[t] = (counts[t] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [items]);

  if (data.length === 0) {
    return (
      <ChartCard cardRef={ref} title="Source Type Distribution" subtitle="No items logged yet">
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground/40">No items to display.</p>
        </div>
      </ChartCard>
    );
  }

  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: {
    cx: number; cy: number; midAngle: number;
    innerRadius: number; outerRadius: number;
    name: string; value: number;
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x} y={y}
        fill={TICK_COLOUR}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={10}
        fontFamily="monospace"
      >
        {name} ({value})
      </text>
    );
  };

  return (
    <ChartCard
      cardRef={ref}
      title="Source Type Distribution"
      subtitle="All items by source channel"
    >
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            labelLine={false}
            label={renderLabel}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={SOURCE_PIE_COLOURS[entry.name] ?? '#6b7280'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   5. Volume + Sentiment Combined (14 days)
───────────────────────────────────────────── */

function VolumeComboChart({ items }: { items: IntelItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const days = getLast14Days();
    const byDay: Record<string, { scores: number[]; count: number }> = {};
    items.forEach((item) => {
      const d = item.date_logged.slice(0, 10);
      if (!byDay[d]) byDay[d] = { scores: [], count: 0 };
      byDay[d].count++;
      if (item.sentiment_score !== null) byDay[d].scores.push(item.sentiment_score);
    });

    return days.map((day) => {
      const bucket = byDay[day] ?? { scores: [], count: 0 };
      const avg    = bucket.scores.length > 0
        ? parseFloat((bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length).toFixed(2))
        : null;
      return {
        date:      formatDate(new Date(day)),
        volume:    bucket.count,
        sentiment: avg,
      };
    });
  }, [items]);

  return (
    <ChartCard
      cardRef={ref}
      title="Intel Volume & Sentiment"
      subtitle="Last 14 days · Bars = item count · Line = avg sentiment"
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOUR} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: TICK_COLOUR, fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: AXIS_COLOUR }}
            tickLine={false}
          />
          <YAxis
            yAxisId="volume"
            orientation="left"
            tick={{ fill: TICK_COLOUR, fontSize: 10, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="sentiment"
            orientation="right"
            domain={[-2, 2]}
            tick={{ fill: TICK_COLOUR, fontSize: 10, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v > 0 ? `+${v}` : String(v))}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine yAxisId="sentiment" y={0} stroke={RED_SOFT} strokeDasharray="3 3" strokeOpacity={0.4} />
          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', color: TICK_COLOUR }}
          />
          <Bar
            yAxisId="volume"
            dataKey="volume"
            name="Item Count"
            fill={GOLD}
            fillOpacity={0.6}
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
          <Line
            yAxisId="sentiment"
            type="monotone"
            dataKey="sentiment"
            name="Avg Sentiment"
            stroke={EMERALD}
            strokeWidth={2}
            dot={{ fill: EMERALD, r: 3 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   Main export
───────────────────────────────────────────── */

interface IntelAnalyticsProps {
  items: IntelItem[];
  engagementId?: string;
}

export default function IntelAnalytics({ items, engagementId }: IntelAnalyticsProps) {
  return (
    <div className="space-y-4">
      {/* AI Brief generator */}
      {engagementId && (
        <div className="flex justify-end">
          <IntelBriefPanelWrapper engagementId={engagementId} />
        </div>
      )}

      {/* Row 1: Line + Heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SentimentLineChart items={items} />
        <HeatmapCalendar    items={items} />
      </div>

      {/* Row 2: Theme Volume + Pie */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ThemeVolumeChart items={items} />
        <SourcePieChart   items={items} />
      </div>

      {/* Row 3: Volume + Sentiment combo — full width */}
      <VolumeComboChart items={items} />
    </div>
  );
}
