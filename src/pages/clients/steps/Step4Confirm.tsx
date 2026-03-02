/**
 * Step 4 — Confirm & Create
 *
 * Full summary of all entered data across steps 1–3.
 * The "Create Client Record" button is rendered in the wizard footer
 * (type="submit"). This component renders the summary only.
 */
import type { UseFormReturn } from 'react-hook-form';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
import { LBDBadge, LBDAlert } from '@/components/ui/lbd';
import { CLIENT_TYPE_LABELS } from '@/hooks/useClients';
import type { ClientFormData } from '../NewClientWizard';

interface Props {
  form:         UseFormReturn<ClientFormData>;
  ndaFile:      File | null;
  isSubmitting: boolean;
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

const SummaryRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
    <span className="text-xs text-muted-foreground flex-none w-44">{label}</span>
    <span className="text-sm text-foreground text-right">{value ?? <span className="text-muted-foreground/40">—</span>}</span>
  </div>
);

function qualLabel(val: 'aligned' | 'partial' | 'not_aligned' | 'sufficient' | 'marginal' | 'insufficient' | undefined): React.ReactNode {
  if (!val) return null;
  const map: Record<string, { label: string; cls: string }> = {
    aligned:      { label: 'Aligned',       cls: 'text-emerald-400' },
    partial:      { label: 'Partial',        cls: 'text-amber-400'   },
    not_aligned:  { label: 'Not Aligned',    cls: 'text-red-400'     },
    sufficient:   { label: 'Sufficient',     cls: 'text-emerald-400' },
    marginal:     { label: 'Marginal',       cls: 'text-amber-400'   },
    insufficient: { label: 'Insufficient',   cls: 'text-red-400'     },
  };
  const cfg = map[val];
  return <span className={`font-medium ${cfg?.cls}`}>{cfg?.label}</span>;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function Step4Confirm({ form, ndaFile, isSubmitting }: Props) {
  const values = form.watch();

  const typeLabel = values.type
    ? CLIENT_TYPE_LABELS[values.type] ?? values.type
    : '—';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-base font-semibold text-foreground">Confirm Client Record</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review all details before creating the client record. This action cannot be undone.
        </p>
      </div>

      {/* Qualification pass banner */}
      <LBDAlert
        variant="success"
        title="Qualification complete — all criteria passed"
        message="This client has successfully passed all 6 qualification criteria. Click 'Create Client Record' below to proceed."
        icon={<CheckCircle2 className="w-4 h-4" />}
      />

      {/* ── Section 1: Client Information ── */}
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 bg-card">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
            01 / Client Information
          </p>
        </div>
        <div className="px-4 py-1">
          <SummaryRow label="Name / Organisation" value={<strong>{values.name}</strong>} />
          <SummaryRow label="Client Type" value={
            <span className="text-sm font-medium text-foreground">{typeLabel}</span>
          } />
          <SummaryRow label="Primary Contact" value={values.contact_name} />
          <SummaryRow label="Contact Email" value={values.contact_email} />
          <SummaryRow label="Phone" value={values.phone || null} />
          {values.brief_description && (
            <SummaryRow label="Description" value={
              <span className="text-sm text-muted-foreground italic line-clamp-3">
                {values.brief_description}
              </span>
            } />
          )}
        </div>
      </div>

      {/* ── Section 2: Conflict of Interest ── */}
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 bg-card">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
            02 / Conflict of Interest
          </p>
        </div>
        <div className="px-4 py-1">
          <SummaryRow label="Conflict Detected" value={
            values.conflict_detected
              ? <span className="text-amber-400 font-medium flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Yes</span>
              : <span className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> None detected</span>
          } />
          {values.conflict_detected && (
            <>
              <SummaryRow label="Override Applied" value={
                values.conflict_override
                  ? <span className="text-amber-400">Yes — Lead Advisor override</span>
                  : '—'
              } />
              {values.conflict_override_notes && (
                <SummaryRow label="Override Justification" value={
                  <span className="text-muted-foreground text-xs italic">{values.conflict_override_notes}</span>
                } />
              )}
            </>
          )}
          <SummaryRow label="COI Sign-off" value={
            values.coi_final_signoff
              ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>
              : <span className="text-red-400">Not confirmed</span>
          } />
        </div>
      </div>

      {/* ── Section 3: Qualification Checklist ── */}
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 bg-card">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
            03 / Qualification Checklist
          </p>
        </div>
        <div className="px-4 py-1">

          {/* Criteria summary grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 py-2">
            {[
              { label: '1. Strategic Fit',   value: qualLabel(values.strategic_fit) },
              { label: '2. Ethical Alignment',value: values.ethical_alignment
                ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>
                : <span className="text-red-400">Not confirmed</span>
              },
              { label: '3. Capacity to Engage', value: qualLabel(values.capacity_to_engage) },
              { label: '4. NDA Status',      value: values.nda_status === 'executed'
                ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Executed</span>
                : <span className="text-amber-400">Pending</span>
              },
              { label: '5. Resource Sufficiency', value: qualLabel(values.resource_sufficiency) },
              { label: '6. Legal Acknowledgment', value: values.coi_legal_acknowledgment
                ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>
                : <span className="text-red-400">Not confirmed</span>
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm">{value}</span>
              </div>
            ))}
          </div>

          {/* NDA file */}
          {ndaFile && (
            <div className="flex items-center gap-2 py-2.5 border-t border-border/50">
              <FileText className="w-3.5 h-3.5 text-muted-foreground flex-none" />
              <span className="text-xs text-muted-foreground">NDA document:</span>
              <span className="text-xs text-foreground font-medium">{ndaFile.name}</span>
              <span className="text-[10px] text-muted-foreground/50">
                ({(ndaFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Final confirmation note */}
      <div className="rounded-xl border border-border/40 bg-card/30 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          By clicking <strong className="text-foreground">Create Client Record</strong>, you are confirming
          that all information is accurate, the qualification process has been completed in accordance with
          LBD's intake policies, and you authorise this client's onboarding into the platform.
          This action will be logged to the audit trail.
        </p>
      </div>

    </div>
  );
}
