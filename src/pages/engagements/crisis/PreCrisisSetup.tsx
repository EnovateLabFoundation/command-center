/**
 * PreCrisisSetup — Crisis type matrix builder and activation controls
 *
 * Displays a severity matrix of all crisis_types, holding statement editor,
 * and the prominent "ACTIVATE CRISIS PROTOCOL" button with confirmation.
 *
 * @module pages/engagements/crisis/PreCrisisSetup
 */

import { useState } from 'react';
import { AlertTriangle, Plus, Shield, FileText, Trash2, Edit } from 'lucide-react';
import { LBDPageHeader, LBDDataTable, LBDConfirmDialog, LBDStatCard } from '@/components/ui/lbd';
import { LBDDrawer, LBDDrawerSection } from '@/components/ui/lbd/LBDDrawer';
import type { ColumnDef } from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { CrisisType } from '@/hooks/useCrisis';
import type { useCrisis } from '@/hooks/useCrisis';

interface Props {
  hook: ReturnType<typeof useCrisis>;
}

/* ── Initial form state ────────────────────────────────────────────────────── */

const emptyForm = {
  crisis_type_name: '',
  severity: 5,
  velocity_hours: 24,
  public_visibility: 'medium',
  political_risk: 'medium',
  first_response_command: '',
  holding_statement_draft: '',
  narrative_control_objective: '',
  recovery_timeline: '',
  immediate_actions: [] as string[],
  short_term_actions: [] as string[],
};

type FormState = typeof emptyForm;

export default function PreCrisisSetup({ hook }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [holdingOpen, setHoldingOpen] = useState(false);
  const [holdingDraft, setHoldingDraft] = useState('');
  const [holdingTypeId, setHoldingTypeId] = useState<string | null>(null);

  // Activation state
  const [activateOpen, setActivateOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [activationNotes, setActivationNotes] = useState('');

  // Temp action input
  const [immAction, setImmAction] = useState('');
  const [stAction, setStAction] = useState('');

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (ct: CrisisType) => {
    setEditingId(ct.id);
    setForm({
      crisis_type_name: ct.crisis_type_name,
      severity: ct.severity ?? 5,
      velocity_hours: ct.velocity_hours ?? 24,
      public_visibility: ct.public_visibility ?? 'medium',
      political_risk: ct.political_risk ?? 'medium',
      first_response_command: ct.first_response_command ?? '',
      holding_statement_draft: ct.holding_statement_draft ?? '',
      narrative_control_objective: ct.narrative_control_objective ?? '',
      recovery_timeline: ct.recovery_timeline ?? '',
      immediate_actions: (ct.immediate_actions as string[]) ?? [],
      short_term_actions: (ct.short_term_actions as string[]) ?? [],
    });
    setDrawerOpen(true);
  };

  const save = async () => {
    await hook.upsertType.mutateAsync({
      ...(editingId ? { id: editingId } : {}),
      crisis_type_name: form.crisis_type_name,
      severity: form.severity,
      velocity_hours: form.velocity_hours,
      public_visibility: form.public_visibility,
      political_risk: form.political_risk,
      first_response_command: form.first_response_command,
      holding_statement_draft: form.holding_statement_draft,
      narrative_control_objective: form.narrative_control_objective,
      recovery_timeline: form.recovery_timeline,
      immediate_actions: form.immediate_actions as unknown as Record<string, unknown>[],
      short_term_actions: form.short_term_actions as unknown as Record<string, unknown>[],
    } as Partial<CrisisType>);
    setDrawerOpen(false);
  };

  const handleActivate = async () => {
    if (!selectedTypeId) return;
    await hook.activateCrisis.mutateAsync({
      crisisTypeId: selectedTypeId,
      notes: activationNotes || undefined,
    });
    setActivateOpen(false);
  };

  const openHoldingStatement = (ct: CrisisType) => {
    setHoldingTypeId(ct.id);
    setHoldingDraft(ct.holding_statement_draft ?? '');
    setHoldingOpen(true);
  };

  const saveHolding = async () => {
    if (!holdingTypeId) return;
    await hook.upsertType.mutateAsync({
      id: holdingTypeId,
      holding_statement_draft: holdingDraft,
    } as Partial<CrisisType>);
    setHoldingOpen(false);
  };

  /* ── Severity bar renderer ───────────────────────────────────────────── */

  const severityBar = (val: unknown) => {
    const sev = Number(val) || 0;
    const pct = (sev / 10) * 100;
    const color =
      sev >= 8 ? 'bg-destructive' : sev >= 5 ? 'hsl(var(--warning))' : 'hsl(var(--success))';
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${sev >= 8 ? 'bg-destructive' : sev >= 5 ? 'bg-warning' : 'bg-success'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-mono-data">{sev}/10</span>
      </div>
    );
  };

  /* ── Table columns ───────────────────────────────────────────────────── */

  const columns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'crisis_type_name', label: 'Crisis Type', sortable: true },
    { key: 'severity', label: 'Severity', sortable: true, render: (v: unknown) => severityBar(v) },
    { key: 'velocity_hours', label: 'Velocity (hrs)', sortable: true, render: (v: unknown) => <span className="font-mono-data text-xs">{String(v ?? '—')}h</span> },
    { key: 'public_visibility', label: 'Visibility', render: (v: unknown) => <Badge variant="outline" className="text-xs">{String(v ?? '—')}</Badge> },
    { key: 'political_risk', label: 'Political Risk', render: (v: unknown) => <Badge variant="outline" className="text-xs">{String(v ?? '—')}</Badge> },
    { key: 'first_response_command', label: 'Response Command', render: (v: unknown) => <span className="text-xs truncate max-w-[200px] block">{String(v ?? '—')}</span> },
    {
      key: 'id',
      label: 'Actions',
      noExport: true,
      render: (_v, row) => {
        const ct = row as unknown as CrisisType;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => openHoldingStatement(ct)} title="Holding Statement">
              <FileText className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(ct)} title="Edit">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => hook.deleteType.mutate(ct.id)} title="Delete">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  /* ── KPI strip ───────────────────────────────────────────────────────── */

  const totalTypes = hook.crisisTypes.length;
  const highSeverity = hook.crisisTypes.filter((t) => (t.severity ?? 0) >= 8).length;
  const withHolding = hook.crisisTypes.filter((t) => !!t.holding_statement_draft).length;
  const totalEvents = hook.events.length;

  return (
    <div className="space-y-6">
      <LBDPageHeader
        eyebrow="STRATEGY"
        title="Crisis Protocol Command Centre"
        description="Crisis preparedness — protocols, holding statements, and escalation playbooks."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Add Crisis Type
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="animate-pulse font-semibold"
              onClick={() => setActivateOpen(true)}
              disabled={hook.crisisTypes.length === 0}
            >
              <AlertTriangle className="w-4 h-4 mr-1" /> ACTIVATE CRISIS PROTOCOL
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LBDStatCard label="Crisis Types" value={totalTypes} accentClass="info" />
        <LBDStatCard label="High Severity (≥8)" value={highSeverity} accentClass="danger" />
        <LBDStatCard label="Holding Statements" value={`${withHolding}/${totalTypes}`} accentClass="gold" />
        <LBDStatCard label="Past Events" value={totalEvents} accentClass="info" />
      </div>

      {/* Crisis Types Table */}
      <LBDDataTable
        columns={columns}
        data={(hook.crisisTypes as unknown as Record<string, unknown>[]) ?? []}
        isLoading={hook.typesLoading}
        emptyTitle="No Crisis Types Defined"
        emptyDescription="Add crisis types to build your preparedness matrix."
        enableSearch
        enablePagination
        stickyHeader
      />

      {/* ── Add/Edit Crisis Type Drawer ────────────────────────────────── */}
      <LBDDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'Edit Crisis Type' : 'Add Crisis Type'}
        description="Define the crisis scenario and response protocol."
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.crisis_type_name || hook.upsertType.isPending}>
              {hook.upsertType.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <LBDDrawerSection label="Details">
            <div className="space-y-3">
              <div>
                <Label>Crisis Type Name *</Label>
                <Input value={form.crisis_type_name} onChange={(e) => setForm((f) => ({ ...f, crisis_type_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Severity (1–10)</Label>
                  <Input type="number" min={1} max={10} value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: +e.target.value }))} />
                </div>
                <div>
                  <Label>Velocity (hours)</Label>
                  <Input type="number" min={1} value={form.velocity_hours} onChange={(e) => setForm((f) => ({ ...f, velocity_hours: +e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Public Visibility</Label>
                  <Select value={form.public_visibility} onValueChange={(v) => setForm((f) => ({ ...f, public_visibility: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['low', 'medium', 'high', 'extreme'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Political Risk</Label>
                  <Select value={form.political_risk} onValueChange={(v) => setForm((f) => ({ ...f, political_risk: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['low', 'medium', 'high', 'extreme'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>First Response Command</Label>
                <Input value={form.first_response_command} onChange={(e) => setForm((f) => ({ ...f, first_response_command: e.target.value }))} />
              </div>
              <div>
                <Label>Narrative Control Objective</Label>
                <Textarea value={form.narrative_control_objective} onChange={(e) => setForm((f) => ({ ...f, narrative_control_objective: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Recovery Timeline</Label>
                <Input value={form.recovery_timeline} onChange={(e) => setForm((f) => ({ ...f, recovery_timeline: e.target.value }))} />
              </div>
            </div>
          </LBDDrawerSection>

          <LBDDrawerSection label="Holding Statement Draft">
            <Textarea
              value={form.holding_statement_draft}
              onChange={(e) => setForm((f) => ({ ...f, holding_statement_draft: e.target.value }))}
              rows={5}
              placeholder="Draft the initial holding statement to be issued…"
            />
          </LBDDrawerSection>

          <LBDDrawerSection label="Immediate Actions (0–4 hrs)">
            <div className="space-y-2">
              {form.immediate_actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1 text-foreground">{a}</span>
                  <Button variant="ghost" size="icon" onClick={() => setForm((f) => ({ ...f, immediate_actions: f.immediate_actions.filter((_, j) => j !== i) }))}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Add action…" value={immAction} onChange={(e) => setImmAction(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter' && immAction.trim()) {
                    setForm((f) => ({ ...f, immediate_actions: [...f.immediate_actions, immAction.trim()] }));
                    setImmAction('');
                  }
                }} />
                <Button variant="outline" size="sm" onClick={() => { if (immAction.trim()) { setForm((f) => ({ ...f, immediate_actions: [...f.immediate_actions, immAction.trim()] })); setImmAction(''); } }}>Add</Button>
              </div>
            </div>
          </LBDDrawerSection>

          <LBDDrawerSection label="Short-Term Actions (4–24 hrs)">
            <div className="space-y-2">
              {form.short_term_actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1 text-foreground">{a}</span>
                  <Button variant="ghost" size="icon" onClick={() => setForm((f) => ({ ...f, short_term_actions: f.short_term_actions.filter((_, j) => j !== i) }))}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Add action…" value={stAction} onChange={(e) => setStAction(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter' && stAction.trim()) {
                    setForm((f) => ({ ...f, short_term_actions: [...f.short_term_actions, stAction.trim()] }));
                    setStAction('');
                  }
                }} />
                <Button variant="outline" size="sm" onClick={() => { if (stAction.trim()) { setForm((f) => ({ ...f, short_term_actions: [...f.short_term_actions, stAction.trim()] })); setStAction(''); } }}>Add</Button>
              </div>
            </div>
          </LBDDrawerSection>
        </div>
      </LBDDrawer>

      {/* ── Holding Statement Editor ───────────────────────────────────── */}
      <LBDDrawer
        open={holdingOpen}
        onClose={() => setHoldingOpen(false)}
        title="Holding Statement"
        description="Pre-drafted statement to issue immediately upon crisis activation."
        footer={
          <>
            <Button variant="outline" onClick={() => setHoldingOpen(false)}>Cancel</Button>
            <Button onClick={saveHolding}>Save Statement</Button>
          </>
        }
      >
        <Textarea
          value={holdingDraft}
          onChange={(e) => setHoldingDraft(e.target.value)}
          rows={15}
          className="font-mono text-sm"
          placeholder="Draft the holding statement…"
        />
      </LBDDrawer>

      {/* ── Activation Confirmation ────────────────────────────────────── */}
      <LBDConfirmDialog
        open={activateOpen}
        onCancel={() => setActivateOpen(false)}
        onConfirm={handleActivate}
        title="ACTIVATE CRISIS PROTOCOL"
        description="This will activate a live crisis response. All key staff will be notified immediately."
        variant="danger"
        confirmLabel="ACTIVATE"
        confirmPhrase="ACTIVATE"
        loading={hook.activateCrisis.isPending}
        detail="Select a crisis type and confirm activation. Type ACTIVATE to proceed."
      />
    </div>
  );
}
