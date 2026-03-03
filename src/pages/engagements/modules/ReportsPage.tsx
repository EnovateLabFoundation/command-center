/**
 * ReportsPage — Report Builder & Export Engine
 *
 * Located at /engagements/:id/reports.
 * Two sections: Quick Exports (6 pre-built types) and Published Reports list.
 * Each quick export opens a config modal, generates a preview, and allows
 * download, publish to portal, or save to engagement.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  Target,
  BarChart3,
  ClipboardCheck,
  Loader2,
  Globe,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  LBDPageHeader,
  LBDCard,
  LBDEmptyState,
  LBDBadge,
} from '@/components/ui/lbd';
import { LBDModal, LBDModalButton } from '@/components/ui/lbd/LBDModal';
import { LBDDrawer } from '@/components/ui/lbd/LBDDrawer';
import {
  usePublishedReports,
  useReportIntel,
  useReportEngagement,
  usePublishReport,
} from '@/hooks/useReports';
import {
  generateReport,
  downloadReport,
  type ReportSection,
  type ReportConfig,
} from '@/lib/reportEngine';
import { toast } from '@/hooks/use-toast';

/* ─────────────────────────────────────────────
   Report type definitions
───────────────────────────────────────────── */

interface ReportType {
  key: string;
  label: string;
  description: string;
  icon: typeof FileText;
  defaultDateRange: () => { from: string; to: string };
}

const REPORT_TYPES: ReportType[] = [
  {
    key: 'weekly_intel',
    label: 'Weekly Intel Briefing',
    description: 'Intelligence summary from the past 7 days.',
    icon: FileText,
    defaultDateRange: () => ({
      from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    key: 'monthly_assessment',
    label: 'Monthly Situation Assessment',
    description: 'Comprehensive monthly review across all modules.',
    icon: Calendar,
    defaultDateRange: () => ({
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  },
  {
    key: 'quarterly_review',
    label: 'Quarterly Strategy Review',
    description: 'Full engagement review for the quarter.',
    icon: BarChart3,
    defaultDateRange: () => ({
      from: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    key: 'crisis_debrief',
    label: 'Crisis Debrief',
    description: 'Post-crisis analysis and lessons learned.',
    icon: AlertTriangle,
    defaultDateRange: () => ({
      from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    key: 'brand_audit',
    label: 'Brand Audit Report',
    description: 'Brand scorecard analysis and recommendations.',
    icon: Target,
    defaultDateRange: () => ({
      from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    key: 'close_out',
    label: 'Engagement Close-Out',
    description: 'Comprehensive final engagement report.',
    icon: ClipboardCheck,
    defaultDateRange: () => ({
      from: format(subDays(new Date(), 365), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function ReportsPage() {
  const { id: engagementId } = useParams<{ id: string }>();

  // Data
  const { data: engagement } = useReportEngagement(engagementId);
  const { data: publishedReports, isLoading: reportsLoading } = usePublishedReports(engagementId);
  const publishMutation = usePublishReport();

  // Modal state
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSections, setPreviewSections] = useState<ReportSection[]>([]);
  const [previewConfig, setPreviewConfig] = useState<ReportConfig | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  // Intel data for report generation
  const { data: intelItems } = useReportIntel(engagementId, dateFrom, dateTo);

  const clientName = (engagement as any)?.clients?.name ?? 'Client';
  const engagementName = engagement?.title ?? 'Engagement';

  /** Open config modal for a report type */
  const openConfig = useCallback((rt: ReportType) => {
    setSelectedType(rt);
    const range = rt.defaultDateRange();
    setDateFrom(range.from);
    setDateTo(range.to);
    setConfigOpen(true);
  }, []);

  /** Build HTML sections from intel data for report */
  const buildSections = useCallback((): ReportSection[] => {
    const items = intelItems ?? [];
    const sections: ReportSection[] = [];

    // Executive summary
    sections.push({
      title: 'Executive Summary',
      html: `<p>This report covers the period <strong>${dateFrom}</strong> to <strong>${dateTo}</strong> 
        for the <strong>${engagementName}</strong> engagement. 
        A total of <strong>${items.length}</strong> intelligence items were tracked during this period.</p>`,
    });

    // Headline intelligence
    const topItems = items.slice(0, 10);
    if (topItems.length > 0) {
      sections.push({
        title: 'Headline Intelligence',
        html: `<table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="border-bottom:2px solid #ddd;">
            <th style="text-align:left;padding:6px;">Date</th>
            <th style="text-align:left;padding:6px;">Headline</th>
            <th style="text-align:left;padding:6px;">Source</th>
            <th style="text-align:right;padding:6px;">Sentiment</th>
          </tr></thead>
          <tbody>${topItems.map(i => `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:6px;">${i.date_logged}</td>
            <td style="padding:6px;">${i.headline}</td>
            <td style="padding:6px;">${i.source_name ?? '—'}</td>
            <td style="padding:6px;text-align:right;">${i.sentiment_score?.toFixed(1) ?? '—'}</td>
          </tr>`).join('')}</tbody></table>`,
      });
    }

    // Sentiment overview
    const withSentiment = items.filter(i => i.sentiment_score != null);
    if (withSentiment.length > 0) {
      const avg = withSentiment.reduce((s, i) => s + Number(i.sentiment_score), 0) / withSentiment.length;
      const positive = withSentiment.filter(i => Number(i.sentiment_score) > 0).length;
      const negative = withSentiment.filter(i => Number(i.sentiment_score) < 0).length;
      sections.push({
        title: 'Sentiment Assessment',
        html: `<div style="display:flex;gap:24px;margin-bottom:12px;">
          <div><strong style="font-size:24px;">${avg.toFixed(2)}</strong><br/><span style="color:#888;">Avg Sentiment</span></div>
          <div><strong style="font-size:24px;color:#27AE60;">${positive}</strong><br/><span style="color:#888;">Positive</span></div>
          <div><strong style="font-size:24px;color:#C0392B;">${negative}</strong><br/><span style="color:#888;">Negative</span></div>
        </div>
        <p>Overall narrative health for this period is <strong>${avg > 0.3 ? 'positive' : avg < -0.3 ? 'concerning' : 'neutral/mixed'}</strong>.</p>`,
      });
    }

    // Source breakdown
    const bySource: Record<string, number> = {};
    items.forEach(i => { bySource[i.source_type ?? 'unknown'] = (bySource[i.source_type ?? 'unknown'] ?? 0) + 1; });
    sections.push({
      title: 'Source Breakdown',
      html: `<table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="border-bottom:2px solid #ddd;">
          <th style="text-align:left;padding:6px;">Source Type</th>
          <th style="text-align:right;padding:6px;">Count</th>
        </tr></thead>
        <tbody>${Object.entries(bySource).map(([k, v]) =>
          `<tr style="border-bottom:1px solid #eee;"><td style="padding:6px;">${k}</td><td style="padding:6px;text-align:right;">${v}</td></tr>`
        ).join('')}</tbody></table>`,
    });

    return sections;
  }, [intelItems, dateFrom, dateTo, engagementName]);

  /** Generate the report */
  const handleGenerate = useCallback(async () => {
    if (!selectedType) return;
    setGenerating(true);
    try {
      const sections = buildSections();
      const config: ReportConfig = {
        clientName,
        engagementName,
        date: format(new Date(), 'dd MMMM yyyy'),
        reportTitle: selectedType.label,
      };

      const doc = await generateReport(selectedType.key, sections, config);

      setPreviewSections(sections);
      setPreviewConfig(config);
      setGeneratedDoc(doc);
      setConfigOpen(false);
      setPreviewOpen(true);
    } catch (err) {
      toast({ title: 'Generation failed', description: String(err), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [selectedType, buildSections, clientName, engagementName]);

  /** Download the generated PDF */
  const handleDownload = useCallback(() => {
    if (!generatedDoc || !previewConfig) return;
    downloadReport(generatedDoc, clientName, selectedType?.key ?? 'report', format(new Date(), 'yyyy-MM-dd'));
    toast({ title: 'PDF downloaded' });
  }, [generatedDoc, previewConfig, clientName, selectedType]);

  /** Publish to client portal */
  const handlePublish = useCallback(async () => {
    if (!generatedDoc || !engagementId || !selectedType) return;
    try {
      await publishMutation.mutateAsync({
        engagementId,
        title: selectedType.label,
        type: selectedType.key,
        doc: generatedDoc,
        isPublic: true,
      });
      toast({ title: 'Published to Client Portal' });
      setPreviewOpen(false);
    } catch (err) {
      toast({ title: 'Publish failed', description: String(err), variant: 'destructive' });
    }
  }, [generatedDoc, engagementId, selectedType, publishMutation]);

  /** Save to engagement (private) */
  const handleSave = useCallback(async () => {
    if (!generatedDoc || !engagementId || !selectedType) return;
    try {
      await publishMutation.mutateAsync({
        engagementId,
        title: selectedType.label,
        type: selectedType.key,
        doc: generatedDoc,
        isPublic: false,
      });
      toast({ title: 'Report saved to engagement' });
      setPreviewOpen(false);
    } catch (err) {
      toast({ title: 'Save failed', description: String(err), variant: 'destructive' });
    }
  }, [generatedDoc, engagementId, selectedType, publishMutation]);

  return (
    <div className="p-6 space-y-8">
      <LBDPageHeader
        eyebrow="REPORTING"
        title="Reports & Export"
        description="Generate branded reports, export data, and publish to the client portal."
      />

      {/* ── Quick Exports ──────────────────────── */}
      <section>
        <h2 className="text-xs font-mono tracking-[0.25em] text-muted-foreground mb-4">QUICK EXPORTS</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_TYPES.map((rt) => (
            <LBDCard
              key={rt.key}
              className="p-4 cursor-pointer hover:border-accent/30 transition-colors group"
              onClick={() => openConfig(rt)}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && openConfig(rt)}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-none group-hover:border-accent/40 transition-colors">
                  <rt.icon className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{rt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{rt.description}</p>
                </div>
              </div>
            </LBDCard>
          ))}
        </div>
      </section>

      {/* ── Published Reports ──────────────────── */}
      <section>
        <h2 className="text-xs font-mono tracking-[0.25em] text-muted-foreground mb-4">PUBLISHED REPORTS</h2>
        {reportsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-accent" />
          </div>
        ) : publishedReports && publishedReports.length > 0 ? (
          <div className="space-y-2">
            {publishedReports.map((report) => (
              <LBDCard key={report.id} className="p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-none">
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{report.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <LBDBadge variant="outline" className="text-[10px]">{report.type}</LBDBadge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(report.published_at), 'dd MMM yyyy')}
                    </span>
                    {report.is_public && (
                      <LBDBadge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">
                        <Globe className="w-2.5 h-2.5 mr-0.5" /> Portal
                      </LBDBadge>
                    )}
                  </div>
                </div>
                {report.file_path && (
                  <button
                    onClick={async () => {
                      const { data } = await supabase.storage
                        .from('reports')
                        .createSignedUrl(report.file_path!, 300);
                      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                )}
              </LBDCard>
            ))}
          </div>
        ) : (
          <LBDEmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No Reports Yet"
            description="Generate your first report using the Quick Exports above."
          />
        )}
      </section>

      {/* ── Config Modal ───────────────────────── */}
      <LBDModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title={selectedType?.label ?? 'Generate Report'}
        description="Configure report parameters before generating."
        size="sm"
        footer={
          <>
            <LBDModalButton variant="ghost" onClick={() => setConfigOpen(false)}>Cancel</LBDModalButton>
            <LBDModalButton variant="primary" onClick={handleGenerate} disabled={generating}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Generating…</> : 'Generate Report'}
            </LBDModalButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Client:</strong> {clientName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong className="text-foreground">Engagement:</strong> {engagementName}
            </p>
          </div>
        </div>
      </LBDModal>

      {/* ── Preview Drawer ─────────────────────── */}
      <LBDDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Report Preview"
        description={previewConfig?.reportTitle}
        width={640}
        footer={
          <>
            <LBDModalButton variant="ghost" onClick={() => setPreviewOpen(false)}>Close</LBDModalButton>
            <LBDModalButton variant="ghost" onClick={handleSave} disabled={publishMutation.isPending}>
              Save to Engagement
            </LBDModalButton>
            <LBDModalButton variant="ghost" onClick={handlePublish} disabled={publishMutation.isPending}>
              <Globe className="w-3.5 h-3.5 mr-1" /> Publish to Portal
            </LBDModalButton>
            <LBDModalButton variant="primary" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
            </LBDModalButton>
          </>
        }
      >
        <div className="space-y-6">
          {/* Title page preview */}
          <div className="p-6 rounded-xl bg-[hsl(var(--background))] border border-border text-center">
            <p className="text-xs font-mono tracking-[0.3em] text-accent mb-2">LEAD BY DARTH — STRATEGIC ADVISORY</p>
            <p className="text-lg font-bold text-foreground">{previewConfig?.reportTitle}</p>
            <p className="text-sm text-muted-foreground mt-2">{previewConfig?.clientName}</p>
            <p className="text-xs text-muted-foreground mt-1">{previewConfig?.engagementName}</p>
            <p className="text-xs text-muted-foreground mt-3">{previewConfig?.date}</p>
            <p className="text-[10px] font-mono tracking-wider text-accent mt-4">CONFIDENTIAL</p>
          </div>

          {/* Section previews */}
          {previewSections.map((section, i) => (
            <div key={i} className="p-5 rounded-xl border border-border bg-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">{section.title}</h3>
              <div
                className="text-xs text-muted-foreground [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:py-1 [&_td]:py-1 [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
            </div>
          ))}
        </div>
      </LBDDrawer>
    </div>
  );
}
