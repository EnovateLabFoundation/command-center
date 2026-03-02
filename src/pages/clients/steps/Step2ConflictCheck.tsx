/**
 * Step 2 — Conflict of Interest Check (Automated)
 *
 * On mount, automatically queries clients table for name/email similarity.
 * Displays results:
 *   - Green banner if clear
 *   - Red banner listing conflicts if found (with override + mandatory notes)
 * Conflict check result is logged to audit_logs via logConflictCheck().
 */
import { useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { LBDAlert } from '@/components/ui/lbd';
import { useConflictCheck, logConflictCheck } from '@/hooks/useClients';
import { useAuthStore } from '@/stores/authStore';
import type { ClientFormData } from '../NewClientWizard';

interface Props {
  form: UseFormReturn<ClientFormData>;
}

const inputCls = [
  'w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground',
  'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent/50',
  'transition-colors',
].join(' ');

const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide';
const errorCls = 'text-xs text-red-400 mt-1';

export default function Step2ConflictCheck({ form }: Props) {
  const { user } = useAuthStore();
  const { register, watch, setValue, formState: { errors } } = form;

  const name  = watch('name');
  const email = watch('contact_email');
  const conflictOverride = watch('conflict_override');

  const { data: checkResult, isLoading, isSuccess } = useConflictCheck(name, email, true);

  // Track whether we've already logged this check result
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!isSuccess || !checkResult || !user?.id || loggedRef.current) return;
    loggedRef.current = true;

    // Push result into form state
    setValue('conflict_detected', checkResult.hasConflict, { shouldValidate: false });

    // Log to audit_logs
    logConflictCheck(
      user.id,
      name,
      checkResult,
      false,  // override = false at this point
      null,
    ).catch(console.warn);
  }, [isSuccess, checkResult, user?.id, name, setValue]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-base font-semibold text-foreground">Conflict of Interest Check</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Automatically screening against existing clients and engagements.
        </p>
      </div>

      {/* Client being checked */}
      <div className="rounded-xl border border-border bg-card/50 px-4 py-3">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
          Checking
        </p>
        <p className="text-sm font-medium text-foreground">{name}</p>
        {email && <p className="text-xs text-muted-foreground mt-0.5">{email}</p>}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
          <Loader2 className="w-4 h-4 text-accent animate-spin flex-none" />
          <p className="text-sm text-muted-foreground">Running conflict scan…</p>
        </div>
      )}

      {/* Result — No conflict */}
      {isSuccess && !isLoading && !checkResult?.hasConflict && (
        <LBDAlert
          variant="success"
          title="No conflicts detected"
          message="No matching client names or contact emails found in the system. You may proceed to the qualification checklist."
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      )}

      {/* Result — Conflict detected */}
      {isSuccess && !isLoading && checkResult?.hasConflict && (
        <div className="space-y-4">
          <LBDAlert
            variant="danger"
            title="Potential conflict detected"
            message={`${checkResult.matches.length} existing record(s) match this client's name or contact email. Review the matches below before proceeding.`}
            icon={<ShieldAlert className="w-4 h-4" />}
          />

          {/* Match list */}
          <div className="rounded-xl border border-red-800/30 bg-red-950/10 divide-y divide-red-800/20">
            {checkResult.matches.map((match, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-3">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-none" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium">{match.existing_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{match.description}</p>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  match.type === 'email'
                    ? 'text-red-400 border-red-800/40 bg-red-950/50'
                    : 'text-amber-400 border-amber-800/40 bg-amber-950/50'
                }`}>
                  {match.type.toUpperCase()} MATCH
                </span>
              </div>
            ))}
          </div>

          {/* Override section */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="conflict_override"
                className="mt-1 accent-accent w-4 h-4 rounded cursor-pointer"
                {...register('conflict_override')}
              />
              <div>
                <label htmlFor="conflict_override" className="text-sm text-foreground cursor-pointer font-medium">
                  I have reviewed the potential conflicts and confirm this is a distinct, non-conflicting client
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  As Lead Advisor, you are taking responsibility for this determination.
                  A justification note is mandatory.
                </p>
              </div>
            </div>
            {errors.conflict_override && (
              <p className={errorCls}>{errors.conflict_override.message}</p>
            )}

            {conflictOverride && (
              <div>
                <label htmlFor="conflict_override_notes" className={labelCls}>
                  Override Justification <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="conflict_override_notes"
                  rows={3}
                  placeholder="Explain why this client is distinct and does not create a conflict of interest…"
                  className={`${inputCls} resize-none`}
                  {...register('conflict_override_notes')}
                />
                {errors.conflict_override_notes && (
                  <p className={errorCls}>{errors.conflict_override_notes.message}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
