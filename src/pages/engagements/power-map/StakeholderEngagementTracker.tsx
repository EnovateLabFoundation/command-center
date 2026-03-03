/**
 * StakeholderEngagementTracker
 *
 * Sub-page extension of Power Map that tracks interactions with each stakeholder.
 * Shows contact log table, relationship health indicators, overdue alerts,
 * and a "Log Interaction" form.
 *
 * Route: /engagements/:id/power-map/engagement (or rendered as a tab)
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import {
  Plus, AlertTriangle, MessageSquare, Phone, Calendar, Mail,
  MapPin, CheckCircle2, Clock, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { LBDDataTable, type ColumnDef } from '@/components/ui/lbd/LBDDataTable';
import { cn } from '@/lib/utils';
import {
  useStakeholderEngagement,
  INTERACTION_TYPES,
  type StakeholderInteraction,
  type RelationshipHealth,
} from '@/hooks/useStakeholderEngagement';
import type { StakeholderRow } from '@/hooks/usePowerMap';

/* ── Health dot component ── */
function HealthDot({ health }: { health: 'green' | 'amber' | 'red' }) {
  const colors = {
    green: 'bg-green-400',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
  };
  return (
    <span
      className={cn('inline-block w-2.5 h-2.5 rounded-full', colors[health])}
      title={`Relationship health: ${health}`}
    />
  );
}

/* ── Interaction type icon ── */
function InteractionIcon({ type }: { type: string }) {
  switch (type) {
    case 'Meeting': return <Users className="w-3.5 h-3.5" />;
    case 'Call': return <Phone className="w-3.5 h-3.5" />;
    case 'Event': return <Calendar className="w-3.5 h-3.5" />;
    case 'Message': return <MessageSquare className="w-3.5 h-3.5" />;
    case 'Email': return <Mail className="w-3.5 h-3.5" />;
    case 'Site Visit': return <MapPin className="w-3.5 h-3.5" />;
    default: return <MessageSquare className="w-3.5 h-3.5" />;
  }
}

interface Props {
  stakeholders: StakeholderRow[];
  isLoadingStakeholders: boolean;
}

export default function StakeholderEngagementTracker({ stakeholders, isLoadingStakeholders }: Props) {
  const { id: engagementId } = useParams<{ id: string }>();
  const {
    interactions, isLoading, logInteraction, updateFollowUp,
    getStakeholderInteractions, calculateHealth,
  } = useStakeholderEngagement(engagementId);

  const [selectedStakeholder, setSelectedStakeholder] = useState<StakeholderRow | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    stakeholder_id: '',
    interaction_date: format(new Date(), 'yyyy-MM-dd'),
    interaction_type: 'Meeting',
    notes: '',
    outcome: '',
    follow_up_required: false,
    follow_up_due_date: '',
  });
  const [logSaving, setLogSaving] = useState(false);

  /* ── Health map ── */
  const healthMap = useMemo(() => calculateHealth(stakeholders), [calculateHealth, stakeholders]);

  /* ── Overdue stakeholders ── */
  const overdueStakeholders = useMemo(
    () => stakeholders.filter((s) => {
      const h = healthMap.get(s.id);
      return h && (h.contactStatus === 'red' || h.contactStatus === 'amber');
    }),
    [stakeholders, healthMap],
  );

  /* ── Stakeholder interactions for selected ── */
  const selectedInteractions = useMemo(
    () => selectedStakeholder ? getStakeholderInteractions(selectedStakeholder.id) : [],
    [selectedStakeholder, getStakeholderInteractions],
  );

  /* ── Handle log interaction ── */
  const handleLog = async () => {
    if (!logForm.stakeholder_id || !logForm.interaction_date) return;
    setLogSaving(true);
    await logInteraction({
      stakeholder_id: logForm.stakeholder_id,
      interaction_date: logForm.interaction_date,
      interaction_type: logForm.interaction_type,
      notes: logForm.notes || undefined,
      outcome: logForm.outcome || undefined,
      follow_up_required: logForm.follow_up_required,
      follow_up_due_date: logForm.follow_up_due_date || null,
    });
    setLogSaving(false);
    setLogOpen(false);
    setLogForm({
      stakeholder_id: '', interaction_date: format(new Date(), 'yyyy-MM-dd'),
      interaction_type: 'Meeting', notes: '', outcome: '', follow_up_required: false, follow_up_due_date: '',
    });
  };

  /* ── Open log for a specific stakeholder ── */
  const openLogFor = (sh: StakeholderRow) => {
    setLogForm((f) => ({ ...f, stakeholder_id: sh.id }));
    setLogOpen(true);
  };

  /* ── Stakeholder registry columns with health indicator ── */
  const registryColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: 'health', label: 'HEALTH', width: 60,
      render: (_v, row) => {
        const h = healthMap.get(String(row.id));
        return h ? <HealthDot health={h.overallHealth} /> : <HealthDot health="red" />;
      },
    },
    { key: 'name', label: 'NAME', sortable: true, render: (_v, row) => <span className="text-sm font-medium">{String(row.name)}</span> },
    { key: 'role_position', label: 'ROLE', render: (v) => <span className="text-xs text-muted-foreground">{v ? String(v) : '—'}</span> },
    { key: 'category', label: 'CATEGORY', render: (v) => <Badge variant="outline" className="text-[10px] capitalize">{String(v)}</Badge> },
    {
      key: 'last_contact_date', label: 'LAST CONTACT', sortable: true,
      render: (v, row) => {
        if (!v) return <span className="text-red-400 text-xs">Never</span>;
        const h = healthMap.get(String(row.id));
        return (
          <span className={cn('text-xs font-mono',
            h?.contactStatus === 'red' ? 'text-red-400' :
            h?.contactStatus === 'amber' ? 'text-amber-400' : 'text-muted-foreground',
          )}>
            {format(new Date(String(v)), 'dd MMM yy')}
            {h?.daysSinceContact !== null && ` (${h?.daysSinceContact}d ago)`}
          </span>
        );
      },
    },
    { key: 'contact_frequency', label: 'TARGET', render: (v) => <span className="text-xs text-muted-foreground">{v ? String(v) : '—'}</span> },
    {
      key: 'actions', label: '', noExport: true, width: 140,
      render: (_v, row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openLogFor(row as unknown as StakeholderRow); }}>
            <Plus className="w-3 h-3 mr-1" /> Log
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedStakeholder(row as unknown as StakeholderRow); }}>
            View
          </Button>
        </div>
      ),
    },
  ];

  /* ── Interaction detail columns ── */
  const interactionColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: 'interaction_date', label: 'DATE', sortable: true,
      render: (v) => <span className="text-xs font-mono">{format(new Date(String(v)), 'dd MMM yyyy')}</span>,
    },
    {
      key: 'interaction_type', label: 'TYPE',
      render: (v) => (
        <div className="flex items-center gap-1.5">
          <InteractionIcon type={String(v)} />
          <span className="text-xs">{String(v)}</span>
        </div>
      ),
    },
    { key: 'notes', label: 'NOTES', render: (v) => <span className="text-xs text-muted-foreground truncate max-w-[180px] block">{v ? String(v) : '—'}</span> },
    { key: 'outcome', label: 'OUTCOME', render: (v) => <span className="text-xs">{v ? String(v) : '—'}</span> },
    {
      key: 'follow_up_required', label: 'FOLLOW-UP',
      render: (v, row) => {
        if (!v) return <span className="text-muted-foreground text-xs">—</span>;
        const status = String(row.follow_up_status ?? 'pending');
        return (
          <Badge className={cn('text-[10px]',
            status === 'completed' ? 'bg-green-500/20 text-green-400' :
            status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-muted-foreground',
          )}>
            {status}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overdue alerts */}
      {overdueStakeholders.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              {overdueStakeholders.length} stakeholder{overdueStakeholders.length > 1 ? 's' : ''} overdue for contact
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {overdueStakeholders.slice(0, 8).map((s) => {
              const h = healthMap.get(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStakeholder(s)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border text-xs hover:border-accent/40 transition-colors"
                >
                  <HealthDot health={h?.overallHealth ?? 'red'} />
                  {s.name}
                  <span className="text-muted-foreground">
                    ({h?.daysSinceContact !== null ? `${h?.daysSinceContact}d` : 'never'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stakeholder registry with health */}
      <LBDDataTable
        columns={registryColumns}
        data={stakeholders as unknown as Record<string, unknown>[]}
        isLoading={isLoadingStakeholders || isLoading}
        rowKey={(row) => String(row.id)}
        enableSearch
        searchPlaceholder="Search stakeholders…"
        enablePagination
        defaultPageSize={15}
        emptyTitle="No stakeholders"
        emptyDescription="Add stakeholders from the Power Map to track engagement."
        onRowClick={(row) => setSelectedStakeholder(row as unknown as StakeholderRow)}
        toolbarRight={
          <Button size="sm" onClick={() => setLogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Log Interaction
          </Button>
        }
      />

      {/* Selected stakeholder interaction history */}
      {selectedStakeholder && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HealthDot health={healthMap.get(selectedStakeholder.id)?.overallHealth ?? 'red'} />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{selectedStakeholder.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedStakeholder.role_position ?? 'No role'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => openLogFor(selectedStakeholder)}>
                <Plus className="w-3 h-3 mr-1" /> Log Interaction
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedStakeholder(null)}>Close</Button>
            </div>
          </div>

          <LBDDataTable
            columns={interactionColumns}
            data={selectedInteractions as unknown as Record<string, unknown>[]}
            isLoading={isLoading}
            rowKey={(row) => String(row.id)}
            enablePagination
            defaultPageSize={10}
            emptyTitle="No interactions recorded"
            emptyDescription="Log your first interaction with this stakeholder."
          />
        </div>
      )}

      {/* Log Interaction Modal */}
      <Dialog open={logOpen} onOpenChange={(o) => !o && setLogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
            <DialogDescription>Record a new interaction with a stakeholder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Stakeholder</Label>
              <Select value={logForm.stakeholder_id} onValueChange={(v) => setLogForm((f) => ({ ...f, stakeholder_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select stakeholder" /></SelectTrigger>
                <SelectContent>
                  {stakeholders.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={logForm.interaction_date} onChange={(e) => setLogForm((f) => ({ ...f, interaction_date: e.target.value }))} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={logForm.interaction_type} onValueChange={(v) => setLogForm((f) => ({ ...f, interaction_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERACTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={logForm.notes} onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Discussion points, context…" />
            </div>
            <div>
              <Label>Outcome</Label>
              <Input value={logForm.outcome} onChange={(e) => setLogForm((f) => ({ ...f, outcome: e.target.value }))} placeholder="Key outcome or decision" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={logForm.follow_up_required}
                onCheckedChange={(v) => setLogForm((f) => ({ ...f, follow_up_required: !!v }))}
              />
              <Label className="cursor-pointer">Follow-up required</Label>
            </div>
            {logForm.follow_up_required && (
              <div>
                <Label>Follow-up Due Date</Label>
                <Input type="date" value={logForm.follow_up_due_date} onChange={(e) => setLogForm((f) => ({ ...f, follow_up_due_date: e.target.value }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={handleLog} disabled={logSaving || !logForm.stakeholder_id}>
              {logSaving ? 'Saving…' : 'Log Interaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
