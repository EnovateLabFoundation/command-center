/**
 * CloseOutPage
 *
 * 7-step engagement close-out workflow. Only accessible to lead_advisor
 * and super_admin when the engagement is active or paused. Walks through:
 *   1. Final Situation Assessment
 *   2. Objectives vs Actuals (KPIs)
 *   3. Toolkit Archive
 *   4. Close-Out Report
 *   5. Lessons Learned
 *   6. Client Relationship Status
 *   7. Finalise Close-Out
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  CheckCircle2, Circle, FileText, Archive, BarChart3,
  BookOpen, Users, Flag, AlertTriangle, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useEngagement } from '@/contexts/EngagementContext';
import {
  useCloseOutSummary,
  useEngagementKpis,
  useUpsertKpi,
  useEngagementArchives,
  useArchiveModule,
  useSaveLessons,
  useFinaliseCloseOut,
} from '@/hooks/useCloseOut';
import { usePublishReport, useReportEngagement } from '@/hooks/useReports';
import { generateReport, downloadReport } from '@/lib/reportEngine';
import { LBDPageHeader, LBDCard, LBDStatCard, LBDBadge } from '@/components/ui/lbd';
import { LBDConfirmDialog } from '@/components/ui/lbd/LBDConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/* ─────────────────────────────────────────────
   Step definitions
───────────────────────────────────────────── */

const STEPS = [
  { key: 'assessment', label: 'Final Assessment', Icon: BarChart3 },
  { key: 'kpis', label: 'Objectives vs Actuals', Icon: Flag },
  { key: 'archive', label: 'Toolkit Archive', Icon: Archive },
  { key: 'report', label: 'Close-Out Report', Icon: FileText },
  { key: 'lessons', label: 'Lessons Learned', Icon: BookOpen },
  { key: 'relationship', label: 'Client Status', Icon: Users },
  { key: 'finalise', label: 'Finalise', Icon: CheckCircle2 },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

/** Toolkit modules available for archiving */
const TOOLKIT_MODULES = [
  'Power Map', 'Intel Tracker', 'Competitors', 'Geospatial',
  'Scenarios', 'Narrative', 'Brand Audit',
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function CloseOutPage() {
  const { id: engagementId } = useParams<{ id: string }>();
  const { role, user } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { engagements } = useEngagement();

  const engagement = engagements.find((e) => e.id === engagementId);

  /* State */
  const [currentStep, setCurrentStep] = useState<StepKey>('assessment');
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());
  const [commentary, setCommentary] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [reportApproved, setReportApproved] = useState(false);

  /* Lessons learned form */
  const [lessons, setLessons] = useState({
    what_worked: '',
    what_didnt: '',
    what_surprised: '',
    what_different: '',
    key_insights: '',
    recommendations: '',
  });

  /* Relationship status */
  const [relStatus, setRelStatus] = useState('completed_successful');
  const [relNotes, setRelNotes] = useState('');
  const [reEngDate, setReEngDate] = useState('');

  /* KPI form */
  const [newKpiName, setNewKpiName] = useState('');
  const [newKpiTarget, setNewKpiTarget] = useState('');

  /* Data hooks */
  const { data: summary, isLoading: summaryLoading } = useCloseOutSummary(engagementId);
  const { data: kpis = [] } = useEngagementKpis(engagementId);
  const { data: archives = [] } = useEngagementArchives(engagementId);
  const { data: engData } = useReportEngagement(engagementId);
  const upsertKpi = useUpsertKpi();
  const archiveModule = useArchiveModule();
  const saveLessons = useSaveLessons();
  const finalise = useFinaliseCloseOut();
  const publishReport = usePublishReport();

  /* Derived */
  const archivedModules = new Set(archives.map((a) => a.module_name));
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  /** Mark current step complete and advance */
  function completeStep() {
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next.key);
  }

  /** Handle KPI add */
  async function handleAddKpi() {
    if (!newKpiName.trim() || !engagementId) return;
    await upsertKpi.mutateAsync({
      engagement_id: engagementId,
      kpi_name: newKpiName.trim(),
      target_value: newKpiTarget.trim() || undefined,
      status: 'pending',
    });
    setNewKpiName('');
    setNewKpiTarget('');
  }

  /** Handle KPI status update */
  async function handleKpiStatusChange(kpiId: string, engId: string, status: string) {
    await upsertKpi.mutateAsync({ id: kpiId, engagement_id: engId, kpi_name: '', status });
  }

  /** Handle module archive */
  async function handleArchive(moduleName: string) {
    if (!engagementId) return;
    await archiveModule.mutateAsync({
      engagementId,
      moduleName,
      snapshotData: { archived_at: new Date().toISOString(), module: moduleName },
    });
    toast({ title: `${moduleName} archived`, description: 'Snapshot saved successfully.' });
  }

  /** Generate close-out report */
  async function handleGenerateReport() {
    if (!engagementId || !engData) return;
    const clientName = (engData as any)?.clients?.name ?? 'Client';
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    const sections = [
      { title: 'Executive Summary', html: `<p>${commentary || 'No strategic commentary provided.'}</p>` },
      { title: 'Objectives vs Actuals', html: kpis.map((k) => `<p><strong>${k.kpi_name}</strong>: Target ${k.target_value ?? 'N/A'} → Actual ${k.actual_value ?? 'N/A'} (${k.status})</p>`).join('') || '<p>No KPIs recorded.</p>' },
      { title: 'Lessons Learned', html: Object.entries(lessons).map(([k, v]) => v ? `<p><strong>${k.replace(/_/g, ' ')}:</strong> ${v}</p>` : '').join('') || '<p>No lessons recorded.</p>' },
    ];

    const doc = await generateReport('closeout', sections, {
      clientName,
      engagementName: engData.title,
      date: dateStr,
      reportTitle: 'Engagement Close-Out Report',
    });

    downloadReport(doc, clientName, 'Close_Out', dateStr);
    toast({ title: 'Report generated', description: 'PDF downloaded successfully.' });
  }

  /** Publish close-out report to portal */
  async function handlePublishReport() {
    if (!engagementId || !engData) return;
    const clientName = (engData as any)?.clients?.name ?? 'Client';
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    const sections = [
      { title: 'Executive Summary', html: `<p>${commentary || 'No strategic commentary provided.'}</p>` },
      { title: 'Objectives vs Actuals', html: kpis.map((k) => `<p><strong>${k.kpi_name}</strong>: Target ${k.target_value ?? 'N/A'} → Actual ${k.actual_value ?? 'N/A'} (${k.status})</p>`).join('') || '<p>No KPIs recorded.</p>' },
    ];

    const doc = await generateReport('closeout', sections, {
      clientName,
      engagementName: engData.title,
      date: dateStr,
      reportTitle: 'Engagement Close-Out Report',
    });

    await publishReport.mutateAsync({
      engagementId,
      title: `Close-Out Report — ${dateStr}`,
      type: 'closeout',
      doc,
      isPublic: true,
    });

    setReportApproved(true);
    toast({ title: 'Report published', description: 'Available in client portal.' });
  }

  /** Save lessons to engagement and knowledge base */
  async function handleSaveLessons() {
    if (!engagementId) return;
    await saveLessons.mutateAsync({ engagementId, lessons });

    // Also save to knowledge base
    if (user?.id && Object.values(lessons).some((v) => v.trim())) {
      await (supabase as any).from('knowledge_base').insert({
        category: 'lesson',
        title: `Lessons — ${engagement?.title ?? 'Engagement'}`,
        content: Object.entries(lessons).map(([k, v]) => `## ${k.replace(/_/g, ' ')}\n${v}`).join('\n\n'),
        tags: ['close-out', 'lessons-learned'],
        engagement_id: engagementId,
        created_by: user.id,
      });
    }

    toast({ title: 'Lessons saved', description: 'Added to firm knowledge base.' });
    completeStep();
  }

  /** Final close-out */
  async function handleFinalise() {
    if (!engagementId) return;
    await finalise.mutateAsync({
      engagementId,
      relationshipStatus: relStatus,
      relationshipNotes: relNotes,
      reEngagementDate: reEngDate || undefined,
      commentary,
    });

    toast({ title: 'Engagement closed', description: 'All data archived and portal access revoked.' });
    navigate('/engagements');
  }

  /* ── Access guard ── */
  if (role !== 'super_admin' && role !== 'lead_advisor') {
    return (
      <div className="p-6">
        <LBDCard className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Only Lead Advisors and Super Admins can access the close-out workflow.</p>
        </LBDCard>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <LBDPageHeader
        title="Engagement Close-Out"
        subtitle={engagement?.title ?? 'Close-out workflow'}
      />

      {/* ── Step progress ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const done = completedSteps.has(step.key);
          const active = step.key === currentStep;
          return (
            <button
              key={step.key}
              onClick={() => setCurrentStep(step.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                active ? 'bg-accent/10 text-accent border border-accent/30' :
                done ? 'bg-accent/5 text-accent/70 border border-accent/10' :
                'text-muted-foreground hover:text-foreground border border-transparent hover:border-border',
              )}
            >
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <step.Icon className="w-3.5 h-3.5" />}
              <span>{i + 1}. {step.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Step content ── */}
      <LBDCard className="p-6">
        {/* STEP 1: Final Assessment */}
        {currentStep === 'assessment' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Final Situation Assessment</h2>
            {summaryLoading ? (
              <p className="text-sm text-muted-foreground">Loading summary data…</p>
            ) : summary ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <LBDStatCard label="Stakeholders" value={summary.stakeholderCount} />
                <LBDStatCard label="Avg Sentiment" value={summary.avgSentiment} />
                <LBDStatCard label="Brand Score" value={summary.latestBrandAudit?.overall_score ?? 'N/A'} />
                <LBDStatCard label="Comms Completion" value={`${summary.commsCompletionRate}%`} />
              </div>
            ) : null}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Strategic Commentary</label>
              <textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Add final strategic commentary…"
              />
            </div>
            <button onClick={completeStep} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90">
              Complete Step 1
            </button>
          </div>
        )}

        {/* STEP 2: KPIs */}
        {currentStep === 'kpis' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Objectives vs Actuals</h2>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground text-xs">
                    <th className="text-left px-3 py-2">KPI</th>
                    <th className="text-left px-3 py-2">Target</th>
                    <th className="text-left px-3 py-2">Actual</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi) => (
                    <tr key={kpi.id} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">{kpi.kpi_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{kpi.target_value ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{kpi.actual_value ?? '—'}</td>
                      <td className="px-3 py-2">
                        <select
                          value={kpi.status}
                          onChange={(e) => handleKpiStatusChange(kpi.id, kpi.engagement_id, e.target.value)}
                          className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
                        >
                          <option value="pending">Pending</option>
                          <option value="achieved">Achieved</option>
                          <option value="partial">Partial</option>
                          <option value="not_achieved">Not Achieved</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {kpis.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No KPIs set. Add one below.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">KPI Name</label>
                <input value={newKpiName} onChange={(e) => setNewKpiName(e.target.value)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" placeholder="e.g. Media mentions per month" />
              </div>
              <div className="w-32">
                <label className="block text-xs text-muted-foreground mb-1">Target</label>
                <input value={newKpiTarget} onChange={(e) => setNewKpiTarget(e.target.value)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" placeholder="e.g. 50" />
              </div>
              <button onClick={handleAddKpi} disabled={!newKpiName.trim()} className="px-3 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg text-sm hover:bg-accent/20 disabled:opacity-40">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button onClick={completeStep} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90">
              Complete Step 2
            </button>
          </div>
        )}

        {/* STEP 3: Archive */}
        {currentStep === 'archive' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Toolkit Archive</h2>
            <p className="text-xs text-muted-foreground">Create snapshots of each module's data at close date.</p>
            <div className="space-y-2">
              {TOOLKIT_MODULES.map((mod) => {
                const archived = archivedModules.has(mod);
                return (
                  <div key={mod} className="flex items-center justify-between px-4 py-3 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      {archived ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm text-foreground">{mod}</span>
                    </div>
                    <button
                      onClick={() => handleArchive(mod)}
                      disabled={archived || archiveModule.isPending}
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-lg font-medium transition-colors',
                        archived ? 'bg-accent/10 text-accent cursor-default' : 'bg-accent/10 text-accent hover:bg-accent/20',
                      )}
                    >
                      {archived ? 'Archived' : 'Archive'}
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={completeStep} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90">
              Complete Step 3
            </button>
          </div>
        )}

        {/* STEP 4: Report */}
        {currentStep === 'report' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Close-Out Report</h2>
            <p className="text-xs text-muted-foreground">Generate a comprehensive close-out report. Must be approved before proceeding.</p>
            <div className="flex items-center gap-3">
              <button onClick={handleGenerateReport} className="px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg text-sm hover:bg-accent/20">
                Download PDF
              </button>
              <button onClick={handlePublishReport} disabled={publishReport.isPending} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-40">
                {publishReport.isPending ? 'Publishing…' : 'Approve & Publish'}
              </button>
            </div>
            {reportApproved && (
              <LBDBadge variant="green" size="sm">Report Approved ✓</LBDBadge>
            )}
            <button onClick={completeStep} disabled={!reportApproved} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-40">
              Complete Step 4
            </button>
          </div>
        )}

        {/* STEP 5: Lessons Learned */}
        {currentStep === 'lessons' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Lessons Learned</h2>
            {(['what_worked', 'what_didnt', 'what_surprised', 'what_different', 'key_insights', 'recommendations'] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs text-muted-foreground mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
                <textarea
                  value={lessons[field]}
                  onChange={(e) => setLessons((prev) => ({ ...prev, [field]: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <button onClick={handleSaveLessons} disabled={saveLessons.isPending} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-40">
              {saveLessons.isPending ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        )}

        {/* STEP 6: Relationship Status */}
        {currentStep === 'relationship' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Client Relationship Status</h2>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Status</label>
              <select value={relStatus} onChange={(e) => setRelStatus(e.target.value)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground">
                <option value="completed_successful">Completed (Successful)</option>
                <option value="completed_early">Completed (Early)</option>
                <option value="paused">Paused</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Notes</label>
              <textarea value={relNotes} onChange={(e) => setRelNotes(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Re-engagement Date (optional)</label>
              <input type="date" value={reEngDate} onChange={(e) => setReEngDate(e.target.value)} className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            </div>
            <button onClick={completeStep} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90">
              Complete Step 6
            </button>
          </div>
        )}

        {/* STEP 7: Finalise */}
        {currentStep === 'finalise' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Finalise Close-Out</h2>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-foreground font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                This action is irreversible
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Engagement will be marked as closed. All client portal access will be revoked immediately.
              </p>
            </div>
            <button
              onClick={() => setShowConfirmDialog(true)}
              className="px-6 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90"
            >
              Complete Close-Out
            </button>
          </div>
        )}
      </LBDCard>

      {/* ── Confirm dialog ── */}
      <LBDConfirmDialog
        open={showConfirmDialog}
        onConfirm={handleFinalise}
        onCancel={() => setShowConfirmDialog(false)}
        title="Close Engagement"
        description="Closing an engagement is irreversible. All data will be archived and client portal access will be revoked."
        confirmLabel="Complete Close-Out"
        confirmPhrase="CLOSE"
        variant="danger"
        loading={finalise.isPending}
      />
    </div>
  );
}
