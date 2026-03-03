/**
 * ActiveWarRoom — Full-screen crisis management layout
 *
 * Four-panel layout: Checklist | Holding Statement | Intel Feed | Comms Log
 * Red header banner with crisis type and elapsed time.
 *
 * @module pages/engagements/crisis/ActiveWarRoom
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, Plus, Send, Shield, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LBDConfirmDialog } from '@/components/ui/lbd';
import { LBDDrawer } from '@/components/ui/lbd/LBDDrawer';
import { LBDSentimentBadge } from '@/components/ui/lbd';
import type { useCrisis, ChecklistAction, CommsLogEntry } from '@/hooks/useCrisis';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  hook: ReturnType<typeof useCrisis>;
}

export default function ActiveWarRoom({ hook }: Props) {
  const event = hook.activeEvent!;
  const crisisType = (event as any).crisis_types;

  /* ── Elapsed time ticker ──────────────────────────────────────────────── */
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const tick = () => setElapsed(formatDistanceToNow(new Date(event.activated_at), { addSuffix: false }));
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [event.activated_at]);

  /* ── Checklist state ──────────────────────────────────────────────────── */
  const checklist = useMemo(() => (event.checklist_items as unknown as ChecklistAction[]) ?? [], [event.checklist_items]);

  const updateChecklist = useCallback(
    (id: string, updates: Partial<ChecklistAction>) => {
      const next = checklist.map((a) =>
        a.id === id ? { ...a, ...updates, checkedAt: updates.status === 'done' ? new Date().toISOString() : a.checkedAt } : a,
      );
      hook.updateEvent.mutate({ id: event.id, checklist_items: next as any });
    },
    [checklist, event.id, hook.updateEvent],
  );

  /* ── Holding statement state ──────────────────────────────────────────── */
  const [holdingText, setHoldingText] = useState(crisisType?.holding_statement_draft ?? '');
  const [holdingIssued, setHoldingIssued] = useState(false);
  const [holdingEditing, setHoldingEditing] = useState(false);

  /* ── Comms log ────────────────────────────────────────────────────────── */
  const commsLog = useMemo(() => (event.communications_log as unknown as CommsLogEntry[]) ?? [], [event.communications_log]);
  const [commsDrawerOpen, setCommsDrawerOpen] = useState(false);
  const [commsForm, setCommsForm] = useState({ who: '', toWhom: '', channel: '', summary: '' });

  const addCommsEntry = () => {
    const entry: CommsLogEntry = {
      id: `cl-${Date.now()}`,
      ...commsForm,
      timestamp: new Date().toISOString(),
    };
    hook.updateEvent.mutate({
      id: event.id,
      communications_log: [...commsLog, entry] as any,
    });
    setCommsForm({ who: '', toWhom: '', channel: '', summary: '' });
    setCommsDrawerOpen(false);
  };

  /* ── Resolve ──────────────────────────────────────────────────────────── */
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  const immediateActions = checklist.filter((a) => a.phase === 'immediate');
  const shortTermActions = checklist.filter((a) => a.phase === 'short_term');

  const statusColor = (s: string) =>
    s === 'done' ? 'text-success' : s === 'in_progress' ? 'text-warning' : 'text-muted-foreground';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Red Alert Banner ────────────────────────────────────────────── */}
      <div className="bg-destructive/90 text-destructive-foreground px-6 py-3 flex items-center justify-between flex-none">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span className="font-bold text-sm tracking-wide uppercase">
            CRISIS ACTIVE — {crisisType?.crisis_type_name ?? 'Unknown'} — Activated {elapsed} ago
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive-foreground/50 text-destructive-foreground hover:bg-destructive-foreground/10"
          onClick={() => setResolveOpen(true)}
        >
          <Shield className="w-4 h-4 mr-1" /> RESOLVE CRISIS
        </Button>
      </div>

      {/* ── Four-Panel Grid ─────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[1fr_0.75fr] grid-rows-2 gap-px bg-border min-h-0 overflow-hidden">

        {/* Panel 1: Checklist */}
        <div className="bg-card overflow-y-auto p-4">
          <h3 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Universal Checklist
          </h3>

          {immediateActions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-destructive mb-2">IMMEDIATE (0–4 hrs)</p>
              {immediateActions.map((a) => (
                <ChecklistRow key={a.id} action={a} staff={hook.staff} onChange={updateChecklist} />
              ))}
            </div>
          )}

          {shortTermActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-warning mb-2">SHORT-TERM (4–24 hrs)</p>
              {shortTermActions.map((a) => (
                <ChecklistRow key={a.id} action={a} staff={hook.staff} onChange={updateChecklist} />
              ))}
            </div>
          )}

          {checklist.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No checklist actions defined for this crisis type.</p>
          )}
        </div>

        {/* Panel 2: Holding Statement */}
        <div className="bg-card overflow-y-auto p-4">
          <h3 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Holding Statement
          </h3>

          {holdingEditing ? (
            <div className="space-y-2">
              <Textarea value={holdingText} onChange={(e) => setHoldingText(e.target.value)} rows={10} className="text-sm" />
              <Button size="sm" onClick={() => setHoldingEditing(false)}>Done</Button>
            </div>
          ) : (
            <div
              className="text-sm text-foreground whitespace-pre-wrap border border-border/50 rounded-md p-3 bg-background/50 cursor-pointer hover:border-accent/30 transition-colors"
              onClick={() => setHoldingEditing(true)}
              title="Click to edit"
            >
              {holdingText || <span className="text-muted-foreground italic">No holding statement drafted.</span>}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            <Checkbox
              checked={holdingIssued}
              onCheckedChange={(c) => setHoldingIssued(!!c)}
            />
            <span className="text-xs text-foreground">
              Mark as ISSUED {holdingIssued && <span className="text-muted-foreground">— {new Date().toLocaleTimeString()}</span>}
            </span>
          </div>
        </div>

        {/* Panel 3: Live Intel Feed */}
        <div className="bg-card overflow-y-auto p-4">
          <h3 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-3">
            Live Intel Feed ({hook.realtimeIntel.length})
          </h3>
          <div className="space-y-2">
            {hook.realtimeIntel.slice(0, 30).map((item) => (
              <div
                key={item.id}
                className={`text-xs p-2 rounded border ${
                  item.sentiment_score !== null && Number(item.sentiment_score) <= -2
                    ? 'border-destructive/60 bg-destructive/10'
                    : 'border-border/40 bg-background/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground truncate">{item.headline}</span>
                  {item.sentiment_score !== null && (
                    <LBDSentimentBadge score={Number(item.sentiment_score) as any} size="sm" showLabel={false} />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  <span>{item.source_name ?? item.source_type}</span>
                  <span>•</span>
                  <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {hook.realtimeIntel.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Waiting for intel…</p>
            )}
          </div>
        </div>

        {/* Panel 4: Communications Log */}
        <div className="bg-card overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Communications Log ({commsLog.length})
            </h3>
            <Button variant="outline" size="sm" onClick={() => setCommsDrawerOpen(true)}>
              <Plus className="w-3 h-3 mr-1" /> Add Entry
            </Button>
          </div>
          <div className="space-y-2">
            {commsLog.slice().reverse().map((entry) => (
              <div key={entry.id} className="text-xs p-2 rounded border border-border/40 bg-background/30">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Send className="w-3 h-3 text-accent" />
                  <span>{entry.who}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{entry.toWhom}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{entry.channel}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{entry.summary}</p>
                <p className="mt-1 text-muted-foreground/60">{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Add Comms Entry Drawer ──────────────────────────────────────── */}
      <LBDDrawer
        open={commsDrawerOpen}
        onClose={() => setCommsDrawerOpen(false)}
        title="Add Communication Entry"
        width={400}
        footer={
          <>
            <Button variant="outline" onClick={() => setCommsDrawerOpen(false)}>Cancel</Button>
            <Button onClick={addCommsEntry} disabled={!commsForm.who || !commsForm.summary}>Add</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div><Label>From (Who)</Label><Input value={commsForm.who} onChange={(e) => setCommsForm((f) => ({ ...f, who: e.target.value }))} /></div>
          <div><Label>To (Whom)</Label><Input value={commsForm.toWhom} onChange={(e) => setCommsForm((f) => ({ ...f, toWhom: e.target.value }))} /></div>
          <div>
            <Label>Channel</Label>
            <Select value={commsForm.channel} onValueChange={(v) => setCommsForm((f) => ({ ...f, channel: v }))}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {['Phone', 'Email', 'WhatsApp', 'Press Release', 'TV', 'Radio', 'Social Media', 'In Person'].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Message Summary</Label><Textarea value={commsForm.summary} onChange={(e) => setCommsForm((f) => ({ ...f, summary: e.target.value }))} rows={3} /></div>
        </div>
      </LBDDrawer>

      {/* ── Resolve Dialog ──────────────────────────────────────────────── */}
      <LBDConfirmDialog
        open={resolveOpen}
        onCancel={() => setResolveOpen(false)}
        onConfirm={async () => {
          await hook.resolveCrisis.mutateAsync({ eventId: event.id, debriefNotes: resolveNotes });
          setResolveOpen(false);
        }}
        title="Resolve Crisis"
        description="Mark this crisis as resolved. You can complete the post-crisis review afterwards."
        variant="warning"
        confirmLabel="Resolve"
        loading={hook.resolveCrisis.isPending}
        detail="Enter resolution notes below to complete the crisis response."
      />
    </div>
  );
}

/* ── Checklist Row Sub-Component ───────────────────────────────────────────── */

interface ChecklistRowProps {
  action: ChecklistAction;
  staff: { id: string; full_name: string }[];
  onChange: (id: string, updates: Partial<ChecklistAction>) => void;
}

function ChecklistRow({ action, staff, onChange }: ChecklistRowProps) {
  return (
    <div className={`flex items-start gap-2 py-2 px-2 rounded mb-1 border border-border/30 ${action.status === 'done' ? 'opacity-60' : ''}`}>
      <Checkbox
        checked={action.status === 'done'}
        onCheckedChange={(c) => onChange(action.id, { status: c ? 'done' : 'pending' })}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${action.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {action.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Select
            value={action.assignedTo ?? ''}
            onValueChange={(v) => onChange(action.id, { assignedTo: v || null })}
          >
            <SelectTrigger className="h-6 text-[10px] w-32">
              <SelectValue placeholder="Assign…" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={action.status}
            onValueChange={(v) => onChange(action.id, { status: v as ChecklistAction['status'] })}
          >
            <SelectTrigger className="h-6 text-[10px] w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          {action.checkedAt && (
            <span className="text-[10px] text-muted-foreground/60">
              <Clock className="w-3 h-3 inline mr-0.5" />
              {new Date(action.checkedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
