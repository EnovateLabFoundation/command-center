/**
 * Step 3 — Qualification Checklist
 *
 * Six criteria must ALL pass before Step 4 is accessible:
 *  1. Strategic Fit           — dropdown + notes
 *  2. Ethical Alignment       — checkbox + mandatory notes
 *  3. Capacity to Engage      — dropdown + notes
 *  4. Confidentiality (NDA)   — file upload + status dropdown (HARD BLOCK if not 'executed')
 *  5. Resource Sufficiency    — dropdown + notes
 *  6. Conflict of Interest    — auto-populated from Step 2 + sign-off checkbox + legal ack
 */
import type { UseFormReturn } from 'react-hook-form';
import { useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Upload, File as FileIcon, ShieldCheck } from 'lucide-react';
import { LBDAlert } from '@/components/ui/lbd';
import type { ClientFormData } from '../NewClientWizard';
import { qualificationErrors } from '../NewClientWizard';

interface Props {
  form:       UseFormReturn<ClientFormData>;
  ndaFile:    File | null;
  setNdaFile: (f: File | null) => void;
}

/* ─────────────────────────────────────────────
   Styled primitives
───────────────────────────────────────────── */

const inputCls = [
  'w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground',
  'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent/50',
  'transition-colors',
].join(' ');

const labelCls   = 'block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide';
const errorCls   = 'text-xs text-red-400 mt-1';
const sectionCls = 'rounded-xl border border-border bg-card/50 p-4 space-y-4';

/* ─────────────────────────────────────────────
   Criterion status indicator
───────────────────────────────────────────── */

function CriterionHeader({
  number, title, description, pass,
}: { number: number; title: string; description: string; pass: boolean | null }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex-none mt-0.5 w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
          {number}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {pass === null ? null : pass ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none mt-0.5" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400 flex-none mt-0.5" />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function Step3Qualification({ form, ndaFile, setNdaFile }: Props) {
  const { register, watch, setValue, formState: { errors } } = form;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const values = watch();
  const qualErrs = qualificationErrors(values);
  const allPass  = qualErrs.length === 0;

  // Per-criterion pass flags (null = not yet answered)
  const sfPass   = values.strategic_fit
    ? values.strategic_fit !== 'not_aligned' : null;
  const eaPass   = values.ethical_alignment !== undefined
    ? (values.ethical_alignment && !!values.ethical_alignment_notes?.trim()) : null;
  const capPass  = values.capacity_to_engage
    ? values.capacity_to_engage !== 'insufficient' : null;
  const ndaPass  = values.nda_status
    ? values.nda_status === 'executed' : null;
  const rsPass   = values.resource_sufficiency
    ? values.resource_sufficiency !== 'insufficient' : null;
  const coiPass  = (values.coi_final_signoff && values.coi_legal_acknowledgment) || null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setNdaFile(file);
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <p className="text-base font-semibold text-foreground">Qualification Checklist</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          All six criteria must pass before the client can be created.
        </p>
      </div>

      {/* Overall status banner */}
      {allPass && (
        <LBDAlert
          variant="success"
          title="All criteria satisfied"
          message="This client has met all qualification requirements. Proceed to confirm and create."
        />
      )}
      {qualErrs.length > 0 && values.strategic_fit && (
        <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-xs font-semibold text-amber-300">
              {qualErrs.length} criteria outstanding
            </p>
          </div>
          {qualErrs.map((e, i) => (
            <p key={i} className="text-[11px] text-amber-300/80 pl-5">• {e}</p>
          ))}
        </div>
      )}

      {/* ── 1. Strategic Fit ── */}
      <div className={sectionCls}>
        <CriterionHeader
          number={1} title="Strategic Fit"
          description="Does this client align with LBD's strategic mandate and advisory capacity?"
          pass={sfPass}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="strategic_fit" className={labelCls}>
              Assessment <span className="text-red-400">*</span>
            </label>
            <select id="strategic_fit" className={inputCls} {...register('strategic_fit')} defaultValue="">
              <option value="" disabled>Select alignment…</option>
              <option value="aligned">Aligned — Fully consistent with our mandate</option>
              <option value="partial">Partial — Some alignment, caveats noted</option>
              <option value="not_aligned">Not Aligned — Does not meet strategic criteria</option>
            </select>
            {errors.strategic_fit && <p className={errorCls}>{errors.strategic_fit.message}</p>}
          </div>
          <div>
            <label htmlFor="strategic_fit_notes" className={labelCls}>
              Notes {values.strategic_fit === 'partial' && <span className="text-amber-400">(recommended)</span>}
            </label>
            <textarea id="strategic_fit_notes" rows={2} placeholder="Additional context…"
              className={`${inputCls} resize-none`} {...register('strategic_fit_notes')} />
          </div>
        </div>
        {values.strategic_fit === 'not_aligned' && (
          <LBDAlert compact variant="danger" message="Client does not meet strategic criteria. Qualification cannot proceed." />
        )}
      </div>

      {/* ── 2. Ethical Alignment ── */}
      <div className={sectionCls}>
        <CriterionHeader
          number={2} title="Ethical Alignment"
          description="Can we represent this client without compromising our ethical standards?"
          pass={eaPass}
        />
        <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
          <input
            type="checkbox"
            id="ethical_alignment"
            className="mt-0.5 accent-accent w-4 h-4 rounded cursor-pointer"
            {...register('ethical_alignment')}
          />
          <label htmlFor="ethical_alignment" className="text-sm text-foreground cursor-pointer leading-snug">
            I confirm this client's objectives and methods are ethically aligned with LBD's values and principles
          </label>
        </div>
        {errors.ethical_alignment && <p className={errorCls}>{errors.ethical_alignment.message}</p>}

        <div>
          <label htmlFor="ethical_alignment_notes" className={labelCls}>
            Justification Notes <span className="text-red-400">*</span>
            <span className="text-muted-foreground/60 font-normal ml-1">— why this client IS ethically aligned</span>
          </label>
          <textarea
            id="ethical_alignment_notes" rows={3}
            placeholder="Provide specific reasons why this client's objectives align with our ethical framework…"
            className={`${inputCls} resize-none`}
            {...register('ethical_alignment_notes')}
          />
          {errors.ethical_alignment_notes && <p className={errorCls}>{errors.ethical_alignment_notes.message}</p>}
        </div>
      </div>

      {/* ── 3. Capacity to Engage ── */}
      <div className={sectionCls}>
        <CriterionHeader
          number={3} title="Capacity to Engage"
          description="Does the client have the operational and political capacity for a productive engagement?"
          pass={capPass}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="capacity_to_engage" className={labelCls}>
              Assessment <span className="text-red-400">*</span>
            </label>
            <select id="capacity_to_engage" className={inputCls} {...register('capacity_to_engage')} defaultValue="">
              <option value="" disabled>Select capacity…</option>
              <option value="sufficient">Sufficient — Full capacity to engage</option>
              <option value="marginal">Marginal — Limited but workable</option>
              <option value="insufficient">Insufficient — Cannot support engagement</option>
            </select>
            {errors.capacity_to_engage && <p className={errorCls}>{errors.capacity_to_engage.message}</p>}
          </div>
          <div>
            <label htmlFor="capacity_notes" className={labelCls}>Notes</label>
            <textarea id="capacity_notes" rows={2} placeholder="Capacity assessment notes…"
              className={`${inputCls} resize-none`} {...register('capacity_notes')} />
          </div>
        </div>
        {values.capacity_to_engage === 'insufficient' && (
          <LBDAlert compact variant="danger" message="Insufficient capacity — qualification cannot proceed." />
        )}
      </div>

      {/* ── 4. Confidentiality Agreement (NDA) ── */}
      <div className={sectionCls}>
        <CriterionHeader
          number={4} title="Confidentiality Agreement"
          description="A fully executed NDA is required before any engagement can begin."
          pass={ndaPass}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nda_status" className={labelCls}>
              NDA Status <span className="text-red-400">*</span>
            </label>
            <select id="nda_status" className={inputCls} {...register('nda_status')} defaultValue="">
              <option value="" disabled>Select status…</option>
              <option value="executed">Executed — Signed and in force</option>
              <option value="pending">Pending — Awaiting signature</option>
            </select>
            {errors.nda_status && <p className={errorCls}>{errors.nda_status.message}</p>}
          </div>

          {/* File upload */}
          <div>
            <label className={labelCls}>
              NDA Document <span className="text-muted-foreground/60 font-normal">(optional)</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.png,.jpg"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload NDA document"
            />
            {ndaFile ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-800/40 bg-emerald-950/20">
                <FileIcon className="w-3.5 h-3.5 text-emerald-400 flex-none" />
                <p className="text-xs text-emerald-300 truncate flex-1">{ndaFile.name}</p>
                <button
                  type="button"
                  onClick={() => { setNdaFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >✕</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-accent/40 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload NDA document
              </button>
            )}
          </div>
        </div>
        {values.nda_status === 'pending' && (
          <LBDAlert compact variant="danger" message="NDA must be 'Executed' before proceeding. This is a hard requirement." />
        )}
      </div>

      {/* ── 5. Resource Sufficiency ── */}
      <div className={sectionCls}>
        <CriterionHeader
          number={5} title="Resource Sufficiency"
          description="Does LBD have the internal capacity and resources to service this engagement?"
          pass={rsPass}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="resource_sufficiency" className={labelCls}>
              Assessment <span className="text-red-400">*</span>
            </label>
            <select id="resource_sufficiency" className={inputCls} {...register('resource_sufficiency')} defaultValue="">
              <option value="" disabled>Select sufficiency…</option>
              <option value="sufficient">Sufficient — Full resources available</option>
              <option value="marginal">Marginal — Manageable with planning</option>
              <option value="insufficient">Insufficient — Resources not adequate</option>
            </select>
            {errors.resource_sufficiency && <p className={errorCls}>{errors.resource_sufficiency.message}</p>}
          </div>
          <div>
            <label htmlFor="resource_notes" className={labelCls}>Notes</label>
            <textarea id="resource_notes" rows={2} placeholder="Resource allocation notes…"
              className={`${inputCls} resize-none`} {...register('resource_notes')} />
          </div>
        </div>
        {values.resource_sufficiency === 'insufficient' && (
          <LBDAlert compact variant="danger" message="Insufficient resources — qualification cannot proceed." />
        )}
      </div>

      {/* ── 6. Conflict of Interest — Final Sign-off ── */}
      <div className={sectionCls}>
        <CriterionHeader
          number={6} title="Conflict of Interest — Lead Advisor Sign-off"
          description="Final confirmation that all COI matters have been assessed and are acceptable."
          pass={coiPass}
        />

        {/* Auto-populated result from Step 2 */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background">
          <ShieldCheck className="w-4 h-4 text-muted-foreground flex-none" />
          <div className="flex-1">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Automated Check Result
            </p>
            <p className="text-sm text-foreground mt-0.5">
              {values.conflict_detected
                ? values.conflict_override
                  ? 'Conflict detected — Lead Advisor override applied'
                  : 'Conflict detected — override required'
                : 'No conflicts detected in automated screening'}
            </p>
          </div>
          {values.conflict_detected
            ? <span className="text-[10px] font-mono text-amber-400 border border-amber-800/40 rounded px-1.5 py-0.5 bg-amber-950/40">FLAGGED</span>
            : <span className="text-[10px] font-mono text-emerald-400 border border-emerald-800/40 rounded px-1.5 py-0.5 bg-emerald-950/40">CLEAR</span>}
        </div>

        {/* Sign-off checkboxes */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
            <input
              type="checkbox"
              id="coi_final_signoff"
              className="mt-0.5 accent-accent w-4 h-4 cursor-pointer"
              {...register('coi_final_signoff')}
            />
            <label htmlFor="coi_final_signoff" className="text-sm text-foreground cursor-pointer leading-snug">
              I confirm that I have personally assessed the conflict of interest situation for this client and am satisfied that no unmanageable conflicts exist
            </label>
          </div>
          {errors.coi_final_signoff && <p className={errorCls}>{errors.coi_final_signoff.message}</p>}

          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-800/30 bg-amber-950/10">
            <input
              type="checkbox"
              id="coi_legal_acknowledgment"
              className="mt-0.5 accent-amber-400 w-4 h-4 cursor-pointer"
              {...register('coi_legal_acknowledgment')}
            />
            <label htmlFor="coi_legal_acknowledgment" className="text-xs text-amber-200/80 cursor-pointer leading-relaxed">
              <strong className="text-amber-300">Legal Acknowledgment:</strong> I understand that by proceeding, I am certifying that this engagement complies with all applicable professional conduct standards, conflict of interest policies, and regulatory requirements. I accept personal responsibility for this determination as the Lead Advisor.
            </label>
          </div>
          {errors.coi_legal_acknowledgment && <p className={errorCls}>{errors.coi_legal_acknowledgment.message}</p>}
        </div>
      </div>

    </div>
  );
}
