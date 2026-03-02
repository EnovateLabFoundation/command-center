/**
 * useOnboarding
 *
 * Manages the 6-step onboarding workflow for an engagement.
 *
 * State is persisted in localStorage (key: lbd:onboarding:{engagementId}) for
 * instant load without a DB round-trip. Step completions are also fire-and-
 * forget logged to audit_logs for the audit trail.
 *
 * Step-ordering rules:
 *   - Step 1 is auto-marked 'complete' when the hook initialises for the first
 *     time (engagement creation = intake done).
 *   - Steps 2–6 are locked until the preceding step is 'complete'.
 *   - A blocked step shows a red banner with a reason.
 *
 * SOP due dates are computed from engagement.start_date + sopDays offsets.
 */

import { useState, useEffect, useCallback } from 'react';
import { addDays, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type StepStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked';

export interface StepDefinition {
  number: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  responsible: string;
  /** Days from engagement start_date per SOP */
  sopDays: number;
  description: string;
  requiredOutputs: string[];
}

export interface StepState {
  status: StepStatus;
  completedAt?: string;
  completedBy?: string;
  /** Step-specific form data saved on completion */
  data?: Record<string, unknown>;
  blockedReason?: string;
}

export type OnboardingState = Record<number, StepState>;

/* ─────────────────────────────────────────────
   SOP step definitions
───────────────────────────────────────────── */

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    number: 1,
    title: 'Initial Inquiry & Intake',
    responsible: 'Lead Advisor',
    sopDays: 0,
    description:
      'Client qualification completed. Review the qualification checklist summary and confirm all criteria were met before proceeding to Discovery.',
    requiredOutputs: [
      'Qualification checklist completed',
      'Signed NDA on file',
      'COI sign-off confirmed',
    ],
  },
  {
    number: 2,
    title: 'Discovery Conversation',
    responsible: 'Lead Advisor + Senior Advisor',
    sopDays: 3,
    description:
      'Conduct a structured discovery session with the client. Capture objectives, key stakeholders, strategic context, and current challenges. The output is a formal Discovery Brief.',
    requiredOutputs: [
      'Primary objectives documented',
      'Key stakeholder names captured',
      'Discovery brief generated',
    ],
  },
  {
    number: 3,
    title: 'Engagement Proposal',
    responsible: 'Lead Advisor',
    sopDays: 7,
    description:
      "Draft, review, and deliver a formal engagement proposal. Record when the proposal is sent and capture the client's response before advancing.",
    requiredOutputs: [
      'Proposal drafted',
      'Proposal sent to client',
      'Client response recorded (Accepted)',
    ],
  },
  {
    number: 4,
    title: 'Agreement & Kick-off',
    responsible: 'Lead Advisor + Admin',
    sopDays: 14,
    description:
      'Formalise the engagement with a signed agreement. Schedule and conduct the kick-off meeting. Assign the full engagement team and confirm roles.',
    requiredOutputs: [
      'Signed agreement on file',
      'Kick-off meeting scheduled',
      'Engagement team assigned',
    ],
  },
  {
    number: 5,
    title: 'Intelligence Baseline',
    responsible: 'Intel Analyst',
    sopDays: 21,
    description:
      'Auto-initialise the intelligence infrastructure for this engagement. Seed the Power Map and Intel Tracker with placeholder records. Activate any configured platform integrations.',
    requiredOutputs: [
      'Power Map record created',
      'Intel Tracker seeded',
      'Integrations reviewed',
    ],
  },
  {
    number: 6,
    title: 'First Strategy Session',
    responsible: 'Senior Advisor + Lead Advisor',
    sopDays: 30,
    description:
      'Hold the inaugural strategy session. Build the session agenda, capture notes, and initialise the Narrative Platform and Scenario Planner stubs for ongoing strategic work.',
    requiredOutputs: [
      'Session agenda built',
      'Session notes recorded',
      'Narrative Platform stub created',
      'Scenario Planner stub created',
    ],
  },
];

/* ─────────────────────────────────────────────
   localStorage helpers
───────────────────────────────────────────── */

const lsKey = (id: string) => `lbd:onboarding:${id}`;

function loadState(engagementId: string): OnboardingState {
  try {
    const raw = localStorage.getItem(lsKey(engagementId));
    if (raw) return JSON.parse(raw) as OnboardingState;
  } catch { /* ignore */ }

  // Default: Step 1 complete (engagement creation = intake done), rest not started
  const defaults: OnboardingState = {};
  for (let i = 1; i <= 6; i++) {
    defaults[i] = { status: i === 1 ? 'complete' : 'not_started' };
  }
  return defaults;
}

function saveState(engagementId: string, state: OnboardingState): void {
  try {
    localStorage.setItem(lsKey(engagementId), JSON.stringify(state));
  } catch { /* ignore */ }
}

/* ─────────────────────────────────────────────
   Due date helper (exported for step cards)
───────────────────────────────────────────── */

export function dueDate(
  startDate: string | null | undefined,
  sopDays: number,
): string {
  if (!startDate) {
    return sopDays === 0 ? 'Day 0 — engagement start' : `+${sopDays} days from start`;
  }
  try {
    return format(addDays(new Date(startDate), sopDays), 'd MMM yyyy');
  } catch {
    return `+${sopDays}d`;
  }
}

/* ─────────────────────────────────────────────
   Hook
───────────────────────────────────────────── */

export function useOnboarding(engagementId: string | undefined) {
  const { user } = useAuthStore();

  const [state, setState] = useState<OnboardingState>(() =>
    engagementId ? loadState(engagementId) : {},
  );

  // Re-sync when switching engagement workspaces
  useEffect(() => {
    if (engagementId) setState(loadState(engagementId));
  }, [engagementId]);

  /**
   * Update a step's status and optionally attach form payload data.
   * Completions are fire-and-forget logged to audit_logs.
   */
  const updateStep = useCallback(
    async (
      stepNumber: number,
      newStatus: StepStatus,
      data?: Record<string, unknown>,
      blockedReason?: string,
    ) => {
      if (!engagementId || !user?.id) return;

      const now = new Date().toISOString();
      const stepState: StepState = {
        status: newStatus,
        ...(newStatus === 'complete' ? { completedAt: now, completedBy: user.id } : {}),
        ...(data ? { data } : {}),
        ...(blockedReason ? { blockedReason } : {}),
      };

      setState((prev) => {
        const next = { ...prev, [stepNumber]: stepState };
        saveState(engagementId, next);
        return next;
      });

      // Audit log — fire-and-forget
      if (newStatus === 'complete') {
        supabase
          .from('audit_logs')
          .insert({
            action: 'update',
            table_name: 'engagements',
            record_id: engagementId,
            user_id: user.id,
            new_values: {
              onboarding_step: stepNumber,
              onboarding_status: 'complete',
              ...(data ?? {}),
            },
          })
          .then(({ error }) => {
            if (error) console.warn('[useOnboarding] audit log failed:', error);
          });
      }
    },
    [engagementId, user?.id],
  );

  /**
   * True when the step cannot yet be started (previous step incomplete
   * OR this step is already blocked/complete).
   */
  const isStepLocked = useCallback(
    (stepNumber: number): boolean => {
      if (stepNumber === 1) return false; // Step 1 is never locked
      const prev = state[stepNumber - 1];
      return !prev || prev.status !== 'complete';
    },
    [state],
  );

  const completedCount = Object.values(state).filter(
    (s) => s?.status === 'complete',
  ).length;
  const progressPct = Math.round((completedCount / 6) * 100);
  const isOnboardingComplete = completedCount === 6;

  return {
    state,
    updateStep,
    isStepLocked,
    completedCount,
    progressPct,
    isOnboardingComplete,
  };
}
