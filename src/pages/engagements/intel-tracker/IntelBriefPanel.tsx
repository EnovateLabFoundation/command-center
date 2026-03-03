/**
 * IntelBriefPanel
 *
 * "Generate AI Brief" button + modal for displaying AI-generated
 * intelligence briefings. Shown in the Intel Tracker Analytics tab.
 *
 * Features:
 *  - Date range picker (from/to)
 *  - Calls generate-intel-brief Edge Function
 *  - Displays 4-section brief in LBDModal
 *  - "Save to Briefs" persists via the Edge Function save param
 *  - "Export PDF" via jspdf
 */

import { useState, useCallback } from 'react';
import { Sparkles, Loader2, Save, FileDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LBDModal, LBDModalButton } from '@/components/ui/lbd/LBDModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/lbd';

/* ── Types ──────────────────────────────────── */

interface BriefResult {
  headline_intel: string;
  sentiment_assessment: string;
  key_threats: string;
  recommended_actions: string;
  brief_id?: string;
}

interface IntelBriefPanelProps {
  engagementId: string;
}

/* ── Component ──────────────────────────────── */

export default function IntelBriefPanel({ engagementId }: IntelBriefPanelProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brief, setBrief] = useState<BriefResult | null>(null);

  // Default date range: last 7 days
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(weekAgo);
  const [dateTo, setDateTo] = useState(today);

  /** Generate the brief via Edge Function */
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setBrief(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-intel-brief', {
        body: { engagement_id: engagementId, date_from: dateFrom, date_to: dateTo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBrief(data as BriefResult);
    } catch (err: unknown) {
      toast.error('Brief generation failed', (err as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [engagementId, dateFrom, dateTo]);

  /** Save brief to DB */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-intel-brief', {
        body: { engagement_id: engagementId, date_from: dateFrom, date_to: dateTo, save: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBrief(data as BriefResult);
      toast.success('Brief saved', 'Intelligence brief has been saved to the briefs library.');
    } catch (err: unknown) {
      toast.error('Save failed', (err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [engagementId, dateFrom, dateTo]);

  /** Export PDF */
  const handleExportPDF = useCallback(async () => {
    if (!brief) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const margin = 20;
      let y = margin;

      doc.setFontSize(16);
      doc.text('Intelligence Brief', margin, y);
      y += 10;
      doc.setFontSize(9);
      doc.text(`${dateFrom} to ${dateTo} · Generated ${new Date().toLocaleDateString()}`, margin, y);
      y += 12;

      const sections = [
        { title: 'Headline Intelligence', content: brief.headline_intel },
        { title: 'Sentiment Assessment', content: brief.sentiment_assessment },
        { title: 'Key Threats', content: brief.key_threats },
        { title: 'Recommended Actions', content: brief.recommended_actions },
      ];

      for (const section of sections) {
        doc.setFontSize(12);
        doc.text(section.title, margin, y);
        y += 7;
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(section.content, 170);
        doc.text(lines, margin, y);
        y += lines.length * 4.5 + 8;
        if (y > 270) { doc.addPage(); y = margin; }
      }

      doc.save(`intel-brief-${dateFrom}-${dateTo}.pdf`);
    } catch {
      toast.error('PDF export failed');
    }
  }, [brief, dateFrom, dateTo]);

  return (
    <>
      {/* Trigger button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setOpen(true); setBrief(null); }}
        className="gap-1.5"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Generate AI Brief
      </Button>

      {/* Modal */}
      <LBDModal
        open={open}
        onClose={() => setOpen(false)}
        title="AI Intelligence Brief"
        description="Generate a structured briefing from your intel data."
        size="lg"
        footer={
          brief ? (
            <>
              <LBDModalButton onClick={() => setOpen(false)}>Close</LBDModalButton>
              <LBDModalButton onClick={handleExportPDF}>
                <FileDown className="w-4 h-4 mr-1" /> Export PDF
              </LBDModalButton>
              <LBDModalButton variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save to Briefs
              </LBDModalButton>
            </>
          ) : (
            <>
              <LBDModalButton onClick={() => setOpen(false)}>Cancel</LBDModalButton>
              <LBDModalButton variant="primary" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                {generating ? 'Generating…' : 'Generate Brief'}
              </LBDModalButton>
            </>
          )
        }
      >
        {!brief && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Date From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Date To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The AI will analyse all intel items within this date range and generate a structured briefing.
            </p>
          </div>
        )}

        {generating && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Analysing intelligence data…</p>
          </div>
        )}

        {brief && !generating && (
          <div className="space-y-6">
            {[
              { title: '📌 Headline Intelligence', content: brief.headline_intel },
              { title: '📊 Sentiment Assessment', content: brief.sentiment_assessment },
              { title: '⚠️ Key Threats', content: brief.key_threats },
              { title: '🎯 Recommended Actions', content: brief.recommended_actions },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold text-foreground mb-2">{section.title}</h4>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap rounded-lg border border-border/30 bg-card/50 p-4">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </LBDModal>
    </>
  );
}
