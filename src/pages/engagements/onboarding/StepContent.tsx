/**
 * StepContent
 *
 * Step-specific UI components for each of the 6 onboarding steps.
 * Each export (Step1Content … Step6Content) receives the current step
 * state, a callback to update/complete the step, and the engagement detail.
 *
 * All form state is local; data is persisted to localStorage via `updateStep`
 * from useOnboarding. Completing a step fires a fire-and-forget audit_log
 * entry inside the hook.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Zap, FileText, Send, Upload, Calendar, Users, BarChart2, BookOpen, ExternalLink, Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/lbd';
import { type StepState } from '@/hooks/useOnboarding';
import { type EngagementDetail } from '@/hooks/useEngagementDetail';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Shared types
───────────────────────────────────────────── */

interface StepContentProps {
  engagementId: string;
  stepState: StepState;
  detail: EngagementDetail | null | undefined;
  updateStep: (
    stepNumber: number,
    newStatus: 'not_started' | 'in_progress' | 'complete' | 'blocked',
    data?: Record<string, unknown>,
    blockedReason?: string,
  ) => void;
}

/* ─────────────────────────────────────────────
   Reusable field components
───────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-mono tracking-widest text-muted-foreground/60 uppercase mb-1">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full bg-background rounded-lg px-3 py-2 text-xs text-foreground',
        'border border-border placeholder:text-muted-foreground/40',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={cn(
        'w-full bg-background rounded-lg px-3 py-2 text-xs text-foreground',
        'border border-border placeholder:text-muted-foreground/40',
        'focus:outline-none focus:ring-2 focus:ring-ring resize-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    />
  );
}

function ActionButton({
  onClick,
  disabled,
  loading,
  variant = 'primary',
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'success' | 'outline';
  children: React.ReactNode;
}) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-accent text-accent-foreground hover:bg-accent/90',
    success: 'bg-emerald-600/90 text-white hover:bg-emerald-600',
    outline: 'border border-border text-foreground hover:border-accent/30 hover:text-accent',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(base, variants[variant])}
    >
      {loading && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

function CompleteBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" aria-hidden="true" />
      <p className="text-xs font-medium text-emerald-400">This step is complete.</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEP 1 — Initial Inquiry & Intake
   Auto-complete on engagement creation. Shows a
   read-only summary of the qualification record.
───────────────────────────────────────────── */

export function Step1Content({ stepState, detail }: StepContentProps) {
  const isComplete = stepState.status === 'complete';

  return (
    <div className="space-y-4">
      {isComplete && <CompleteBanner />}

      <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-accent" aria-hidden="true" />
          <p className="text-xs font-semibold text-foreground">Qualification Summary</p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            { label: 'Client', value: detail?.client_name ?? '—' },
            { label: 'Client Type', value: detail?.client_type ?? '—' },
            { label: 'Start Date', value: detail?.start_date ?? '—' },
            { label: 'Lead Advisor', value: detail?.lead_advisor_name ?? '—' },
            { label: 'Fee Amount', value: detail?.fee_amount ? `₦${Number(detail.fee_amount).toLocaleString()}` : '—' },
            { label: 'Billing Status', value: detail?.billing_status ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase">{label}</p>
              <p className="text-xs text-foreground mt-0.5">{String(value)}</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] font-mono text-muted-foreground/40 pt-1">
          Intake completed automatically on engagement creation via the qualification wizard.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEP 2 — Discovery Conversation
   Links to the full Discovery Session page.
   Step is marked complete by DiscoverySession on lock.
───────────────────────────────────────────── */

export function Step2Content({ stepState, engagementId }: StepContentProps) {
  const navigate   = useNavigate();
  const isComplete = stepState.status === 'complete';

  const saved = (stepState.data ?? {}) as Record<string, string>;

  if (isComplete) {
    return (
      <div className="space-y-3">
        <CompleteBanner />
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Locked At',    value: saved.lockedAt    ? new Date(saved.lockedAt).toLocaleString('en-GB') : '—' },
            { label: 'Session ID',   value: saved.discoverySessionId ? `…${saved.discoverySessionId.slice(-8)}` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-1">{label}</p>
              <p className="text-xs text-foreground font-mono">{value}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate(`/engagements/${engagementId}/discovery`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-accent hover:border-accent/30 transition-colors"
        >
          <Lock className="w-3 h-3" aria-hidden="true" />
          View Locked Session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session info card */}
      <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-accent mt-0.5 flex-none" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-foreground">Confidential Discovery Session</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              The discovery session is a structured 7-area intelligence framework capturing the
              client's political context, objectives, threats, alliances, communications state,
              institutional context, and non-negotiables.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '7 Discovery Areas',        sub: 'Guided framework' },
            { label: 'AI Summarisation',          sub: 'Per-area bullet synthesis' },
            { label: 'Discovery Brief',           sub: 'Print-ready document' },
          ].map(({ label, sub }) => (
            <div key={label} className="rounded-lg border border-border bg-background/50 p-2.5">
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/engagements/${engagementId}/discovery`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          Open Discovery Session
        </button>
        <p className="text-[10px] font-mono text-muted-foreground/50">
          Complete all 7 areas and lock the session to mark this step complete.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEP 3 — Engagement Proposal
   Proposal builder with fee display, sent tracking,
   client response tracking.
───────────────────────────────────────────── */

const PROPOSAL_TEMPLATE = `ENGAGEMENT PROPOSAL

Client: [Client Name]
Prepared by: LBD Political Intelligence
Date: [Date]

─────────────────────────────────────
EXECUTIVE SUMMARY
─────────────────────────────────────
[Overview of the engagement and strategic value.]

─────────────────────────────────────
SCOPE OF WORK
─────────────────────────────────────
Phase 1 — Intelligence Baseline
Phase 2 — Strategy Development
Phase 3 — Execution & Monitoring
Phase 4 — Review & Reporting

─────────────────────────────────────
ENGAGEMENT FEE
─────────────────────────────────────
Retainer: ₦[Amount] per [period]
Billing: [Billing terms]

─────────────────────────────────────
TERMS & CONDITIONS
─────────────────────────────────────
[Standard LBD engagement terms apply.]
`;

export function Step3Content({ stepState, updateStep, detail }: StepContentProps) {
  const { user } = useAuthStore();
  const isComplete = stepState.status === 'complete';

  const saved = (stepState.data ?? {}) as Record<string, string>;

  const [proposalText, setProposalText]   = useState(saved.proposalText ?? PROPOSAL_TEMPLATE);
  const [sentDate, setSentDate]           = useState(saved.sentDate     ?? '');
  const [clientResponse, setClientResponse] = useState(saved.clientResponse ?? '');
  const [saving, setSaving]               = useState(false);

  const canComplete = proposalText.trim() && sentDate && clientResponse === 'accepted';

  const handleLoadTemplate = useCallback(() => {
    const filled = PROPOSAL_TEMPLATE
      .replace('[Client Name]', detail?.client_name ?? '[Client Name]')
      .replace('[Date]', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
      .replace('[Amount]', detail?.fee_amount ? Number(detail.fee_amount).toLocaleString() : '[Amount]')
      .replace('[Billing terms]', detail?.billing_status ?? '[Billing terms]');
    setProposalText(filled);
  }, [detail]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const data = { proposalText, sentDate, clientResponse };
      updateStep(3, 'in_progress', data);
      toast.success('Draft saved', 'Proposal draft saved.');
    } finally {
      setSaving(false);
    }
  }, [proposalText, sentDate, clientResponse, updateStep]);

  const handleComplete = useCallback(async () => {
    if (!canComplete) {
      toast.error('Cannot complete', 'Proposal must be sent and client must have accepted.');
      return;
    }
    setSaving(true);
    try {
      const data = { proposalText, sentDate, clientResponse, completedBy: user?.id };
      updateStep(3, 'complete', data);
      toast.success('Step 3 complete', 'Proposal accepted and recorded.');
    } finally {
      setSaving(false);
    }
  }, [canComplete, proposalText, sentDate, clientResponse, user, updateStep]);

  if (isComplete) {
    return (
      <div className="space-y-3">
        <CompleteBanner />
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-1">Date Sent</p>
            <p className="text-xs text-foreground">{saved.sentDate || '—'}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-1">Client Response</p>
            <p className="text-xs text-emerald-400 capitalize">{saved.clientResponse || '—'}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-1">Fee</p>
            <p className="text-xs text-foreground">
              {detail?.fee_amount ? `₦${Number(detail.fee_amount).toLocaleString()}` : '—'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fee display strip */}
      {detail?.fee_amount && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/15">
          <BarChart2 className="w-4 h-4 text-accent" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">Engagement Fee</p>
            <p className="text-sm font-semibold text-accent font-mono">
              ₦{Number(detail.fee_amount).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Proposal builder */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Proposal Document *</FieldLabel>
          <button
            type="button"
            onClick={handleLoadTemplate}
            className="text-[10px] font-mono text-accent hover:underline"
          >
            Load Template
          </button>
        </div>
        <TextArea value={proposalText} onChange={setProposalText} rows={12} placeholder="Write or paste proposal content…" />
      </div>

      {/* Sent date + client response */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Date Sent to Client *</FieldLabel>
          <TextInput value={sentDate} onChange={setSentDate} type="date" />
        </div>
        <div>
          <FieldLabel>Client Response *</FieldLabel>
          <select
            value={clientResponse}
            onChange={(e) => setClientResponse(e.target.value)}
            className={cn(
              'w-full bg-background rounded-lg px-3 py-2 text-xs text-foreground',
              'border border-border focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          >
            <option value="">— Awaiting response —</option>
            <option value="accepted">Accepted</option>
            <option value="negotiating">Negotiating</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <ActionButton onClick={handleSave} loading={saving} variant="outline">
          <Send className="w-3 h-3" aria-hidden="true" />
          Save Draft
        </ActionButton>
        <ActionButton onClick={handleComplete} loading={saving} disabled={!canComplete} variant="success">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          Mark Complete
        </ActionButton>
        {!canComplete && (
          <p className="text-[10px] font-mono text-muted-foreground/50">
            {!sentDate ? 'Add send date' : clientResponse !== 'accepted' ? 'Client must accept' : 'Fill all required fields'}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEP 4 — Agreement & Kick-off
   Signed agreement URL, kick-off date, agenda,
   team assignment notes.
───────────────────────────────────────────── */

const AGENDA_TEMPLATE = `KICK-OFF MEETING AGENDA

1. Welcome & Introductions (5 min)
2. Engagement Overview & Objectives (15 min)
3. Team Roles & Responsibilities (10 min)
4. Intelligence Gathering Framework (15 min)
5. Communication Protocols (10 min)
6. Milestones & Timeline Review (10 min)
7. Q&A (15 min)
8. Next Steps & Action Items (5 min)
`;

export function Step4Content({ stepState, updateStep, engagementId }: StepContentProps) {
  const { user } = useAuthStore();
  const isComplete = stepState.status === 'complete';

  const saved = (stepState.data ?? {}) as Record<string, string>;

  const [agreementUrl, setAgreementUrl] = useState(saved.agreementUrl ?? '');
  const [kickoffDate, setKickoffDate]   = useState(saved.kickoffDate   ?? '');
  const [agenda, setAgenda]             = useState(saved.agenda        ?? AGENDA_TEMPLATE);
  const [teamNotes, setTeamNotes]       = useState(saved.teamNotes     ?? '');
  const [saving, setSaving]             = useState(false);

  const canComplete = agreementUrl.trim() && kickoffDate && agenda.trim() && teamNotes.trim();

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const data = { agreementUrl, kickoffDate, agenda, teamNotes };
      updateStep(4, 'in_progress', data);
      toast.success('Draft saved', 'Agreement details saved.');
    } finally {
      setSaving(false);
    }
  }, [agreementUrl, kickoffDate, agenda, teamNotes, updateStep]);

  const handleComplete = useCallback(async () => {
    if (!canComplete) {
      toast.error('Cannot complete', 'All agreement and kick-off fields are required.');
      return;
    }
    setSaving(true);
    try {
      const data = { agreementUrl, kickoffDate, agenda, teamNotes, completedBy: user?.id };
      updateStep(4, 'complete', data);
      toast.success('Step 4 complete', 'Agreement recorded. Intelligence baseline auto-seeded.');
    } finally {
      setSaving(false);
    }
  }, [canComplete, agreementUrl, kickoffDate, agenda, teamNotes, user, updateStep, engagementId]);

  if (isComplete) {
    return (
      <div className="space-y-3">
        <CompleteBanner />
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Signed Agreement URL', value: saved.agreementUrl },
            { label: 'Kick-off Date', value: saved.kickoffDate },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-1">{label}</p>
              {label.includes('URL') && value
                ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline break-all">{value}</a>
                : <p className="text-xs text-foreground">{value || '—'}</p>
              }
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Signed Agreement URL *</FieldLabel>
          <TextInput value={agreementUrl} onChange={setAgreementUrl} placeholder="https://drive.google.com/…" type="url" />
          <p className="mt-1 text-[10px] font-mono text-muted-foreground/40">
            Link to signed agreement in your document store
          </p>
        </div>
        <div>
          <FieldLabel>Kick-off Meeting Date *</FieldLabel>
          <TextInput value={kickoffDate} onChange={setKickoffDate} type="date" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Kick-off Agenda *</FieldLabel>
          <button
            type="button"
            onClick={() => setAgenda(AGENDA_TEMPLATE)}
            className="text-[10px] font-mono text-accent hover:underline"
          >
            Reset Template
          </button>
        </div>
        <TextArea value={agenda} onChange={setAgenda} rows={10} />
      </div>

      <div>
        <FieldLabel>Team Assignment Notes *</FieldLabel>
        <TextArea value={teamNotes} onChange={setTeamNotes} placeholder="List team members, their roles, and primary responsibilities for this engagement…" rows={3} />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <ActionButton onClick={handleSave} loading={saving} variant="outline">
          <Upload className="w-3 h-3" aria-hidden="true" />
          Save Draft
        </ActionButton>
        <ActionButton onClick={handleComplete} loading={saving} disabled={!canComplete} variant="success">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          Mark Complete
        </ActionButton>
        {!canComplete && (
          <p className="text-[10px] font-mono text-muted-foreground/50">All fields required to complete</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEP 5 — Intelligence Baseline Setup
   Auto-triggered on Step 4 complete.
   Seedes stakeholder + intel_item records.
───────────────────────────────────────────── */

export function Step5Content({ stepState, updateStep, engagementId }: StepContentProps) {
  const { user } = useAuthStore();
  const isComplete = stepState.status === 'complete';

  /* Mutation: seed Power Map stakeholder + Intel item */
  const seedMutation = useMutation({
    mutationFn: async () => {
      const results: string[] = [];

      // Seed Power Map (stakeholders)
      const { error: shErr } = await supabase.from('stakeholders').insert({
        engagement_id: engagementId,
        name: 'Primary Stakeholder (seed)',
        role: 'Key Contact',
        influence_level: 'high',
        relationship_status: 'neutral',
        notes: 'Auto-seeded at intelligence baseline setup. Update with real stakeholder data.',
        created_by: user?.id,
      });
      if (shErr) throw new Error(`Power Map seed failed: ${shErr.message}`);
      results.push('Power Map record seeded');

      // Seed Intel Tracker (intel_items)
      const { error: inErr } = await supabase.from('intel_items').insert({
        engagement_id: engagementId,
        title: 'Intelligence Baseline Briefing (seed)',
        category: 'political',
        source: 'Internal',
        reliability: 'unverified',
        significance: 'medium',
        summary: 'Auto-seeded at intelligence baseline setup. Update with verified intelligence.',
        created_by: user?.id,
      });
      if (inErr) throw new Error(`Intel Tracker seed failed: ${inErr.message}`);
      results.push('Intel Tracker record seeded');

      return results;
    },
    onSuccess: (results) => {
      updateStep(5, 'complete', { seededModules: results, completedBy: user?.id });
      toast.success('Step 5 complete', 'Power Map and Intel Tracker seeded.');
    },
    onError: (err: Error) => {
      toast.error('Seed failed', err.message);
    },
  });

  const seeded = (stepState.data as { seededModules?: string[] } | undefined)?.seededModules ?? [];

  if (isComplete) {
    return (
      <div className="space-y-3">
        <CompleteBanner />
        <div className="rounded-lg border border-border bg-background/50 p-4">
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-2">Seeded Modules</p>
          <ul className="space-y-1.5">
            {seeded.length > 0
              ? seeded.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-xs text-foreground">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-none" aria-hidden="true" />
                    {s}
                  </li>
                ))
              : ['Power Map record seeded', 'Intel Tracker record seeded'].map((s) => (
                  <li key={s} className="flex items-center gap-2 text-xs text-foreground">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-none" aria-hidden="true" />
                    {s}
                  </li>
                ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent/15 bg-accent/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" aria-hidden="true" />
          <p className="text-xs font-semibold text-foreground">Initialise Intelligence Baseline</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This action will create seed records in the <strong>Power Map</strong> (stakeholders) and{' '}
          <strong>Intel Tracker</strong> (intelligence items) modules. Your team can then populate
          these with real intelligence data.
        </p>
        <ul className="space-y-1 pt-1">
          {[
            'Stakeholder seed record → Power Map',
            'Intelligence baseline record → Intel Tracker',
          ].map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60 flex-none" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <ActionButton
          onClick={() => seedMutation.mutate()}
          loading={seedMutation.isPending}
          variant="success"
          disabled={isComplete}
        >
          <Zap className="w-3 h-3" aria-hidden="true" />
          Initialise Baseline
        </ActionButton>
        {seedMutation.isPending && (
          <p className="text-[10px] font-mono text-muted-foreground/50">Creating seed records…</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEP 6 — First Strategy Session
   Session agenda, notes, creates narrative_platform
   and scenarios stubs, logs to audit_logs.
───────────────────────────────────────────── */

const SESSION_AGENDA_TEMPLATE = `FIRST STRATEGY SESSION AGENDA

1. Review Discovery Brief & Proposal Outcomes (15 min)
2. Strategic Landscape Overview (20 min)
3. Key Narrative Themes (15 min)
4. Scenario Planning Introduction (15 min)
5. Action Planning — 30/60/90 Day (20 min)
6. Communication & Reporting Cadence (10 min)
7. Open Discussion (5 min)
`;

export function Step6Content({ stepState, updateStep, engagementId }: StepContentProps) {
  const { user } = useAuthStore();
  const isComplete = stepState.status === 'complete';

  const saved = (stepState.data ?? {}) as Record<string, string>;

  const [sessionDate, setSessionDate] = useState(saved.sessionDate ?? '');
  const [agenda, setAgenda]           = useState(saved.agenda     ?? SESSION_AGENDA_TEMPLATE);
  const [notes, setNotes]             = useState(saved.notes      ?? '');
  const [saving, setSaving]           = useState(false);

  const canComplete = sessionDate && agenda.trim() && notes.trim();

  /* Mutation: create narrative_platform + scenarios stubs */
  const completeMutation = useMutation({
    mutationFn: async () => {
      // Narrative platform stub
      const { error: npErr } = await supabase.from('narrative_platform').insert({
        engagement_id: engagementId,
        core_message: 'To be developed — narrative platform stub',
        tone: 'aspirational',
        created_by: user?.id,
      });
      if (npErr) throw new Error(`Narrative platform seed: ${npErr.message}`);

      // Scenarios stub
      const { error: scErr } = await supabase.from('scenarios').insert({
        engagement_id: engagementId,
        title: 'Baseline Scenario (seed)',
        description: 'Auto-seeded at first strategy session. Update with scenario analysis.',
        probability: 'medium',
        impact: 'high',
        created_by: user?.id,
      });
      if (scErr) throw new Error(`Scenarios seed: ${scErr.message}`);

      // Audit log for onboarding complete
      await supabase.from('audit_logs').insert({
        action: 'update',
        table_name: 'engagements',
        record_id: engagementId,
        user_id: user?.id,
        new_values: {
          onboarding_step: 6,
          onboarding_status: 'complete',
          session_date: sessionDate,
          notes,
        },
      });
    },
    onSuccess: () => {
      const data = { sessionDate, agenda, notes, completedBy: user?.id };
      updateStep(6, 'complete', data);
      toast.success('Onboarding complete!', 'All 6 steps done. Strategy modules are now active.');
    },
    onError: (err: Error) => {
      toast.error('Cannot complete step 6', err.message);
    },
  });

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      updateStep(6, 'in_progress', { sessionDate, agenda, notes });
      toast.success('Draft saved', 'Session notes saved.');
    } finally {
      setSaving(false);
    }
  }, [sessionDate, agenda, notes, updateStep]);

  const handleComplete = useCallback(() => {
    if (!canComplete) {
      toast.error('Cannot complete', 'Session date, agenda, and notes are all required.');
      return;
    }
    completeMutation.mutate();
  }, [canComplete, completeMutation]);

  if (isComplete) {
    return (
      <div className="space-y-3">
        <CompleteBanner />
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-1">Session Date</p>
            <p className="text-xs text-foreground">{saved.sessionDate || '—'}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-[10px] font-mono text-emerald-500/60 uppercase mb-1">Modules Created</p>
            <p className="text-xs text-emerald-400">Narrative Platform · Scenarios</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase mb-1">Session Notes</p>
          <p className="text-xs text-foreground whitespace-pre-wrap">{saved.notes || '—'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent/15 bg-accent/5 p-3 flex items-start gap-2">
        <BookOpen className="w-4 h-4 text-accent mt-0.5 flex-none" aria-hidden="true" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Completing this step will create seed records in <strong>Narrative Platform</strong> and{' '}
          <strong>Scenarios</strong>, and lock the onboarding tracker as complete.
        </p>
      </div>

      <div>
        <FieldLabel>Session Date *</FieldLabel>
        <TextInput value={sessionDate} onChange={setSessionDate} type="date" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Session Agenda *</FieldLabel>
          <button
            type="button"
            onClick={() => setAgenda(SESSION_AGENDA_TEMPLATE)}
            className="text-[10px] font-mono text-accent hover:underline"
          >
            Reset Template
          </button>
        </div>
        <TextArea value={agenda} onChange={setAgenda} rows={9} />
      </div>

      <div>
        <FieldLabel>Session Notes *</FieldLabel>
        <TextArea
          value={notes}
          onChange={setNotes}
          placeholder="Key outcomes, decisions, action items, and strategic directions from the session…"
          rows={4}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <ActionButton onClick={handleSave} loading={saving} variant="outline">
          <Calendar className="w-3 h-3" aria-hidden="true" />
          Save Draft
        </ActionButton>
        <ActionButton
          onClick={handleComplete}
          loading={completeMutation.isPending}
          disabled={!canComplete}
          variant="success"
        >
          <Users className="w-3 h-3" aria-hidden="true" />
          Complete Onboarding
        </ActionButton>
        {!canComplete && (
          <p className="text-[10px] font-mono text-muted-foreground/50">All fields required</p>
        )}
      </div>
    </div>
  );
}
