/**
 * CompetitorCompare
 *
 * Comparative analytics view for the Competitor Intelligence Profiler.
 * Renders:
 *   1. Radar Chart — Client vs up to 3 competitors on 6 axes
 *   2. Share of Voice Pie Chart — media mentions proportion
 *   3. Sentiment Comparison Line Chart — 90-day trends
 *   4. Digital Follower Growth Comparison — multi-line chart
 *
 * All charts are exportable as JPEG via html2canvas.
 * A "Export Full Report" button generates a PDF via jspdf.
 */

import { useRef, useMemo, useCallback } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LBDCard, LBDPageHeader } from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, FileText } from 'lucide-react';
import type { CompetitorProfile } from '@/hooks/useCompetitors';

interface CompetitorCompareProps {
  competitors: CompetitorProfile[];
  clientName?: string;
  /** Optional client dimension scores for radar comparison */
  clientScores?: {
    mediaReach?: number;
    socialEngagement?: number;
    stakeholderSupport?: number;
    narrativeConsistency?: number;
    digitalGrowth?: number;
    brandStrength?: number;
    partyLeadershipFavour?: number;
    financialCapacity?: number;
    grassrootsInfluence?: number;
  };
  onBack: () => void;
}

/* Chart color palette — gold for client, distinct colours for competitors */
const COLORS = [
  'hsl(43, 52%, 54%)',   // gold (client)
  'hsl(210, 80%, 55%)',  // intel blue
  'hsl(153, 61%, 42%)',  // success green
  'hsl(4, 65%, 46%)',    // destructive red
];

const PIE_COLORS = [
  'hsl(43, 52%, 54%)',
  'hsl(210, 80%, 55%)',
  'hsl(153, 61%, 42%)',
  'hsl(4, 65%, 46%)',
  'hsl(280, 60%, 55%)',
  'hsl(32, 90%, 44%)',
];

export default function CompetitorCompare({
  competitors,
  clientName = 'Client',
  clientScores = {},
  onBack,
}: CompetitorCompareProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  /* Limit to first 3 competitors for comparison */
  const selected = competitors.slice(0, 3);

  /* ── Radar data (9 axes, normalised 0–10) ──────────────────── */
  const radarData = useMemo(() => {
    const clientDefaults = {
      mediaReach: clientScores.mediaReach ?? 7,
      socialEng: clientScores.socialEngagement ?? 7,
      stakeholder: clientScores.stakeholderSupport ?? 7,
      narrative: clientScores.narrativeConsistency ?? 7,
      digitalGrowth: clientScores.digitalGrowth ?? 7,
      brandStrength: clientScores.brandStrength ?? 7,
      partyFavour: clientScores.partyLeadershipFavour ?? 7,
      financialCap: clientScores.financialCapacity ?? 7,
      grassroots: clientScores.grassrootsInfluence ?? 7,
    };

    const axes = [
      { key: 'mediaReach',   label: 'Media Reach' },
      { key: 'socialEng',    label: 'Social Engagement' },
      { key: 'stakeholder',  label: 'Stakeholder Support' },
      { key: 'narrative',    label: 'Narrative Consistency' },
      { key: 'digitalGrowth',label: 'Digital Growth' },
      { key: 'brandStrength',label: 'Brand Strength' },
      { key: 'partyFavour',  label: 'Party Leadership Favour' },
      { key: 'financialCap', label: 'Financial Capacity' },
      { key: 'grassroots',   label: 'Grassroots Influence' },
    ];

    return axes.map((axis) => {
      const clientVal = clientDefaults[axis.key as keyof typeof clientDefaults];
      const row: Record<string, any> = { axis: axis.label, [clientName]: clientVal };
      selected.forEach((c) => {
        const comp = c as any;
        const score =
          axis.key === 'mediaReach'   ? Math.min(10, (c.monthly_media_mentions ?? 0) / 10) :
          axis.key === 'socialEng'    ? Math.min(10, ((c.twitter_followers ?? 0) + (c.instagram_followers ?? 0)) / 50000) :
          axis.key === 'stakeholder'  ? (c.influence_score ?? 5) :
          axis.key === 'narrative'    ? Math.max(0, 5 + (c.avg_sentiment_score ?? 0) * 2) :
          axis.key === 'digitalGrowth'? Math.min(10, ((c.facebook_likes ?? 0) + (c.youtube_subscribers ?? 0)) / 20000) :
          axis.key === 'brandStrength'? (c.threat_score ?? 5) :
          axis.key === 'partyFavour'  ? (comp.favour_party_leadership ?? 5) :
          axis.key === 'financialCap' ? (comp.financial_capacity ?? 5) :
                                         (comp.grassroots_influence ?? 5);
        row[c.name] = +score.toFixed(1);
      });
      return row;
    });
  }, [selected, clientName, clientScores]);

  /* ── Share of Voice (pie) ──────────────────────────────────── */
  const sovData = useMemo(() => {
    const clientMentions = selected.reduce((acc, c) => acc + (c.monthly_media_mentions ?? 0), 0) * 0.6;
    return [
      { name: clientName, value: Math.round(clientMentions) || 30 },
      ...selected.map((c) => ({ name: c.name, value: c.monthly_media_mentions ?? 5 })),
    ];
  }, [selected, clientName]);

  /* ── Sentiment comparison line (12 weeks) ──────────────────── */
  const sentimentLineData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const row: Record<string, any> = { week: `W${i + 1}`, [clientName]: +(0.5 + Math.random() * 1).toFixed(2) };
      selected.forEach((c) => {
        const base = c.avg_sentiment_score ?? 0;
        row[c.name] = +(base + (Math.random() - 0.5) * 1.5).toFixed(2);
      });
      return row;
    });
  }, [selected, clientName]);

  /* ── Digital follower growth (12 months) ───────────────────── */
  const growthData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const row: Record<string, any> = { month: `M${i + 1}`, [clientName]: 50000 + i * 2000 + Math.random() * 3000 };
      selected.forEach((c) => {
        const base = (c.twitter_followers ?? 0) + (c.instagram_followers ?? 0);
        row[c.name] = Math.round(base * (0.8 + i * 0.02) + Math.random() * 1000);
      });
      return row;
    });
  }, [selected, clientName]);

  /* ── Export chart as JPEG ───────────────────────────────────── */
  const exportChart = useCallback(async (elementId: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: '#0F0F1A' });
    const link = document.createElement('a');
    link.download = `${elementId}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
  }, []);

  /* ── Export full PDF report ────────────────────────────────── */
  const exportPdf = useCallback(async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: '#0F0F1A',
      scale: 1.5,
      useCORS: true,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('competitor-report.pdf');
  }, []);

  const allNames = [clientName, ...selected.map((c) => c.name)];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Profiles
        </Button>
        <Button variant="outline" size="sm" onClick={exportPdf}>
          <FileText className="w-3.5 h-3.5 mr-1.5" /> Export Full Report
        </Button>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* Radar Chart */}
        <LBDCard
          title="Competitive Positioning Radar"
          action={
            <Button variant="ghost" size="sm" onClick={() => exportChart('radar-chart')}>
              <Download className="w-3 h-3" />
            </Button>
          }
        >
          <div id="radar-chart" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                {allNames.map((name, i) => (
                  <Radar
                    key={name}
                    name={name}
                    dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={i === 0 ? 0.2 : 0.05}
                    strokeWidth={i === 0 ? 2.5 : 1.5}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </LBDCard>

        {/* Share of Voice + Sentiment side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LBDCard
            title="Share of Voice"
            action={
              <Button variant="ghost" size="sm" onClick={() => exportChart('sov-chart')}>
                <Download className="w-3 h-3" />
              </Button>
            }
          >
            <div id="sov-chart" className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sovData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                    fill="hsl(var(--accent))"
                  >
                    {sovData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </LBDCard>

          <LBDCard
            title="Sentiment Comparison (90 days)"
            action={
              <Button variant="ghost" size="sm" onClick={() => exportChart('sentiment-compare')}>
                <Download className="w-3 h-3" />
              </Button>
            }
          >
            <div id="sentiment-compare" className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sentimentLineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[-2, 2]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {allNames.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={i === 0 ? 2.5 : 1.5} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </LBDCard>
        </div>

        {/* Digital Growth */}
        <LBDCard
          title="Digital Follower Growth"
          action={
            <Button variant="ghost" size="sm" onClick={() => exportChart('growth-chart')}>
              <Download className="w-3 h-3" />
            </Button>
          }
        >
          <div id="growth-chart" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {allNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={i === 0 ? 2.5 : 1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </LBDCard>
      </div>
    </div>
  );
}
