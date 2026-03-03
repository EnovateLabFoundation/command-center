/**
 * PostCrisisReview — Structured debrief, PDF generation, sentiment recovery chart
 *
 * Displayed after a crisis has been resolved. Provides a debrief form,
 * "Generate Debrief Report" PDF export, and a 60-day sentiment chart.
 *
 * @module pages/engagements/crisis/PostCrisisReview
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Download, Image } from 'lucide-react';
import { LBDPageHeader, LBDStatCard } from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { useCrisis, DebriefData, CrisisEvent } from '@/hooks/useCrisis';
import { format, formatDistanceStrict } from 'date-fns';

interface Props {
  hook: ReturnType<typeof useCrisis>;
  event: CrisisEvent & { crisis_types: { crisis_type_name: string } };
}

const DEBRIEF_FIELDS: { key: keyof DebriefData; label: string; placeholder: string }[] = [
  { key: 'timeline', label: 'Timeline Reconstruction', placeholder: 'Chronological account of key events and decisions…' },
  { key: 'whatWorked', label: 'What Worked', placeholder: 'Successful strategies and responses…' },
  { key: 'whatFailed', label: 'What Failed', placeholder: 'Gaps, delays, or miscommunications…' },
  { key: 'whatSurprised', label: 'What Surprised Us', placeholder: 'Unexpected developments or reactions…' },
  { key: 'lessonsLearned', label: 'Lessons Learned', placeholder: 'Key takeaways for future crises…' },
  { key: 'narrativeRecovery', label: 'Narrative Recovery Assessment', placeholder: 'Current public perception and recovery plan…' },
];

export default function PostCrisisReview({ hook, event }: Props) {
  /* ── Debrief form ─────────────────────────────────────────────────────── */
  const parseDebrief = (): DebriefData => {
    try { return JSON.parse(event.debrief_notes ?? '{}'); }
    catch { return { timeline: event.debrief_notes ?? '', whatWorked: '', whatFailed: '', whatSurprised: '', lessonsLearned: '', narrativeRecovery: '' }; }
  };

  const [debrief, setDebrief] = useState<DebriefData>(parseDebrief);

  const saveDebrief = useCallback(() => {
    hook.updateEvent.mutate({ id: event.id, debrief_notes: JSON.stringify(debrief) });
  }, [debrief, event.id, hook.updateEvent]);

  /* ── Sentiment data ───────────────────────────────────────────────────── */
  const [sentimentData, setSentimentData] = useState<{ date: string; score: number }[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hook.fetchSentimentData(event.activated_at).then((items) => {
      const grouped: Record<string, number[]> = {};
      items.forEach((i) => {
        const d = i.date_logged;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(Number(i.sentiment_score));
      });
      const chart = Object.entries(grouped)
        .map(([date, scores]) => ({
          date,
          score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setSentimentData(chart);
    });
  }, [event.activated_at, hook.fetchSentimentData]);

  /* ── PDF generation ───────────────────────────────────────────────────── */
  const generatePdf = () => {
    const doc = new jsPDF();
    const crisisName = (event as any).crisis_types?.crisis_type_name ?? 'Crisis';

    doc.setFontSize(18);
    doc.text('Post-Crisis Debrief Report', 20, 20);
    doc.setFontSize(10);
    doc.text(`Crisis: ${crisisName}`, 20, 30);
    doc.text(`Activated: ${format(new Date(event.activated_at), 'PPpp')}`, 20, 36);
    doc.text(`Resolved: ${event.resolved_at ? format(new Date(event.resolved_at), 'PPpp') : 'N/A'}`, 20, 42);
    doc.text(`Duration: ${event.resolved_at ? formatDistanceStrict(new Date(event.activated_at), new Date(event.resolved_at)) : 'N/A'}`, 20, 48);

    let y = 60;
    DEBRIEF_FIELDS.forEach(({ label, key }) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(debrief[key] || 'N/A', 170);
      doc.text(lines, 20, y);
      y += lines.length * 5 + 8;
    });

    doc.save(`debrief-${crisisName.replace(/\s/g, '-').toLowerCase()}.pdf`);
  };

  /* ── Chart export ─────────────────────────────────────────────────────── */
  const exportChart = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#0F0F1A' });
    const link = document.createElement('a');
    link.download = 'sentiment-recovery.jpeg';
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  /* ── Duration ─────────────────────────────────────────────────────────── */
  const duration = event.resolved_at
    ? formatDistanceStrict(new Date(event.activated_at), new Date(event.resolved_at))
    : 'N/A';

  const activationDate = event.activated_at ? format(new Date(event.activated_at), 'dd/MM/yyyy') : '';

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      <LBDPageHeader
        eyebrow="POST-CRISIS"
        title="Crisis Review & Debrief"
        description={`${(event as any).crisis_types?.crisis_type_name ?? 'Crisis'} — Activated ${activationDate}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={saveDebrief} disabled={hook.updateEvent.isPending}>
              Save Debrief
            </Button>
            <Button size="sm" onClick={generatePdf}>
              <FileText className="w-4 h-4 mr-1" /> Generate Report
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LBDStatCard label="Crisis Duration" value={duration} accentClass="danger" />
        <LBDStatCard label="Checklist Items" value={((event.checklist_items as unknown as any[]) ?? []).length} accentClass="info" />
        <LBDStatCard label="Comms Entries" value={((event.communications_log as unknown as any[]) ?? []).length} accentClass="gold" />
        <LBDStatCard label="Status" value="Resolved" accentClass="success" />
      </div>

      {/* Debrief form */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h3 className="font-mono text-[10px] tracking-[0.25em] text-accent uppercase">Structured Debrief</h3>
        {DEBRIEF_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <Label className="text-xs">{label}</Label>
            <Textarea
              value={debrief[key]}
              onChange={(e) => setDebrief((d) => ({ ...d, [key]: e.target.value }))}
              rows={3}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>

      {/* Sentiment Recovery Chart */}
      {sentimentData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-accent uppercase">
              Sentiment Recovery (±30 days)
            </h3>
            <Button variant="outline" size="sm" onClick={exportChart}>
              <Image className="w-3 h-3 mr-1" /> Export JPEG
            </Button>
          </div>
          <div ref={chartRef} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 22%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A0A0B0' }} />
                <YAxis domain={[-2, 2]} tick={{ fontSize: 10, fill: '#A0A0B0' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E1E2E', border: '1px solid hsl(240 15% 22%)', borderRadius: 6, fontSize: 11, color: '#fff' }}
                />
                <ReferenceLine
                  x={activationDate}
                  stroke="hsl(4 65% 46%)"
                  strokeDasharray="4 4"
                  label={{ value: 'Crisis', fill: '#C0392B', fontSize: 10 }}
                />
                <Line type="monotone" dataKey="score" stroke="#C9A84C" strokeWidth={2} dot={{ r: 2, fill: '#C9A84C' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
