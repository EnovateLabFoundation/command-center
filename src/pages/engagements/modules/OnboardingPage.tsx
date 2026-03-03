/**
 * OnboardingPage
 *
 * The primary onboarding module inside the Engagement Workspace.
 * Renders two internal sub-tabs:
 *  1. Onboarding — vertical 6-step stepper with progress bar
 *  2. Overview   — engagement detail card (phase, dates, advisor, fee)
 *
 * Onboarding state lives in localStorage (via useOnboarding) and is
 * synced to audit_logs on step completion. No custom DB table required.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardList, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { useEngagement } from '@/contexts/EngagementContext';
import { useEngagementDetail } from '@/hooks/useEngagementDetail';
import { useOnboarding, STEP_DEFINITIONS } from '@/hooks/useOnboarding';
import {
  LBDCard,
  LBDLoadingSkeleton,
  LBDProgressBar,
  LBDBadge,
} from '@/components/ui/lbd';
import { cn } from '@/lib/utils';
import StepCard from '../onboarding/StepCard';
import {
  Step1Content,
  Step2Content,
  Step3Content,
  Step4Content,
  Step5Content,
  Step6Content,
} from '../onboarding/StepContent';

/* ─────────────────────────────────────────────
   Sub-tab config
───────────────────────────────────────────── */

type SubTab = 'onboarding' | 'overview';

interface TabConfig {
  id: SubTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'onboarding', label: 'Onboarding', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { id: 'overview',   label: 'Overview',   icon: <LayoutGrid    className="w-3.5 h-3.5" /> },
];

/* ─────────────────────────────────────────────
   Step content lookup
───────────────────────────────────────────── */

type StepContentComponent = React.ComponentType<{
  engagementId: string;
  stepState: ReturnType<typeof useOnboarding>['state'][number];
  detail: ReturnType<typeof useEngagementDetail>['data'];
  updateStep: ReturnType<typeof useOnboarding>['updateStep'];
}>;

const STEP_CONTENT_MAP: Record<number, StepContentComponent> = {
  1: Step1Content,
  2: Step2Content,
  3: Step3Content,
  4: Step4Content,
  5: Step5Content,
  6: Step6Content,
};

/* ─────────────────────────────────────────────
   Overview tab content
───────────────────────────────────────────── */

function OverviewTab({
  detail,
  phase,
  status,
  healthRag,
}: {
  detail: ReturnType<typeof useEngagementDetail>['data'];
  phase: string | undefined;
  status: string | undefined;
  healthRag: string | undefined;
}) {
  if (!detail) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <LBDLoadingSkeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const ragVariant: Record<string, 'green' | 'amber' | 'red'> = {
    green: 'green', amber: 'amber', red: 'red',
  };
  const statusVariant: Record<string, 'green' | 'amber' | 'outline'> = {
    active: 'green', paused: 'amber', closed: 'outline',
  };

  const fields = [
    { label: 'Client',         value: detail.client_name ?? '—' },
    { label: 'Client Type',    value: detail.client_type ?? '—' },
    { label: 'Lead Advisor',   value: detail.lead_advisor_name ?? '—' },
    { label: 'Start Date',     value: detail.start_date ?? '—' },
    { label: 'End Date',       value: detail.end_date ?? 'TBD' },
    { label: 'Fee Amount',     value: detail.fee_amount ? `₦${Number(detail.fee_amount).toLocaleString()}` : '—' },
    { label: 'Billing Status', value: detail.billing_status ?? '—' },
    { label: 'Created',        value: detail.created_at ? new Date(detail.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
  ];

  return (
    <div className="space-y-4">
      {/* Status strip */}
      <LBDCard className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase">Phase</p>
            <p className="text-xl font-mono font-bold text-accent mt-0.5">Phase {phase ?? '—'}</p>
          </div>
          <div className="ml-4 flex items-center gap-2">
            {status && (
              <LBDBadge variant={statusVariant[status] ?? 'outline'} size="sm">
                {status.toUpperCase()}
              </LBDBadge>
            )}
            {healthRag && (
              <LBDBadge variant={ragVariant[healthRag] ?? 'outline'} size="sm">
                {healthRag.toUpperCase()}
              </LBDBadge>
            )}
          </div>
        </div>
      </LBDCard>

      {/* Details grid */}
      <LBDCard className="p-4">
        <p className="text-[10px] font-mono tracking-widest text-muted-foreground/40 uppercase mb-4">
          Engagement Details
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase">{label}</p>
              <p className="text-xs text-foreground mt-0.5 capitalize">{String(value)}</p>
            </div>
          ))}
        </div>
      </LBDCard>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */

export default function OnboardingPage() {
  const { id: engagementId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<SubTab>('onboarding');

  /* Engagement data from context */
  const { engagements } = useEngagement();
  const contextEngagement = engagements.find((e) => e.id === engagementId);

  /* Detailed engagement data (includes client name, advisor name) */
  const { data: detail, isLoading: detailLoading } = useEngagementDetail(engagementId);

  /* Onboarding state */
  const {
    state,
    updateStep,
    isStepLocked,
    completedCount,
    progressPct,
    isOnboardingComplete,
  } = useOnboarding(engagementId);

  /* ── No ID guard ──────────────────────────── */
  if (!engagementId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">No engagement selected.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* ── Sub-tab navigation ────────────────── */}
      <div className="flex items-center gap-1 bg-muted/20 rounded-xl p-1 w-fit border border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ONBOARDING TAB ────────────────────── */}
      {activeTab === 'onboarding' && (
        <div className="space-y-5">

          {/* Progress header card */}
          <LBDCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase mb-0.5">
                  Onboarding Progress
                </p>
                <p className="text-sm font-medium text-foreground">
                  {completedCount} of {STEP_DEFINITIONS.length} steps complete
                </p>
              </div>
              {isOnboardingComplete ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">Complete</span>
                </div>
              ) : (
                <p className="text-xs font-mono text-muted-foreground">
                  {Math.round(progressPct)}%
                </p>
              )}
            </div>

            {/* Progress bar */}
            <LBDProgressBar
              value={progressPct}
              max={100}
              variant={isOnboardingComplete ? 'success' : 'gold'}
              size="sm"
              animated={!isOnboardingComplete && completedCount > 0}
              className="w-full"
            />

            {/* Step dot indicators */}
            <div className="flex items-center gap-2 pt-0.5" aria-label="Step progress indicators">
              {STEP_DEFINITIONS.map((step) => {
                const s = state[step.number];
                const isDone   = s?.status === 'complete';
                const isActive = s?.status === 'in_progress';
                return (
                  <div
                    key={step.number}
                    title={`Step ${step.number}: ${step.title} (${s?.status ?? 'not_started'})`}
                    className={cn(
                      'w-2 h-2 rounded-full border transition-colors',
                      isDone   && 'bg-emerald-500 border-emerald-500',
                      isActive && 'bg-amber-500 border-amber-500',
                      !isDone && !isActive && 'bg-muted/40 border-border',
                    )}
                    aria-label={`Step ${step.number} — ${s?.status ?? 'not_started'}`}
                  />
                );
              })}
            </div>
          </LBDCard>

          {/* Loading skeleton */}
          {detailLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <LBDLoadingSkeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}

          {/* Step cards */}
          {!detailLoading && STEP_DEFINITIONS.map((step) => {
            const stepState  = state[step.number] ?? { status: 'not_started' as const };
            const locked     = isStepLocked(step.number);
            const StepContentComponent = STEP_CONTENT_MAP[step.number];

            return (
              <StepCard
                key={step.number}
                step={step}
                stepState={stepState}
                isLocked={locked}
                startDate={detail?.start_date ?? (contextEngagement as any)?.start_date}
                defaultExpanded={
                  step.number === completedCount + 1 && !isOnboardingComplete
                }
              >
                <StepContentComponent
                  engagementId={engagementId}
                  stepState={stepState}
                  detail={detail}
                  updateStep={updateStep}
                />
              </StepCard>
            );
          })}

          {/* Completion callout */}
          {isOnboardingComplete && (
            <LBDCard className="p-5 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-none mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Onboarding Complete</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    All six onboarding steps have been completed. Intelligence and strategy
                    modules are now fully active. Use the Overview tab to review engagement details.
                  </p>
                </div>
              </div>
            </LBDCard>
          )}
        </div>
      )}

      {/* ── OVERVIEW TAB ──────────────────────── */}
      {activeTab === 'overview' && (
        <OverviewTab
          detail={detail}
          phase={contextEngagement?.phase}
          status={contextEngagement?.status}
          healthRag={contextEngagement?.health_rag}
        />
      )}
    </div>
  );
}
