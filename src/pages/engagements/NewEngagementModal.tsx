/**
 * NewEngagementModal
 *
 * Five-field modal for creating a new engagement from a qualified client:
 *   • Engagement Title       (required)
 *   • Client                 (select from qualified clients, pre-fillable)
 *   • Lead Advisor           (select from lead_advisor-role profiles)
 *   • Start Date
 *   • Fee Amount (₦)
 *   • Scope Notes            (stored to audit_logs, not a DB column)
 *
 * On success: calls onCreated(newEngagementId) so the parent can navigate.
 */

import { useState, useEffect } from 'react';
import { LBDModal, LBDModalButton, LBDAlert } from '@/components/ui/lbd';
import { toast } from '@/components/ui/lbd';
import {
  useQualifiedClients,
  useLeadAdvisors,
  useCreateEngagement,
} from '@/hooks/useEngagementDetail';

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the new engagement's ID so the parent can navigate */
  onCreated: (engagementId: string) => void;
  /** Pre-fill the client selector (e.g. when opened from ClientList) */
  prefilledClientId?: string;
}

/* ─────────────────────────────────────────────
   Style constants
───────────────────────────────────────────── */

const inputCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:border-transparent disabled:opacity-50';

const labelCls =
  'text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-[0.15em] block mb-1';

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function NewEngagementModal({
  open,
  onClose,
  onCreated,
  prefilledClientId,
}: Props) {
  const clients  = useQualifiedClients();
  const advisors = useLeadAdvisors();
  const createEng = useCreateEngagement();

  /* Form state */
  const [title,      setTitle]      = useState('');
  const [clientId,   setClientId]   = useState(prefilledClientId ?? '');
  const [advisorId,  setAdvisorId]  = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [feeAmount,  setFeeAmount]  = useState('');
  const [scopeNotes, setScopeNotes] = useState('');
  const [formError,  setFormError]  = useState<string | null>(null);

  /* Sync pre-fill when prop changes */
  useEffect(() => {
    if (prefilledClientId) setClientId(prefilledClientId);
  }, [prefilledClientId]);

  const resetForm = () => {
    setTitle('');
    setClientId(prefilledClientId ?? '');
    setAdvisorId('');
    setStartDate('');
    setFeeAmount('');
    setScopeNotes('');
    setFormError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!title.trim()) { setFormError('Engagement title is required.'); return; }
    if (!clientId)     { setFormError('Please select a client.'); return; }

    try {
      const result = await createEng.mutateAsync({
        title:           title.trim(),
        client_id:       clientId,
        lead_advisor_id: advisorId || null,
        start_date:      startDate || null,
        fee_amount:      feeAmount ? parseFloat(feeAmount) : null,
        scope_notes:     scopeNotes,
      });
      toast.success(`Engagement created`, `"${result.title}" is now active.`);
      handleClose();
      onCreated(result.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create engagement';
      setFormError(msg);
    }
  };

  return (
    <LBDModal
      open={open}
      onClose={handleClose}
      title="New Engagement"
      description="Create an engagement from a qualified client record. Engagement status will be set to Active — Phase 1."
      size="md"
      persistent={createEng.isPending}
      footer={
        <div className="flex gap-2 justify-end">
          <LBDModalButton
            variant="ghost"
            onClick={handleClose}
            disabled={createEng.isPending}
          >
            Cancel
          </LBDModalButton>
          <LBDModalButton
            variant="primary"
            onClick={handleSubmit}
            disabled={createEng.isPending}
          >
            {createEng.isPending ? 'Creating…' : 'Create Engagement'}
          </LBDModalButton>
        </div>
      }
    >
      <div className="space-y-4">
        {formError && (
          <LBDAlert variant="danger" title="Validation error" message={formError} compact />
        )}

        {/* Title */}
        <div>
          <label className={labelCls}>Engagement Title *</label>
          <input
            className={inputCls}
            placeholder="e.g. Governor Campaign — Kano State 2027"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={createEng.isPending}
          />
        </div>

        {/* Client */}
        <div>
          <label className={labelCls}>Client *</label>
          {clients.isLoading ? (
            <div className="h-9 rounded-lg bg-muted/30 animate-pulse" />
          ) : (
            <select
              className={inputCls}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={createEng.isPending}
            >
              <option value="">Select qualified client…</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {!clients.isLoading && (clients.data ?? []).length === 0 && (
            <p className="text-xs text-amber-400 mt-1">
              No qualified clients found. Complete the client qualification wizard first.
            </p>
          )}
        </div>

        {/* Lead Advisor */}
        <div>
          <label className={labelCls}>Lead Advisor</label>
          {advisors.isLoading ? (
            <div className="h-9 rounded-lg bg-muted/30 animate-pulse" />
          ) : (
            <select
              className={inputCls}
              value={advisorId}
              onChange={(e) => setAdvisorId(e.target.value)}
              disabled={createEng.isPending}
            >
              <option value="">Select lead advisor…</option>
              {(advisors.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Start Date + Fee */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Start Date</label>
            <input
              type="date"
              className={inputCls}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={createEng.isPending}
            />
          </div>
          <div>
            <label className={labelCls}>Fee Amount (₦)</label>
            <input
              type="number"
              min="0"
              step="100000"
              className={inputCls}
              placeholder="0"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              disabled={createEng.isPending}
            />
          </div>
        </div>

        {/* Scope Notes */}
        <div>
          <label className={labelCls}>Scope Notes</label>
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            placeholder="Brief description of engagement scope and strategic objectives…"
            value={scopeNotes}
            onChange={(e) => setScopeNotes(e.target.value)}
            disabled={createEng.isPending}
          />
          <p className="text-[10px] text-muted-foreground/40 mt-1 font-mono">
            Stored to audit log — not a required field
          </p>
        </div>
      </div>
    </LBDModal>
  );
}
