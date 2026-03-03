/**
 * IntelDrawer
 *
 * Add / Edit Intel Item drawer.
 * Fields: Date | Source Name | Source Type | Headline | Full Summary |
 *         Sentiment Score (slider -2 to +2) | Reach Tier | Narrative Theme |
 *         Action Required toggle + text | Platform | URL
 */

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LBDDrawer, LBDDrawerSection } from '@/components/ui/lbd';
import { cn } from '@/lib/utils';
import type { IntelItem, SourceType, ActionStatus } from '@/hooks/useIntelTracker';
import {
  SOURCE_TYPE_LABELS,
  ACTION_STATUS_LABELS,
  NARRATIVE_THEME_PRESETS,
} from '@/hooks/useIntelTracker';
import { sentimentLabel, sentimentHex } from '@/hooks/useIntelTracker';

/* ─────────────────────────────────────────────
   Zod schema
───────────────────────────────────────────── */

const schema = z.object({
  headline:        z.string().min(1, 'Headline is required').max(300),
  date_logged:     z.string().min(1, 'Date is required'),
  source_name:     z.string().max(120).optional().or(z.literal('')),
  source_type:     z.enum(['print', 'digital', 'broadcast', 'social']).nullable(),
  summary:         z.string().max(5000).optional().or(z.literal('')),
  raw_content:     z.string().max(10000).optional().or(z.literal('')),
  sentiment_score: z.number().min(-2).max(2).nullable(),
  reach_tier:      z.number().min(1).max(3).nullable(),
  narrative_theme: z.string().max(120).optional().or(z.literal('')),
  platform:        z.string().max(80).optional().or(z.literal('')),
  url:             z.string().url('Must be a valid URL').optional().or(z.literal('')),
  action_required: z.boolean(),
  action_status:   z.enum(['pending', 'in_progress', 'done', 'monitor_only']).nullable(),
  is_urgent:       z.boolean(),
});

export type IntelFormValues = z.infer<typeof schema>;

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface IntelDrawerProps {
  open:             boolean;
  onClose:          () => void;
  initial?:         IntelItem | null;
  onSave:           (values: IntelFormValues) => Promise<void>;
  isSaving:         boolean;
  availableThemes:  string[];
}

/* ─────────────────────────────────────────────
   Field helpers
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

function TextArea({
  value, onChange, placeholder, rows = 4,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={cn(
        'w-full bg-[#0a0a0c] rounded-lg px-3 py-2.5 text-sm text-foreground',
        'border border-border/60 placeholder:text-muted-foreground/30',
        'focus:outline-none focus:ring-1 focus:ring-accent/40',
        'resize-none leading-relaxed text-xs font-mono',
      )}
    />
  );
}

function SelectInput({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full bg-[#0a0a0c] rounded-lg px-3 py-2 text-sm text-foreground',
        'border border-border/60 focus:outline-none focus:ring-1 focus:ring-accent/40',
        !value && 'text-muted-foreground/40',
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
   Sentiment slider (-2 to +2)
───────────────────────────────────────────── */

function SentimentSlider({
  value, onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const current = value ?? 0;
  const hex = sentimentHex(current);
  // Normalise 0–100 for slider position
  const pct = ((current + 2) / 4) * 100;
  const label = sentimentLabel(current);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-red-400/70 font-mono">−2 Very Negative</span>
        <div className="text-center">
          <span className="text-sm font-bold tabular-nums" style={{ color: hex }}>
            {current > 0 ? '+' : ''}{current.toFixed(1)}
          </span>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: hex }}>{label}</p>
        </div>
        <span className="text-xs text-emerald-400/70 font-mono">+2 Very Positive</span>
      </div>

      {/* Gradient track */}
      <div className="relative h-3 rounded-full overflow-hidden" style={{
        background: 'linear-gradient(to right, #f87171, #fbbf24, #34d399)',
      }}>
        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md"
          style={{ left: `calc(${pct}% - 6px)`, backgroundColor: hex }}
        />
        <input
          type="range"
          min={-20}
          max={20}
          step={1}
          value={Math.round(current * 10)}
          onChange={(e) => onChange(Number(e.target.value) / 10)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>

      <div className="flex justify-between text-[9px] font-mono text-muted-foreground/30">
        <span>−2</span><span>−1</span><span>0</span><span>+1</span><span>+2</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function IntelDrawer({
  open, onClose, initial, onSave, isSaving, availableThemes,
}: IntelDrawerProps) {
  const isEdit = !!initial;
  const today  = new Date().toISOString().slice(0, 10);

  const {
    control, handleSubmit, reset,
    formState: { errors },
  } = useForm<IntelFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      headline:        '',
      date_logged:     today,
      source_name:     '',
      source_type:     null,
      summary:         '',
      raw_content:     '',
      sentiment_score: 0,
      reach_tier:      null,
      narrative_theme: '',
      platform:        '',
      url:             '',
      action_required: false,
      action_status:   null,
      is_urgent:       false,
    },
  });

  useEffect(() => {
    if (open && initial) {
      reset({
        headline:        initial.headline,
        date_logged:     initial.date_logged?.slice(0, 10) ?? today,
        source_name:     initial.source_name ?? '',
        source_type:     initial.source_type ?? null,
        summary:         initial.summary ?? '',
        raw_content:     initial.raw_content ?? '',
        sentiment_score: initial.sentiment_score ?? 0,
        reach_tier:      initial.reach_tier ?? null,
        narrative_theme: initial.narrative_theme ?? '',
        platform:        initial.platform ?? '',
        url:             initial.url ?? '',
        action_required: initial.action_required ?? false,
        action_status:   initial.action_status ?? null,
        is_urgent:       initial.is_urgent ?? false,
      });
    } else if (open && !initial) {
      reset({
        headline: '', date_logged: today, source_name: '', source_type: null,
        summary: '', raw_content: '', sentiment_score: 0, reach_tier: null,
        narrative_theme: '', platform: '', url: '', action_required: false,
        action_status: null, is_urgent: false,
      });
    }
  }, [open, initial, reset, today]);

  const allThemes = Array.from(new Set([...NARRATIVE_THEME_PRESETS, ...availableThemes]));
  const themeOptions = allThemes.map((t) => ({ value: t, label: t }));
  const sourceOptions = (Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((k) => ({
    value: k, label: SOURCE_TYPE_LABELS[k],
  }));
  const actionStatusOptions = (Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map((k) => ({
    value: k, label: ACTION_STATUS_LABELS[k],
  }));

  return (
    <LBDDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Intel Item' : 'Add Intel Item'}
      description={isEdit
        ? 'Update this intelligence item.'
        : 'Log a new intelligence or media monitoring item.'}
      width={580}
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
            form="intel-form"
            disabled={isSaving}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              'bg-accent text-black hover:bg-accent/90',
              isSaving && 'opacity-60 cursor-not-allowed',
            )}
          >
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      }
    >
      <form id="intel-form" onSubmit={handleSubmit(onSave)} className="space-y-6 py-2">

        {/* Core fields */}
        <LBDDrawerSection label="Item Details">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Date</FieldLabel>
                <Controller
                  name="date_logged"
                  control={control}
                  render={({ field }) => (
                    <TextInput type="date" value={field.value} onChange={field.onChange} />
                  )}
                />
                <FieldError message={errors.date_logged?.message} />
              </div>
              <div>
                <FieldLabel>Source Type</FieldLabel>
                <Controller
                  name="source_type"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(v || null)}
                      options={sourceOptions}
                      placeholder="— Select type —"
                    />
                  )}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Source Name</FieldLabel>
              <Controller
                name="source_name"
                control={control}
                render={({ field }) => (
                  <TextInput value={field.value ?? ''} onChange={field.onChange} placeholder="e.g. The Guardian Nigeria, NTA, @handle" />
                )}
              />
            </div>

            <div>
              <FieldLabel required>Headline</FieldLabel>
              <Controller
                name="headline"
                control={control}
                render={({ field }) => (
                  <TextInput value={field.value} onChange={field.onChange} placeholder="Brief headline or title of the item…" />
                )}
              />
              <FieldError message={errors.headline?.message} />
            </div>

            <div>
              <FieldLabel>Full Summary</FieldLabel>
              <Controller
                name="summary"
                control={control}
                render={({ field }) => (
                  <TextArea value={field.value ?? ''} onChange={field.onChange} placeholder="Summarise the key points and strategic relevance…" rows={4} />
                )}
              />
            </div>
          </div>
        </LBDDrawerSection>

        {/* Intelligence scoring */}
        <LBDDrawerSection label="Intelligence Scoring">
          <div className="space-y-4">
            <div>
              <FieldLabel>Sentiment Score</FieldLabel>
              <Controller
                name="sentiment_score"
                control={control}
                render={({ field }) => (
                  <SentimentSlider value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Reach Tier</FieldLabel>
                <Controller
                  name="reach_tier"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      value={field.value !== null ? String(field.value) : ''}
                      onChange={(v) => field.onChange(v === '' ? null : Number(v))}
                      options={[
                        { value: '1', label: 'Tier 1 — National / Mass' },
                        { value: '2', label: 'Tier 2 — Regional / Mid' },
                        { value: '3', label: 'Tier 3 — Local / Niche' },
                      ]}
                      placeholder="— Select tier —"
                    />
                  )}
                />
              </div>
              <div>
                <FieldLabel>Narrative Theme</FieldLabel>
                <Controller
                  name="narrative_theme"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={themeOptions}
                      placeholder="— Select or type —"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </LBDDrawerSection>

        {/* Action & escalation */}
        <LBDDrawerSection label="Action & Escalation">
          <div className="space-y-3">
            {/* Action Required toggle */}
            <Controller
              name="action_required"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => field.onChange(!field.value)}
                    className={cn(
                      'w-10 h-5 rounded-full border transition-all relative flex-none',
                      field.value
                        ? 'bg-accent/20 border-accent'
                        : 'bg-muted/20 border-border/60',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                        field.value ? 'bg-accent left-5' : 'bg-muted-foreground/40 left-0.5',
                      )}
                    />
                  </div>
                  <span className="text-sm text-foreground/80">Action Required</span>
                </label>
              )}
            />

            {/* Action Status */}
            <div>
              <FieldLabel>Action Status</FieldLabel>
              <Controller
                name="action_status"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || null)}
                    options={actionStatusOptions}
                    placeholder="— Not set —"
                  />
                )}
              />
            </div>

            {/* Urgent toggle */}
            <Controller
              name="is_urgent"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => field.onChange(!field.value)}
                    className={cn(
                      'w-10 h-5 rounded-full border transition-all relative flex-none',
                      field.value
                        ? 'bg-amber-500/20 border-amber-500'
                        : 'bg-muted/20 border-border/60',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                        field.value ? 'bg-amber-400 left-5' : 'bg-muted-foreground/40 left-0.5',
                      )}
                    />
                  </div>
                  <span className="text-sm text-foreground/80">Mark as Urgent ⚡</span>
                </label>
              )}
            />
          </div>
        </LBDDrawerSection>

        {/* Source metadata */}
        <LBDDrawerSection label="Source Metadata">
          <div className="space-y-3">
            <div>
              <FieldLabel>Platform</FieldLabel>
              <Controller
                name="platform"
                control={control}
                render={({ field }) => (
                  <TextInput value={field.value ?? ''} onChange={field.onChange} placeholder="e.g. Twitter, NTA, Punch, YouTube" />
                )}
              />
            </div>
            <div>
              <FieldLabel>URL</FieldLabel>
              <Controller
                name="url"
                control={control}
                render={({ field }) => (
                  <TextInput value={field.value ?? ''} onChange={field.onChange} type="url" placeholder="https://…" />
                )}
              />
              <FieldError message={errors.url?.message} />
            </div>
          </div>
        </LBDDrawerSection>

      </form>
    </LBDDrawer>
  );
}
