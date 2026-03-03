/**
 * NewClientWizard
 *
 * Full-page, 4-step wizard for client intake and qualification.
 *
 * Step 1 — Client Information (basic fields)
 * Step 2 — Conflict of Interest Check (automated, with override)
 * Step 3 — Qualification Checklist (6 criteria)
 * Step 4 — Confirm & Create
 *
 * Form state is managed here with a single react-hook-form instance.
 * The NDA File object lives in a separate useState (File not serialisable).
 * On Step 4 submit: uploads NDA → inserts client row → writes audit log.
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { LBDCard, toast } from '@/components/ui/lbd';
import { useCreateClient } from '@/hooks/useClients';

import Step1ClientInfo from './steps/Step1ClientInfo';
import Step2ConflictCheck from './steps/Step2ConflictCheck';
import Step3Qualification from './steps/Step3Qualification';
import Step4Confirm from './steps/Step4Confirm';

/* ─────────────────────────────────────────────
   Zod schema — single source of truth
───────────────────────────────────────────── */

export const clientFormSchema = z.object({
  // Step 1
  name:              z.string().min(2, 'Organisation or full name is required').max(200),
  type:              z.enum(['legislator', 'governor', 'ministry', 'civic', 'party'], {
    required_error: 'Please select a client type',
  }),
  contact_name:      z.string().min(2, 'Primary contact name is required').max(200),
  contact_email:     z.string().email('A valid email address is required'),
  phone:             z.string().optional(),
  brief_description: z.string().max(1000).optional(),

  // Step 2 — set programmatically by conflict check
  conflict_detected:       z.boolean().default(false),
  conflict_override:       z.boolean().default(false),
  conflict_override_notes: z.string().optional(),

  // Step 3 — 6 qualification criteria
  strategic_fit:          z.enum(['aligned', 'partial', 'not_aligned'], {
    required_error: 'Strategic fit is required',
  }),
  strategic_fit_notes:    z.string().optional(),
  ethical_alignment:      z.boolean().default(false),
  ethical_alignment_notes: z.string().optional(),
  capacity_to_engage:     z.enum(['sufficient', 'marginal', 'insufficient'], {
    required_error: 'Capacity to engage is required',
  }),
  capacity_notes:         z.string().optional(),
  nda_status:             z.enum(['pending', 'executed'], {
    required_error: 'NDA status is required',
  }),
  resource_sufficiency:   z.enum(['sufficient', 'marginal', 'insufficient'], {
    required_error: 'Resource sufficiency is required',
  }),
  resource_notes:         z.string().optional(),
  coi_final_signoff:      z.boolean().default(false),
  coi_legal_acknowledgment: z.boolean().default(false),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

/* ─────────────────────────────────────────────
   Step meta
───────────────────────────────────────────── */

const STEPS = [
  { number: 1, label: 'Client Info',      description: 'Basic details'        },
  { number: 2, label: 'Conflict Check',   description: 'Automated screening'  },
  { number: 3, label: 'Qualification',    description: '6-criteria assessment' },
  { number: 4, label: 'Confirm & Create', description: 'Review and submit'     },
] as const;

type StepNumber = 1 | 2 | 3 | 4;

/* ─────────────────────────────────────────────
   Step-field map — for targeted trigger()
───────────────────────────────────────────── */

const STEP_FIELDS: Record<StepNumber, (keyof ClientFormData)[]> = {
  1: ['name', 'type', 'contact_name', 'contact_email'],
  2: [],   // validated programmatically
  3: [
    'strategic_fit', 'ethical_alignment', 'ethical_alignment_notes',
    'capacity_to_engage', 'nda_status', 'resource_sufficiency',
    'coi_final_signoff', 'coi_legal_acknowledgment',
  ],
  4: [],   // just submit
};

/* ─────────────────────────────────────────────
   Qualification pass/fail logic
───────────────────────────────────────────── */

export function qualificationErrors(values: Partial<ClientFormData>): string[] {
  const errs: string[] = [];
  if (values.strategic_fit === 'not_aligned')
    errs.push('Strategic Fit: "Not Aligned" — client does not meet strategic criteria');
  if (!values.ethical_alignment)
    errs.push('Ethical Alignment: confirmation checkbox must be checked');
  if (!values.ethical_alignment_notes?.trim())
    errs.push('Ethical Alignment: justification notes are required');
  if (values.capacity_to_engage === 'insufficient')
    errs.push('Capacity to Engage: "Insufficient" — client cannot support the engagement');
  if (values.nda_status !== 'executed')
    errs.push('Confidentiality Agreement: NDA must be "Executed" before proceeding');
  if (values.resource_sufficiency === 'insufficient')
    errs.push('Resource Sufficiency: "Insufficient" — inadequate resources to proceed');
  if (!values.coi_final_signoff)
    errs.push('Conflict of Interest: Lead Advisor sign-off is required');
  if (!values.coi_legal_acknowledgment)
    errs.push('Conflict of Interest: legal acknowledgment must be confirmed');
  return errs;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function NewClientWizard() {
  const navigate = useNavigate();
  const createClient = useCreateClient();

  const [step, setStep]       = useState<StepNumber>(1);
  const [ndaFile, setNdaFile] = useState<File | null>(null);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      conflict_detected:        false,
      conflict_override:        false,
      ethical_alignment:        false,
      coi_final_signoff:        false,
      coi_legal_acknowledgment: false,
    },
    mode: 'onTouched',
  });

  /* ── Navigation ── */

  async function handleNext() {
    if (step === 1) {
      const ok = await form.trigger(STEP_FIELDS[1]);
      if (!ok) return;
    }

    if (step === 2) {
      const conflictDetected = form.getValues('conflict_detected');
      const override = form.getValues('conflict_override');
      const notes    = form.getValues('conflict_override_notes') ?? '';
      if (conflictDetected && !override) {
        form.setError('conflict_override', {
          message: 'You must confirm the override to proceed',
        });
        return;
      }
      if (conflictDetected && override && !notes.trim()) {
        form.setError('conflict_override_notes', {
          message: 'Override notes are required when a conflict is detected',
        });
        return;
      }
    }

    if (step === 3) {
      const ok = await form.trigger(STEP_FIELDS[3]);
      if (!ok) return;
      const values = form.getValues();
      const errs = qualificationErrors(values);
      if (errs.length > 0) {
        // Errors are shown inside Step3 — prevent advancing
        return;
      }
    }

    setStep((s) => Math.min(s + 1, 4) as StepNumber);
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1) as StepNumber);
  }

  /* ── Submit ── */

  async function handleSubmit(data: ClientFormData) {
    const qualErrs = qualificationErrors(data);
    if (qualErrs.length > 0) {
      toast.error('Qualification Incomplete', qualErrs[0]);
      return;
    }

    try {
      const newClient = await createClient.mutateAsync({
        name:             data.name,
        type:             data.type,
        contact_name:     data.contact_name,
        contact_email:    data.contact_email,
        phone:            data.phone || null,
        brief_description: data.brief_description || null,
        nda_signed:       data.nda_status === 'executed',
        conflict_check_passed: !data.conflict_detected || data.conflict_override,
        qualification_status: 'qualified',
        ndaFile,
        qualificationChecklist: {
          strategic_fit:        data.strategic_fit,
          strategic_fit_notes:  data.strategic_fit_notes,
          ethical_alignment:    data.ethical_alignment,
          ethical_alignment_notes: data.ethical_alignment_notes,
          capacity_to_engage:   data.capacity_to_engage,
          capacity_notes:       data.capacity_notes,
          nda_status:           data.nda_status,
          resource_sufficiency: data.resource_sufficiency,
          resource_notes:       data.resource_notes,
          coi_final_signoff:    data.coi_final_signoff,
          coi_legal_acknowledgment: data.coi_legal_acknowledgment,
        },
      });

      toast.success('Client Created', `${data.name} has been successfully qualified and added.`);

      // Navigate to engagement creation pre-loaded with this client
      navigate(`/engagements?new=1&clientId=${newClient.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error('Creation Failed', message);
    }
  }

  const isSubmitting = createClient.isPending;

  /* ── Render ── */

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Clients
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-xs text-foreground font-medium">New Client</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-start gap-0">
        {STEPS.map((s, idx) => {
          const isActive    = s.number === step;
          const isCompleted = s.number < step;
          const isLast      = idx === STEPS.length - 1;

          return (
            <div key={s.number} className="flex items-start flex-1">
              {/* Step node */}
              <div className="flex flex-col items-center min-w-[80px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                  ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isActive   ? 'bg-accent border-accent text-accent-foreground'
                    : 'bg-card border-border text-muted-foreground'}`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.number}
                </div>
                <p className={`mt-1.5 text-[10px] font-mono text-center tracking-wide leading-tight
                  ${isActive ? 'text-accent' : isCompleted ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
                  {s.label}
                </p>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className={`h-0.5 flex-1 mt-4 transition-colors
                  ${isCompleted ? 'bg-emerald-500/40' : 'bg-border'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <LBDCard>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          {step === 1 && <Step1ClientInfo form={form} />}
          {step === 2 && <Step2ConflictCheck form={form} />}
          {step === 3 && <Step3Qualification form={form} ndaFile={ndaFile} setNdaFile={setNdaFile} />}
          {step === 4 && (
            <Step4Confirm
              form={form}
              ndaFile={ndaFile}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Footer navigation */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-border/60">
            <button
              type="button"
              onClick={step === 1 ? () => navigate('/clients') : handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Create Client Record
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </LBDCard>
    </div>
  );
}
