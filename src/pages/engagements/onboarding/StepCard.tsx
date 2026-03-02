/**
 * StepCard
 *
 * Collapsible card shell for a single onboarding step. Renders the step
 * number indicator, title, status badge, responsible party, due date, and
 * a lock overlay when the previous step is not yet complete.
 *
 * Step-specific content is injected as `children`.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDBadge } from '@/components/ui/lbd';
import { type StepDefinition, type StepState, type StepStatus, dueDate } from '@/hooks/useOnboarding';

/* ─────────────────────────────────────────────
   Status presentation helpers
───────────────────────────────────────────── */

interface StatusConfig {
  label: string;
  variant: 'green' | 'amber' | 'red' | 'outline' | 'gold';
  circleClass: string;
  borderClass: string;
}

const STATUS_CONFIG: Record<StepStatus, StatusConfig> = {
  complete: {
    label: 'Complete',
    variant: 'green',
    circleClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    borderClass: 'border-emerald-500/20',
  },
  in_progress: {
    label: 'In Progress',
    variant: 'amber',
    circleClass: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    borderClass: 'border-amber-500/20',
  },
  blocked: {
    label: 'Blocked',
    variant: 'red',
    circleClass: 'bg-red-500/20 border-red-500/50 text-red-400',
    borderClass: 'border-red-500/30',
  },
  not_started: {
    label: 'Not Started',
    variant: 'outline',
    circleClass: 'bg-muted/30 border-border text-muted-foreground',
    borderClass: 'border-border',
  },
};

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface StepCardProps {
  step: StepDefinition;
  stepState: StepState;
  isLocked: boolean;
  startDate: string | null | undefined;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function StepCard({
  step,
  stepState,
  isLocked,
  startDate,
  defaultExpanded = false,
  children,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cfg = STATUS_CONFIG[stepState.status];

  function handleToggle() {
    if (isLocked) return;
    setExpanded((prev) => !prev);
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card transition-colors',
        cfg.borderClass,
        isLocked && 'opacity-60',
      )}
    >
      {/* ── Header row ────────────────────────────── */}
      <button
        type="button"
        disabled={isLocked}
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-label={`${isLocked ? 'Locked: ' : ''}Step ${step.number}: ${step.title}`}
        className={cn(
          'w-full flex items-center gap-4 px-5 py-4 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl',
          !isLocked && 'cursor-pointer',
          isLocked && 'cursor-not-allowed',
        )}
      >
        {/* Step number circle */}
        <div
          className={cn(
            'flex-none w-9 h-9 rounded-full border-2 flex items-center justify-center',
            'text-sm font-mono font-bold transition-colors',
            cfg.circleClass,
          )}
          aria-hidden="true"
        >
          {stepState.status === 'complete' ? '✓' : step.number}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground leading-tight">
              {step.title}
            </span>
            <LBDBadge variant={cfg.variant} size="sm">
              {cfg.label}
            </LBDBadge>
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60">
                <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                LOCKED
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {step.responsible}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/40">·</span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              Due: {dueDate(startDate, step.sopDays)}
            </span>
            {stepState.completedAt && (
              <>
                <span className="text-[10px] font-mono text-muted-foreground/40">·</span>
                <span className="text-[10px] font-mono text-emerald-500/70">
                  Completed {new Date(stepState.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Chevron / lock icon */}
        <div className="flex-none text-muted-foreground/50" aria-hidden="true">
          {isLocked
            ? <Lock className="w-4 h-4" />
            : expanded
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />
          }
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────── */}
      {expanded && !isLocked && (
        <div className="border-t border-border px-5 pt-4 pb-5 space-y-4">
          {/* Description + required outputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase mb-1.5">
                Description
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase mb-1.5">
                Required Outputs
              </p>
              <ul className="space-y-1">
                {step.requiredOutputs.map((output) => (
                  <li key={output} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        'mt-0.5 w-1.5 h-1.5 rounded-full flex-none',
                        stepState.status === 'complete'
                          ? 'bg-emerald-500'
                          : 'bg-muted-foreground/30',
                      )}
                      aria-hidden="true"
                    />
                    {output}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Blocked reason banner */}
          {stepState.status === 'blocked' && stepState.blockedReason && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
              <p className="text-xs font-medium text-red-400">
                Blocked: {stepState.blockedReason}
              </p>
            </div>
          )}

          {/* Step-specific content */}
          <div>{children}</div>
        </div>
      )}
    </div>
  );
}
