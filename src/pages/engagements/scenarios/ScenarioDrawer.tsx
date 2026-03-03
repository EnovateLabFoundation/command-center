/**
 * ScenarioDrawer
 *
 * Slide-out drawer for adding/editing scenarios.
 * Dynamic list inputs for trigger events.
 * All fields from the scenarios table.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { LBDDrawer } from '@/components/ui/lbd/LBDDrawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Scenario, ScenarioProbability, ScenarioStatus } from '@/hooks/useScenarios';

/* ─────────────────────────────────────────────
   Form values type
───────────────────────────────────────────── */

export interface ScenarioFormValues {
  name: string;
  key_driver: string;
  probability: ScenarioProbability;
  impact_score: number;
  time_horizon_months: number;
  status: ScenarioStatus;
  strategic_response: string;
  key_risks: string;
  key_opportunities: string;
  trigger_events: string[];
}

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface ScenarioDrawerProps {
  open: boolean;
  onClose: () => void;
  initial: Scenario | null;
  onSave: (values: ScenarioFormValues) => Promise<void>;
  isSaving: boolean;
}

/* ─────────────────────────────────────────────
   Defaults
───────────────────────────────────────────── */

const EMPTY: ScenarioFormValues = {
  name: '',
  key_driver: '',
  probability: 'medium',
  impact_score: 5,
  time_horizon_months: 6,
  status: 'active',
  strategic_response: '',
  key_risks: '',
  key_opportunities: '',
  trigger_events: [],
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function ScenarioDrawer({ open, onClose, initial, onSave, isSaving }: ScenarioDrawerProps) {
  const [form, setForm] = useState<ScenarioFormValues>(EMPTY);
  const [newTrigger, setNewTrigger] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        key_driver: initial.key_driver ?? '',
        probability: initial.probability ?? 'medium',
        impact_score: initial.impact_score ?? 5,
        time_horizon_months: initial.time_horizon_months ?? 6,
        status: initial.status,
        strategic_response: initial.strategic_response ?? '',
        key_risks: initial.key_risks ?? '',
        key_opportunities: initial.key_opportunities ?? '',
        trigger_events: initial.trigger_events ?? [],
      });
    } else {
      setForm(EMPTY);
    }
    setNewTrigger('');
  }, [initial, open]);

  const set = useCallback(<K extends keyof ScenarioFormValues>(key: K, val: ScenarioFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  /** Add a trigger event string */
  const addTrigger = () => {
    const v = newTrigger.trim();
    if (!v) return;
    set('trigger_events', [...form.trigger_events, v]);
    setNewTrigger('');
  };

  /** Remove trigger event by index */
  const removeTrigger = (idx: number) => {
    set('trigger_events', form.trigger_events.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    await onSave(form);
  };

  const isEdit = !!initial;

  return (
    <LBDDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Scenario' : 'Add Scenario'}
      description={isEdit ? 'Update scenario details and trigger events.' : 'Create a new strategic scenario.'}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !form.name.trim()}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-lg transition-colors',
              'bg-accent text-black hover:bg-accent/90',
              (isSaving || !form.name.trim()) && 'opacity-50 pointer-events-none',
            )}
          >
            {isSaving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      }
    >
      <div className="space-y-5 p-1">
        {/* Name */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono tracking-wider text-muted-foreground">SCENARIO NAME *</Label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Opposition coalition realignment" />
        </div>

        {/* Key Driver */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono tracking-wider text-muted-foreground">KEY DRIVER</Label>
          <Input value={form.key_driver} onChange={(e) => set('key_driver', e.target.value)} placeholder="Primary force behind this scenario" />
        </div>

        {/* Probability + Impact + Horizon row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-mono tracking-wider text-muted-foreground">PROBABILITY</Label>
            <select
              value={form.probability}
              onChange={(e) => set('probability', e.target.value as ScenarioProbability)}
              className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono tracking-wider text-muted-foreground">IMPACT (1-10)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.impact_score}
              onChange={(e) => set('impact_score', Math.min(10, Math.max(1, Number(e.target.value))))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono tracking-wider text-muted-foreground">HORIZON (MO)</Label>
            <Input
              type="number"
              min={1}
              value={form.time_horizon_months}
              onChange={(e) => set('time_horizon_months', Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono tracking-wider text-muted-foreground">STATUS</Label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value as ScenarioStatus)}
            className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="active">Active</option>
            <option value="watching">Watching</option>
            <option value="triggered">Triggered</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Trigger Events — dynamic list */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono tracking-wider text-muted-foreground">TRIGGER EVENTS</Label>
          <div className="space-y-1.5">
            {form.trigger_events.map((te, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm px-3 py-1.5 rounded-md border border-border bg-card text-foreground truncate">
                  {te}
                </span>
                <button type="button" onClick={() => removeTrigger(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              placeholder="Add trigger event…"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrigger())}
            />
            <button
              type="button"
              onClick={addTrigger}
              className="px-2 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Strategic Response */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono tracking-wider text-muted-foreground">STRATEGIC RESPONSE</Label>
          <Textarea
            value={form.strategic_response}
            onChange={(e) => set('strategic_response', e.target.value)}
            rows={4}
            placeholder="Planned response if this scenario materialises…"
          />
        </div>

        {/* Key Risks */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono tracking-wider text-muted-foreground">KEY RISKS</Label>
          <Textarea
            value={form.key_risks}
            onChange={(e) => set('key_risks', e.target.value)}
            rows={3}
            placeholder="Primary risks associated with this scenario…"
          />
        </div>

        {/* Key Opportunities */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono tracking-wider text-muted-foreground">KEY OPPORTUNITIES</Label>
          <Textarea
            value={form.key_opportunities}
            onChange={(e) => set('key_opportunities', e.target.value)}
            rows={3}
            placeholder="Potential opportunities if this scenario unfolds…"
          />
        </div>
      </div>
    </LBDDrawer>
  );
}
