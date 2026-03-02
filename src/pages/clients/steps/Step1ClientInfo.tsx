/**
 * Step 1 — Client Information
 * Basic client details: name, type, contact, description.
 */
import type { UseFormReturn } from 'react-hook-form';
import type { ClientFormData } from '../NewClientWizard';
import { CLIENT_TYPE_LABELS, type ClientType } from '@/hooks/useClients';

/* ─────────────────────────────────────────────
   Styled input/select primitives
───────────────────────────────────────────── */

const inputCls = [
  'w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground',
  'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent/50',
  'transition-colors',
].join(' ');

const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide';
const errorCls = 'text-xs text-red-400 mt-1';

interface Props {
  form: UseFormReturn<ClientFormData>;
}

export default function Step1ClientInfo({ form }: Props) {
  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-1">
      <div className="mb-5">
        <p className="text-base font-semibold text-foreground">Client Information</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter the core details for the prospective client.
        </p>
      </div>

      <div className="space-y-4">

        {/* Name */}
        <div>
          <label htmlFor="name" className={labelCls}>
            Full Name / Organisation <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            placeholder="e.g. Hon. John Doe / Democratic Alliance Party"
            className={inputCls}
            {...register('name')}
          />
          {errors.name && <p className={errorCls}>{errors.name.message}</p>}
        </div>

        {/* Type */}
        <div>
          <label htmlFor="type" className={labelCls}>
            Client Type <span className="text-red-400">*</span>
          </label>
          <select
            id="type"
            className={inputCls}
            {...register('type')}
            defaultValue=""
          >
            <option value="" disabled>Select client type…</option>
            {(Object.entries(CLIENT_TYPE_LABELS) as [ClientType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {errors.type && <p className={errorCls}>{errors.type.message}</p>}
        </div>

        {/* Contact Name + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_name" className={labelCls}>
              Primary Contact Name <span className="text-red-400">*</span>
            </label>
            <input
              id="contact_name"
              type="text"
              placeholder="e.g. Jane Smith"
              className={inputCls}
              {...register('contact_name')}
            />
            {errors.contact_name && <p className={errorCls}>{errors.contact_name.message}</p>}
          </div>
          <div>
            <label htmlFor="contact_email" className={labelCls}>
              Contact Email <span className="text-red-400">*</span>
            </label>
            <input
              id="contact_email"
              type="email"
              placeholder="contact@example.com"
              className={inputCls}
              {...register('contact_email')}
            />
            {errors.contact_email && <p className={errorCls}>{errors.contact_email.message}</p>}
          </div>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className={labelCls}>
            Phone Number <span className="text-muted-foreground/40">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            className={inputCls}
            {...register('phone')}
          />
        </div>

        {/* Brief Description */}
        <div>
          <label htmlFor="brief_description" className={labelCls}>
            Brief Description <span className="text-muted-foreground/40">(optional)</span>
          </label>
          <textarea
            id="brief_description"
            rows={3}
            placeholder="Summarise the client's background, political context, and the nature of the intended engagement…"
            className={`${inputCls} resize-none`}
            {...register('brief_description')}
          />
          {errors.brief_description && <p className={errorCls}>{errors.brief_description.message}</p>}
        </div>

      </div>
    </div>
  );
}
