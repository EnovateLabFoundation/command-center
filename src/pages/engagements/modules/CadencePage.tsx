/**
 * CadencePage
 *
 * Engagement Cadence Manager — schedule, track, and manage client touchpoints.
 * Two tabs: Upcoming | History. KPI strip + cadence compliance indicators.
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, isBefore } from 'date-fns';
import {
  Plus, CalendarClock, CheckCircle2, AlertTriangle, Clock,
  XCircle, RotateCw, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { LBDPageHeader } from '@/components/ui/lbd/LBDPageHeader';
import { LBDStatCard } from '@/components/ui/lbd/LBDStatCard';
import { LBDDrawer, LBDDrawerSection } from '@/components/ui/lbd/LBDDrawer';
import { LBDConfirmDialog } from '@/components/ui/lbd/LBDConfirmDialog';
import { LBDDataTable, type ColumnDef } from '@/components/ui/lbd/LBDDataTable';
import { cn } from '@/lib/utils';
import {
  useCadence,
  TOUCHPOINT_LABELS,
  TOUCHPOINT_COLORS,
  type Touchpoint,
} from '@/hooks/useCadence';

type TabId = 'upcoming' | 'history';

/* ── Action item interface for the completion form ── */
interface ActionItem {
  text: string;
  owner: string;
  dueDate: string;
}

export default function CadencePage() {
  const { id: engagementId } = useParams<{ id: string }>();
  const {
    isLoading, upcoming, history, stats, compliance,
    createTouchpoint, updateTouchpoint, completeTouchpoint, cancelTouchpoint,
  } = useCadence(engagementId);

  const [tab, setTab] = useState<TabId>('upcoming');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Touchpoint | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Touchpoint | null>(null);

  /* ── Schedule form state ── */
  const [scheduleForm, setScheduleForm] = useState({
    touchpoint_type: '' as string,
    scheduled_date: '',
    led_by_id: '',
    notes: '',
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  /* ── Complete form state ── */
  const [completeNotes, setCompleteNotes] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([{ text: '', owner: '', dueDate: '' }]);
  const [completeSaving, setCompleteSaving] = useState(false);

  /* ── Schedule handler ── */
  const handleSchedule = async () => {
    if (!scheduleForm.touchpoint_type || !scheduleForm.scheduled_date) return;
    setScheduleSaving(true);
    await createTouchpoint({
      touchpoint_type: scheduleForm.touchpoint_type as any,
      scheduled_date: new Date(scheduleForm.scheduled_date).toISOString(),
      notes: scheduleForm.notes || null,
      led_by_id: scheduleForm.led_by_id || null,
    });
    setScheduleSaving(false);
    setScheduleOpen(false);
    setScheduleForm({ touchpoint_type: '', scheduled_date: '', led_by_id: '', notes: '' });
  };

  /* ── Complete handler ── */
  const handleComplete = async () => {
    if (!completeTarget) return;
    setCompleteSaving(true);
    const items = actionItems.filter((a) => a.text.trim());
    await completeTouchpoint(completeTarget.id, completeNotes, items);
    setCompleteSaving(false);
    setCompleteTarget(null);
    setCompleteNotes('');
    setActionItems([{ text: '', owner: '', dueDate: '' }]);
  };

  /* ── Cancel handler ── */
  const handleCancel = async () => {
    if (!cancelTarget) return;
    await cancelTouchpoint(cancelTarget.id);
    setCancelTarget(null);
  };

  /* ── Add action item row ── */
  const addActionItem = () => setActionItems((prev) => [...prev, { text: '', owner: '', dueDate: '' }]);
  const updateActionItem = (idx: number, field: keyof ActionItem, value: string) => {
    setActionItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  /* ── Status badge helper ── */
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-muted text-muted-foreground',
      rescheduled: 'bg-accent/20 text-accent',
    };
    return <Badge className={cn('text-[10px]', map[status] ?? '')}>{status}</Badge>;
  };

  /* ── History table columns ── */
  const historyColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: 'touchpoint_type', label: 'TYPE', sortable: true,
      render: (v) => (
        <Badge className={cn('text-[10px] border', TOUCHPOINT_COLORS[String(v)] ?? '')}>
          {TOUCHPOINT_LABELS[String(v)] ?? String(v)}
        </Badge>
      ),
    },
    {
      key: 'scheduled_date', label: 'DATE', sortable: true,
      render: (v) => v ? format(new Date(String(v)), 'dd MMM yyyy') : '—',
    },
    { key: 'status', label: 'STATUS', render: (v) => statusBadge(String(v)) },
    {
      key: 'notes', label: 'NOTES', 
      render: (v) => <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{v ? String(v) : '—'}</span>,
    },
    {
      key: 'action_items', label: 'ACTIONS',
      render: (v) => {
        const items = Array.isArray(v) ? v : [];
        return items.length > 0 ? <Badge variant="outline" className="text-[10px]">{items.length} items</Badge> : '—';
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <LBDPageHeader
        eyebrow="EXECUTION"
        title="Cadence Manager"
        description="Schedule and track client touchpoints — meetings, briefings, and reviews."
        actions={
          <Button onClick={() => setScheduleOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Touchpoint
          </Button>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LBDStatCard label="Upcoming This Week" value={stats.upcomingThisWeek} accentClass="info" />
        <LBDStatCard label="Overdue" value={stats.overdue} accentClass="danger" />
        <LBDStatCard label="Completed This Month" value={stats.completedThisMonth} accentClass="success" />
        <LBDStatCard
          label="Next Scheduled"
          value={stats.nextScheduled ? format(new Date(stats.nextScheduled), 'dd MMM') : '—'}
          accentClass="gold"
        />
      </div>

      {/* Cadence Compliance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {compliance.map((c) => (
          <div
            key={c.type}
            className={cn(
              'rounded-lg border p-3',
              c.status === 'green' ? 'border-green-500/30 bg-green-500/5' :
              c.status === 'amber' ? 'border-amber-500/30 bg-amber-500/5' :
              'border-red-500/30 bg-red-500/5',
            )}
          >
            <p className="text-xs font-medium text-foreground">{c.label}</p>
            <p className={cn(
              'text-sm font-mono mt-1',
              c.status === 'green' ? 'text-green-400' :
              c.status === 'amber' ? 'text-amber-400' : 'text-red-400',
            )}>
              {c.daysSinceLast !== null ? `${c.daysSinceLast}d since last` : 'Never conducted'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Target: every {c.targetDays}d</p>
          </div>
        ))}
      </div>

      {/* Tab toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border w-fit">
        {(['upcoming', 'history'] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'upcoming' ? <CalendarClock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {/* Upcoming tab */}
      {tab === 'upcoming' && (
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No upcoming touchpoints scheduled.</p>
            </div>
          ) : (
            upcoming.map((tp) => {
              const isOverdue = isBefore(new Date(tp.scheduled_date), new Date());
              return (
                <div
                  key={tp.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border bg-card gap-4 flex-wrap',
                    isOverdue ? 'border-red-500/40' : 'border-border',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge className={cn('text-[10px] border shrink-0', TOUCHPOINT_COLORS[tp.touchpoint_type] ?? '')}>
                      {TOUCHPOINT_LABELS[tp.touchpoint_type] ?? tp.touchpoint_type}
                    </Badge>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium', isOverdue ? 'text-red-400' : 'text-foreground')}>
                        {format(new Date(tp.scheduled_date), 'EEE, dd MMM yyyy · HH:mm')}
                      </p>
                      {isOverdue && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Overdue
                        </p>
                      )}
                      {tp.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{tp.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => {
                      setCompleteTarget(tp);
                      setCompleteNotes(tp.notes ?? '');
                    }}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCancelTarget(tp)}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <LBDDataTable
          columns={historyColumns}
          data={history as unknown as Record<string, unknown>[]}
          isLoading={isLoading}
          rowKey={(row) => String(row.id)}
          enableSearch
          enablePagination
          emptyTitle="No past touchpoints"
          emptyDescription="Completed and cancelled touchpoints will appear here."
        />
      )}

      {/* Schedule Touchpoint Modal */}
      <Dialog open={scheduleOpen} onOpenChange={(o) => !o && setScheduleOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Touchpoint</DialogTitle>
            <DialogDescription>Create a new touchpoint for this engagement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Touchpoint Type</Label>
              <Select value={scheduleForm.touchpoint_type} onValueChange={(v) => setScheduleForm((f) => ({ ...f, touchpoint_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TOUCHPOINT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={scheduleForm.scheduled_date} onChange={(e) => setScheduleForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={scheduleForm.notes} onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Agenda or notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={scheduleSaving || !scheduleForm.touchpoint_type || !scheduleForm.scheduled_date}>
              {scheduleSaving ? 'Scheduling…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Complete Drawer */}
      <LBDDrawer
        open={!!completeTarget}
        onClose={() => { setCompleteTarget(null); setCompleteNotes(''); setActionItems([{ text: '', owner: '', dueDate: '' }]); }}
        title="Complete Touchpoint"
        description={completeTarget ? TOUCHPOINT_LABELS[completeTarget.touchpoint_type] : ''}
        width={520}
        footer={
          <>
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={completeSaving}>
              {completeSaving ? 'Saving…' : 'Mark Complete'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Meeting Notes</Label>
            <Textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={5} placeholder="Key discussion points, decisions…" />
          </div>
          <LBDDrawerSection label="Action Items">
            {actionItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                <Input placeholder="Action item" value={item.text} onChange={(e) => updateActionItem(idx, 'text', e.target.value)} className="col-span-3 sm:col-span-1" />
                <Input placeholder="Owner" value={item.owner} onChange={(e) => updateActionItem(idx, 'owner', e.target.value)} />
                <Input type="date" value={item.dueDate} onChange={(e) => updateActionItem(idx, 'dueDate', e.target.value)} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addActionItem} className="mt-1">
              <Plus className="w-3 h-3 mr-1" /> Add Item
            </Button>
          </LBDDrawerSection>
        </div>
      </LBDDrawer>

      {/* Cancel Confirmation */}
      <LBDConfirmDialog
        open={!!cancelTarget}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
        title="Cancel Touchpoint"
        description="Are you sure you want to cancel this touchpoint? This cannot be undone."
        confirmLabel="Cancel Touchpoint"
        variant="warning"
      />
    </div>
  );
}
