/**
 * InitiativeDrawer
 *
 * Slide-out drawer for creating/editing a comms_initiative.
 * Includes all initiative fields with channel dropdown,
 * responsible user selector, and date picker.
 */

import { useState, useEffect } from 'react';
import { LBDDrawer, LBDDrawerSection } from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  CHANNEL_OPTIONS,
  PHASE_OPTIONS,
  type Initiative,
  type ResponsibleUser,
} from '@/hooks/useCommsPlanner';

/* ─────────────────────────────────────────── */

interface InitiativeDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => void;
  saving?: boolean;
  initiative?: Initiative | null;
  responsibleUsers: ResponsibleUser[];
}

const STATUS_OPTIONS = ['not_started', 'in_progress', 'complete'] as const;

export default function InitiativeDrawer({
  open,
  onClose,
  onSave,
  saving,
  initiative,
  responsibleUsers,
}: InitiativeDrawerProps) {
  const isEdit = !!initiative;

  /* ── Local form state ── */
  const [policyArea, setPolicyArea] = useState('');
  const [commPhase, setCommPhase] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [primaryChannel, setPrimaryChannel] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [launchDate, setLaunchDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<string>('not_started');
  const [successMetric, setSuccessMetric] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [notes, setNotes] = useState('');

  /* ── Populate on edit ── */
  useEffect(() => {
    if (initiative) {
      setPolicyArea(initiative.policy_area ?? '');
      setCommPhase(initiative.communication_phase ?? '');
      setTargetAudience(initiative.target_audience ?? '');
      setKeyMessage(initiative.key_message ?? '');
      setPrimaryChannel(initiative.primary_channel ?? '');
      setResponsibleId(initiative.responsible_id ?? '');
      setLaunchDate(initiative.launch_date ? new Date(initiative.launch_date) : undefined);
      setStatus(initiative.status);
      setSuccessMetric(initiative.success_metric ?? '');
      setActualResult(initiative.actual_result ?? '');
      setNotes(initiative.notes ?? '');
    } else {
      setPolicyArea(''); setCommPhase(''); setTargetAudience('');
      setKeyMessage(''); setPrimaryChannel(''); setResponsibleId('');
      setLaunchDate(undefined); setStatus('not_started');
      setSuccessMetric(''); setActualResult(''); setNotes('');
    }
  }, [initiative, open]);

  /* ── Submit ── */
  const handleSave = () => {
    onSave({
      ...(isEdit ? { id: initiative!.id } : {}),
      policy_area: policyArea || null,
      communication_phase: commPhase || null,
      target_audience: targetAudience || null,
      key_message: keyMessage || null,
      primary_channel: primaryChannel || null,
      responsible_id: responsibleId || null,
      launch_date: launchDate ? format(launchDate, 'yyyy-MM-dd') : null,
      status,
      success_metric: successMetric || null,
      actual_result: actualResult || null,
      notes: notes || null,
    });
  };

  return (
    <LBDDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Initiative' : 'Add Initiative'}
      description="Define communications initiative details."
      width={520}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Policy Area */}
        <LBDDrawerSection label="POLICY AREA">
          <Input value={policyArea} onChange={e => setPolicyArea(e.target.value)} placeholder="e.g. Healthcare Reform" />
        </LBDDrawerSection>

        {/* Communication Phase */}
        <LBDDrawerSection label="COMMUNICATION PHASE">
          <Select value={commPhase} onValueChange={setCommPhase}>
            <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
            <SelectContent>
              {PHASE_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </LBDDrawerSection>

        {/* Target Audience */}
        <LBDDrawerSection label="TARGET AUDIENCE">
          <Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g. Urban Youth 18-35" />
        </LBDDrawerSection>

        {/* Key Message */}
        <LBDDrawerSection label="KEY MESSAGE">
          <Textarea value={keyMessage} onChange={e => setKeyMessage(e.target.value)} placeholder="Core message for this initiative…" rows={3} />
        </LBDDrawerSection>

        {/* Primary Channel */}
        <LBDDrawerSection label="PRIMARY CHANNEL">
          <Select value={primaryChannel} onValueChange={setPrimaryChannel}>
            <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map(ch => <SelectItem key={ch} value={ch}>{ch}</SelectItem>)}
            </SelectContent>
          </Select>
        </LBDDrawerSection>

        {/* Responsible */}
        <LBDDrawerSection label="RESPONSIBLE">
          <Select value={responsibleId} onValueChange={setResponsibleId}>
            <SelectTrigger><SelectValue placeholder="Assign owner" /></SelectTrigger>
            <SelectContent>
              {responsibleUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  <span className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={u.avatar_url ?? ''} />
                      <AvatarFallback className="text-[9px]">{u.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {u.full_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LBDDrawerSection>

        {/* Launch Date */}
        <LBDDrawerSection label="LAUNCH DATE">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !launchDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {launchDate ? format(launchDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={launchDate} onSelect={setLaunchDate} initialFocus className={cn('p-3 pointer-events-auto')} />
            </PopoverContent>
          </Popover>
        </LBDDrawerSection>

        {/* Status */}
        <LBDDrawerSection label="STATUS">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LBDDrawerSection>

        {/* Success Metric */}
        <LBDDrawerSection label="SUCCESS METRIC">
          <Input value={successMetric} onChange={e => setSuccessMetric(e.target.value)} placeholder="e.g. 500k reach, 10% engagement" />
        </LBDDrawerSection>

        {/* Actual Result */}
        <LBDDrawerSection label="ACTUAL RESULT">
          <Input value={actualResult} onChange={e => setActualResult(e.target.value)} placeholder="Measured outcome…" />
        </LBDDrawerSection>

        {/* Notes */}
        <LBDDrawerSection label="NOTES">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional context…" rows={3} />
        </LBDDrawerSection>
      </div>
    </LBDDrawer>
  );
}
