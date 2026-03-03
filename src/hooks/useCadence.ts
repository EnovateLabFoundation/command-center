/**
 * useCadence
 *
 * Data layer for the Engagement Cadence Manager module.
 * CRUD for cadence_touchpoints scoped to an engagement.
 * Includes cadence compliance calculations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, isAfter, isBefore,
} from 'date-fns';

export type Touchpoint = Tables<'cadence_touchpoints'>;
type TouchpointInsert = TablesInsert<'cadence_touchpoints'>;
type TouchpointUpdate = TablesUpdate<'cadence_touchpoints'>;

/** Cadence target intervals (in days) per touchpoint type */
export const CADENCE_TARGETS: Record<string, number> = {
  intel_briefing: 7,
  strategic_checkin: 14,
  monthly_assessment: 30,
  quarterly_review: 90,
  emergency_advisory: 0, // on-demand
};

/** Human-readable labels for touchpoint types */
export const TOUCHPOINT_LABELS: Record<string, string> = {
  intel_briefing: 'Intel Briefing',
  strategic_checkin: 'Strategic Check-in',
  monthly_assessment: 'Monthly Assessment',
  quarterly_review: 'Quarterly Review',
  emergency_advisory: 'Emergency Advisory',
};

/** Colours per touchpoint type */
export const TOUCHPOINT_COLORS: Record<string, string> = {
  intel_briefing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  strategic_checkin: 'bg-accent/20 text-accent border-accent/30',
  monthly_assessment: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  quarterly_review: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  emergency_advisory: 'bg-red-500/20 text-red-400 border-red-500/30',
};

/** Compliance status for a touchpoint type */
export interface CadenceCompliance {
  type: string;
  label: string;
  lastOccurrence: string | null;
  daysSinceLast: number | null;
  targetDays: number;
  status: 'green' | 'amber' | 'red';
}

export function useCadence(engagementId: string | undefined) {
  const { toast } = useToast();
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Fetch touchpoints ── */
  const fetchTouchpoints = useCallback(async () => {
    if (!engagementId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadence_touchpoints')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      setTouchpoints(data ?? []);
    } catch (err) {
      console.error('[useCadence] fetch error:', err);
      toast({ title: 'Error loading touchpoints', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [engagementId, toast]);

  useEffect(() => { fetchTouchpoints(); }, [fetchTouchpoints]);

  /* ── Create ── */
  const createTouchpoint = async (tp: Omit<TouchpointInsert, 'engagement_id' | 'created_by'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !engagementId) return null;
    const { data, error } = await supabase
      .from('cadence_touchpoints')
      .insert({ ...tp, engagement_id: engagementId, created_by: user.id })
      .select()
      .single();
    if (error) {
      toast({ title: 'Failed to schedule touchpoint', description: error.message, variant: 'destructive' });
      return null;
    }
    await fetchTouchpoints();
    toast({ title: 'Touchpoint scheduled' });
    return data;
  };

  /* ── Update ── */
  const updateTouchpoint = async (id: string, updates: TouchpointUpdate) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('cadence_touchpoints')
      .update({ ...updates, updated_by: user?.id ?? null })
      .eq('id', id);
    if (error) {
      toast({ title: 'Failed to update touchpoint', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchTouchpoints();
    toast({ title: 'Touchpoint updated' });
    return true;
  };

  /* ── Mark complete ── */
  const completeTouchpoint = async (id: string, notes: string, actionItems: unknown[]) => {
    return updateTouchpoint(id, {
      status: 'completed',
      completed_date: new Date().toISOString(),
      notes,
      action_items: actionItems as any,
    });
  };

  /* ── Cancel ── */
  const cancelTouchpoint = async (id: string) => {
    return updateTouchpoint(id, { status: 'cancelled' });
  };

  /* ── Computed: upcoming & history ── */
  const now = new Date();
  const upcoming = useMemo(() =>
    touchpoints.filter((tp) => tp.status === 'scheduled' || tp.status === 'rescheduled')
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()),
    [touchpoints],
  );

  const history = useMemo(() =>
    touchpoints.filter((tp) => tp.status === 'completed' || tp.status === 'cancelled')
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()),
    [touchpoints],
  );

  /* ── KPI stats ── */
  const stats = useMemo(() => {
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const upcomingThisWeek = upcoming.filter((tp) => {
      const d = new Date(tp.scheduled_date);
      return d >= weekStart && d <= weekEnd;
    }).length;

    const overdue = upcoming.filter((tp) =>
      isBefore(new Date(tp.scheduled_date), now),
    ).length;

    const completedThisMonth = history.filter((tp) => {
      if (tp.status !== 'completed' || !tp.completed_date) return false;
      const d = new Date(tp.completed_date);
      return d >= monthStart && d <= monthEnd;
    }).length;

    const nextScheduled = upcoming.find((tp) =>
      isAfter(new Date(tp.scheduled_date), now),
    );

    return { upcomingThisWeek, overdue, completedThisMonth, nextScheduled: nextScheduled?.scheduled_date ?? null };
  }, [upcoming, history, now]);

  /* ── Cadence compliance ── */
  const compliance = useMemo((): CadenceCompliance[] => {
    const types = Object.keys(CADENCE_TARGETS);
    return types.filter((t) => CADENCE_TARGETS[t] > 0).map((type) => {
      const completed = touchpoints
        .filter((tp) => tp.touchpoint_type === type && tp.status === 'completed')
        .sort((a, b) => new Date(b.completed_date ?? b.scheduled_date).getTime() - new Date(a.completed_date ?? a.scheduled_date).getTime());

      const lastOccurrence = completed[0]?.completed_date ?? completed[0]?.scheduled_date ?? null;
      const daysSinceLast = lastOccurrence ? differenceInDays(now, new Date(lastOccurrence)) : null;
      const targetDays = CADENCE_TARGETS[type];

      let status: 'green' | 'amber' | 'red' = 'green';
      if (daysSinceLast === null) {
        status = 'red';
      } else if (daysSinceLast > targetDays * 1.5) {
        status = 'red';
      } else if (daysSinceLast > targetDays) {
        status = 'amber';
      }

      return { type, label: TOUCHPOINT_LABELS[type], lastOccurrence, daysSinceLast, targetDays, status };
    });
  }, [touchpoints, now]);

  return {
    touchpoints, isLoading, upcoming, history, stats, compliance,
    fetchTouchpoints, createTouchpoint, updateTouchpoint, completeTouchpoint, cancelTouchpoint,
  };
}
