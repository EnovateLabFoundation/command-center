/**
 * StakeholderDrawer
 *
 * Add / Edit stakeholder form presented inside an LBDDrawer.
 * Zod validation, influence slider, alignment button-group,
 * category/priority/strategy dropdowns, optional map coordinates.
 */

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LBDDrawer,
  LBDDrawerSection,
} from '@/components/ui/lbd';
import { cn } from '@/lib/utils';
import {
  StakeholderRow,
  StakeholderAlignment,
  StakeholderCategory,
  StrategicPriority,
  ALIGNMENT_LABELS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  ENGAGEMENT_STRATEGY_OPTIONS,
} from '@/hooks/usePowerMap';

/* ─────────────────────────────────────────────
   Zod schema
───────────────────────────────────────────── */

const schema = z.object({
  name:                  z.string().min(1, 'Name is required').max(120),
  role_position:         z.string().max(120).optional().or(z.literal('')),
  category:              z.enum(['government', 'media', 'civil_society', 'business', 'traditional']),
  alignment:             z.enum(['hostile', 'neutral', 'supportive', 'champion']).nullable(),
  influence_score:       z.number().min(1).max(10).nullable(),
  strategic_priority:    z.enum(['critical', 'high', 'medium', 'low']).nullable(),
  contact_frequency:     z.string().max(80).optional().or(z.literal('')),
  last_contact_date:     z.string().optional().or(z.literal('')),
  risk_level:            z.string().max(80).optional().or(z.literal('')),
  lat:                   z.number().min(-90).max(90).nullable(),
  lng:                   z.number().min(-180).max(180).nullable(),
  strategic_notes:       z.string().max(2000).optional().or(z.literal('')),
  engagement_strategy:   z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface StakeholderDrawerProps {
  open:       boolean;
  onClose:    () => void;
  initial?:   StakeholderRow | null;
  onSave:     (values: FormValues) => Promise<void>;
  isSaving:   boolean;
}

/* ─────────────────────────────────────────────
   Helper sub-components
───────────────────────────────────────────── */

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase mb-1.5">
      {children}{required && <span className="text-red-400/60 ml-1">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[10px] text-red-400 mt-1 font-mono">{message}</p>;
}

function TextInput({
  value, onChange, placeholder, disabled, type = 'text',
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        'w-full bg-[#0a0a0c] rounded-lg px-3 py-2 text-sm text-foreground',
        'border border-border/60 placeholder:text-muted-foreground/30',
        'focus:outline-none focus:ring-1 focus:ring-accent/40',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    />
  );
}

function SelectInput({
  value, onChange, options, placeholder, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'w-full bg-[#0a0a0c] rounded-lg px-3 py-2 text-sm text-foreground',
        'border border-border/60',
        'focus:outline-none focus:ring-1 focus:ring-accent/40',
        !value && 'text-muted-foreground/40',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ─────────────────────────────────────────────
   Alignment button group
───────────────────────────────────────────── */

const ALIGNMENT_COLOURS: Record<StakeholderAlignment, string> = {
  hostile:    'border-red-500/40 text-red-400 bg-red-500/10',
  neutral:    'border-border/60 text-muted-foreground/70 bg-muted/10',
  supportive: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  champion:   'border-accent/40 text-accent bg-accent/10',
};

const ALIGNMENT_ACTIVE: Record<StakeholderAlignment, string> = {
  hostile:    'border-red-500 text-red-300 bg-red-500/20 ring-1 ring-red-500/40',
  neutral:    'border-border text-muted-foreground bg-muted/20 ring-1 ring-border/40',
  supportive: 'border-emerald-500 text-emerald-300 bg-emerald-500/20 ring-1 ring-emerald-500/40',
  champion:   'border-accent text-accent bg-accent/20 ring-1 ring-accent/40',
};

function AlignmentButtonGroup({
  value, onChange,
}: {
  value: StakeholderAlignment | null;
  onChange: (v: StakeholderAlignment | null) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {(Object.keys(ALIGNMENT_LABELS) as StakeholderAlignment[]).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(value === a ? null : a)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            value === a ? ALIGNMENT_ACTIVE[a] : ALIGNMENT_COLOURS[a],
          )}
        >
          {ALIGNMENT_LABELS[a]}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Influence Slider
───────────────────────────────────────────── */

function InfluenceSlider({
  value, onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const current = value ?? 5;
  const pct = ((current - 1) / 9) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground/50 font-mono">1 — Low</span>
        <span className="text-sm font-bold text-accent font-mono">{value ?? '—'}</span>
        <span className="text-xs text-muted-foreground/50 font-mono">10 — High</span>
      </div>
      <div className="relative h-2 rounded-full bg-border/40">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-accent/60 transition-all"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function StakeholderDrawer({
  open, onClose, initial, onSave, isSaving,
}: StakeholderDrawerProps) {
  const isEdit = !!initial;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:                '',
      role_position:       '',
      category:            'government',
      alignment:           null,
      influence_score:     5,
      strategic_priority:  null,
      contact_frequency:   '',
      last_contact_date:   '',
      risk_level:          '',
      lat:                 null,
      lng:                 null,
      strategic_notes:     '',
      engagement_strategy: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (open && initial) {
      reset({
        name:                initial.name,
        role_position:       initial.role_position ?? '',
        category:            initial.category,
        alignment:           initial.alignment ?? null,
        influence_score:     initial.influence_score ?? 5,
        strategic_priority:  initial.strategic_priority ?? null,
        contact_frequency:   initial.contact_frequency ?? '',
        last_contact_date:   initial.last_contact_date ?? '',
        risk_level:          initial.risk_level ?? '',
        lat:                 initial.lat ?? null,
        lng:                 initial.lng ?? null,
        strategic_notes:     initial.strategic_notes ?? '',
        engagement_strategy: initial.engagement_strategy ?? '',
      });
    } else if (open && !initial) {
      reset({
        name: '', role_position: '', category: 'government',
        alignment: null, influence_score: 5, strategic_priority: null,
        contact_frequency: '', last_contact_date: '', risk_level: '',
        lat: null, lng: null, strategic_notes: '', engagement_strategy: '',
      });
    }
  }, [open, initial, reset]);

  async function onSubmit(values: FormValues) {
    await onSave(values);
  }

  const categoryOptions = (Object.keys(CATEGORY_LABELS) as StakeholderCategory[]).map((k) => ({
    value: k, label: CATEGORY_LABELS[k],
  }));
  const priorityOptions = (Object.keys(PRIORITY_LABELS) as StrategicPriority[]).map((k) => ({
    value: k, label: PRIORITY_LABELS[k],
  }));
  const strategyOptions = ENGAGEMENT_STRATEGY_OPTIONS.map((s) => ({ value: s, label: s }));

  return (
    <LBDDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Stakeholder' : 'Add Stakeholder'}
      description={isEdit
        ? 'Update stakeholder intelligence and engagement strategy.'
        : 'Register a new stakeholder in the intelligence map.'}
      width={560}
      accent
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="stakeholder-form"
            disabled={isSaving}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              'bg-accent text-black hover:bg-accent/90',
              isSaving && 'opacity-60 cursor-not-allowed',
            )}
          >
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Stakeholder'}
          </button>
        </div>
      }
    >
      <form id="stakeholder-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-2">

        {/* Identity */}
        <LBDDrawerSection label="Identity">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <FieldLabel required>Full Name / Title</FieldLabel>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput value={field.value} onChange={field.onChange} placeholder="e.g. Senator Jane Adeyemi" />
                )}
              />
              <FieldError message={errors.name?.message} />
            </div>

            {/* Role */}
            <div>
              <FieldLabel>Role / Position</FieldLabel>
              <Controller
                name="role_position"
                control={control}
                render={({ field }) => (
                  <TextInput value={field.value ?? ''} onChange={field.onChange} placeholder="e.g. Senate Committee Chair, Finance" />
                )}
              />
            </div>

            {/* Category */}
            <div>
              <FieldLabel required>Category</FieldLabel>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    value={field.value}
                    onChange={field.onChange}
                    options={categoryOptions}
                  />
                )}
              />
              <FieldError message={errors.category?.message} />
            </div>
          </div>
        </LBDDrawerSection>

        {/* Intelligence */}
        <LBDDrawerSection label="Intelligence Assessment">
          <div className="space-y-4">
            {/* Alignment */}
            <div>
              <FieldLabel>Alignment</FieldLabel>
              <Controller
                name="alignment"
                control={control}
                render={({ field }) => (
                  <AlignmentButtonGroup value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            {/* Influence Score */}
            <div>
              <FieldLabel>Influence Score (1–10)</FieldLabel>
              <Controller
                name="influence_score"
                control={control}
                render={({ field }) => (
                  <InfluenceSlider value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            {/* Strategic Priority */}
            <div>
              <FieldLabel>Strategic Priority</FieldLabel>
              <Controller
                name="strategic_priority"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || null)}
                    options={priorityOptions}
                    placeholder="— Not set —"
                  />
                )}
              />
            </div>

            {/* Risk Level */}
            <div>
              <FieldLabel>Risk Level</FieldLabel>
              <Controller
                name="risk_level"
                control={control}
                render={({ field }) => (
                  <TextInput value={field.value ?? ''} onChange={field.onChange} placeholder="e.g. High — known adversary" />
                )}
              />
            </div>
          </div>
        </LBDDrawerSection>

        {/* Relationship */}
        <LBDDrawerSection label="Relationship Management">
          <div className="space-y-4">
            {/* Last Contact */}
            <div>
              <FieldLabel>Last Contact Date</FieldLabel>
              <Controller
                name="last_contact_date"
                control={control}
                render={({ field }) => (
                  <TextInput value={field.value ?? ''} onChange={field.onChange} type="date" />
                )}
              />
            </div>

            {/* Contact Frequency */}
            <div>
              <FieldLabel>Contact Frequency</FieldLabel>
              <Controller
                name="contact_frequency"
                control={control}
                render={({ field }) => (
                  <TextInput value={field.value ?? ''} onChange={field.onChange} placeholder="e.g. Weekly, Monthly, Ad-hoc" />
                )}
              />
            </div>

            {/* Engagement Strategy */}
            <div>
              <FieldLabel>Engagement Strategy</FieldLabel>
              <Controller
                name="engagement_strategy"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || '')}
                    options={strategyOptions}
                    placeholder="— Select strategy —"
                  />
                )}
              />
            </div>
          </div>
        </LBDDrawerSection>

        {/* Map Location */}
        <LBDDrawerSection label="Map Location (optional)">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Latitude</FieldLabel>
              <Controller
                name="lat"
                control={control}
                render={({ field }) => (
                  <TextInput
                    type="number"
                    value={field.value !== null ? String(field.value) : ''}
                    onChange={(v) => field.onChange(v === '' ? null : Number(v))}
                    placeholder="e.g. 6.5244"
                  />
                )}
              />
            </div>
            <div>
              <FieldLabel>Longitude</FieldLabel>
              <Controller
                name="lng"
                control={control}
                render={({ field }) => (
                  <TextInput
                    type="number"
                    value={field.value !== null ? String(field.value) : ''}
                    onChange={(v) => field.onChange(v === '' ? null : Number(v))}
                    placeholder="e.g. 3.3792"
                  />
                )}
              />
            </div>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/30 mt-2">
            Used for positioning on the Network Map view.
          </p>
        </LBDDrawerSection>

        {/* Strategic Notes */}
        <LBDDrawerSection label="Strategic Notes">
          <Controller
            name="strategic_notes"
            control={control}
            render={({ field }) => (
              <textarea
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                rows={5}
                placeholder="Add confidential strategic intelligence, relationship history, leverage points…"
                className={cn(
                  'w-full bg-[#0a0a0c] rounded-lg px-3 py-2.5 text-sm text-foreground',
                  'border border-border/60 placeholder:text-muted-foreground/30',
                  'focus:outline-none focus:ring-1 focus:ring-accent/40',
                  'resize-none leading-relaxed font-mono text-xs',
                )}
              />
            )}
          />
        </LBDDrawerSection>

      </form>
    </LBDDrawer>
  );
}
