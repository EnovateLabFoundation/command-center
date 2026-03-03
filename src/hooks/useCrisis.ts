/**
 * useCrisis — Data hook for Crisis Protocol Command Centre
 *
 * Manages crisis_types (pre-crisis setup) and crisis_events (active/resolved crises).
 * Provides CRUD operations, realtime subscriptions for intel feed, and audit logging.
 *
 * @module hooks/useCrisis
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type CrisisType = Tables<'crisis_types'>;
export type CrisisEvent = Tables<'crisis_events'>;
export type IntelItem = Tables<'intel_items'>;

/** Single checklist action stored in crisis_events.checklist_items JSONB */
export interface ChecklistAction {
  id: string;
  phase: 'immediate' | 'short_term';
  description: string;
  assignedTo: string | null;
  status: 'pending' | 'in_progress' | 'done';
  checkedAt: string | null;
}

/** Single entry in the communications log JSONB */
export interface CommsLogEntry {
  id: string;
  who: string;
  toWhom: string;
  channel: string;
  summary: string;
  timestamp: string;
}

/** Debrief structure stored in crisis_events.debrief_notes (JSON string) */
export interface DebriefData {
  timeline: string;
  whatWorked: string;
  whatFailed: string;
  whatSurprised: string;
  lessonsLearned: string;
  narrativeRecovery: string;
}

/** Determines which mode the Crisis page should display */
export type CrisisMode = 'setup' | 'active' | 'review';

/* ── Query keys ────────────────────────────────────────────────────────────── */

const KEYS = {
  types: (engId: string) => ['crisis_types', engId] as const,
  events: (engId: string) => ['crisis_events', engId] as const,
  activeEvent: (engId: string) => ['crisis_events', engId, 'active'] as const,
  intel: (engId: string) => ['intel_items', engId] as const,
};

/* ── Hook ──────────────────────────────────────────────────────────────────── */

export function useCrisis(engagementId: string | undefined) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const engId = engagementId ?? '';

  /* ── Crisis Types ─────────────────────────────────────────────────────── */

  const typesQuery = useQuery({
    queryKey: KEYS.types(engId),
    enabled: !!engId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crisis_types')
        .select('*')
        .eq('engagement_id', engId)
        .order('severity', { ascending: false });
      if (error) throw error;
      return data as CrisisType[];
    },
  });

  const upsertType = useMutation({
    mutationFn: async (payload: Partial<CrisisType> & { id?: string }) => {
      if (!userId || !engId) throw new Error('Missing context');
      if (payload.id) {
        const { error } = await supabase
          .from('crisis_types')
          .update({ ...payload, updated_by: userId } as TablesUpdate<'crisis_types'>)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crisis_types')
          .insert({
            ...payload,
            engagement_id: engId,
            created_by: userId,
          } as TablesInsert<'crisis_types'>);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.types(engId) }),
  });

  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crisis_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.types(engId) }),
  });

  /* ── Crisis Events ────────────────────────────────────────────────────── */

  const eventsQuery = useQuery({
    queryKey: KEYS.events(engId),
    enabled: !!engId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crisis_events')
        .select('*, crisis_types(crisis_type_name, holding_statement_draft, immediate_actions, short_term_actions)')
        .eq('engagement_id', engId)
        .order('activated_at', { ascending: false });
      if (error) throw error;
      return data as (CrisisEvent & {
        crisis_types: Pick<CrisisType, 'crisis_type_name' | 'holding_statement_draft' | 'immediate_actions' | 'short_term_actions'>;
      })[];
    },
  });

  /** The currently active crisis event (if any) */
  const activeEvent = eventsQuery.data?.find((e) => e.status === 'active') ?? null;

  /** The most recently resolved event for review */
  const latestResolved = eventsQuery.data?.find((e) => e.status === 'resolved') ?? null;

  /** Current page mode */
  const mode: CrisisMode = activeEvent ? 'active' : 'setup';

  /* ── Activate Crisis ──────────────────────────────────────────────────── */

  const activateCrisis = useMutation({
    mutationFn: async ({
      crisisTypeId,
      notes,
    }: {
      crisisTypeId: string;
      notes?: string;
    }) => {
      if (!userId || !engId) throw new Error('Missing context');

      // Find the crisis type to build initial checklist
      const crisisType = typesQuery.data?.find((t) => t.id === crisisTypeId);
      const immediateActions = (crisisType?.immediate_actions as string[]) ?? [];
      const shortTermActions = (crisisType?.short_term_actions as string[]) ?? [];

      const checklist: ChecklistAction[] = [
        ...immediateActions.map((desc, i) => ({
          id: `imm-${i}`,
          phase: 'immediate' as const,
          description: desc,
          assignedTo: null,
          status: 'pending' as const,
          checkedAt: null,
        })),
        ...shortTermActions.map((desc, i) => ({
          id: `st-${i}`,
          phase: 'short_term' as const,
          description: desc,
          assignedTo: null,
          status: 'pending' as const,
          checkedAt: null,
        })),
      ];

      const { data, error } = await supabase
        .from('crisis_events')
        .insert({
          engagement_id: engId,
          crisis_type_id: crisisTypeId,
          created_by: userId,
          activation_notes: notes ?? null,
          status: 'active',
          checklist_items: checklist as unknown as Record<string, unknown>[],
          communications_log: [] as unknown as Record<string, unknown>[],
        } as TablesInsert<'crisis_events'>)
        .select()
        .single();
      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'create' as const,
        table_name: 'crisis_events',
        record_id: data.id,
        new_values: { crisis_type_id: crisisTypeId, status: 'active' },
      } as TablesInsert<'audit_logs'>);

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.events(engId) }),
  });

  /* ── Update Event (checklist, comms log, holding statement) ───────────── */

  const updateEvent = useMutation({
    mutationFn: async (payload: Partial<CrisisEvent> & { id: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('crisis_events')
        .update({ ...payload, updated_by: userId } as TablesUpdate<'crisis_events'>)
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.events(engId) }),
  });

  /* ── Resolve Crisis ───────────────────────────────────────────────────── */

  const resolveCrisis = useMutation({
    mutationFn: async ({
      eventId,
      debriefNotes,
    }: {
      eventId: string;
      debriefNotes: string;
    }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('crisis_events')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          debrief_notes: debriefNotes,
          updated_by: userId,
        } as TablesUpdate<'crisis_events'>)
        .eq('id', eventId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'update' as const,
        table_name: 'crisis_events',
        record_id: eventId,
        new_values: { status: 'resolved' },
      } as TablesInsert<'audit_logs'>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.events(engId) }),
  });

  /* ── Realtime Intel Feed ──────────────────────────────────────────────── */

  const [realtimeIntel, setRealtimeIntel] = useState<IntelItem[]>([]);

  useEffect(() => {
    if (!engId || !activeEvent) return;

    // Initial load of recent intel
    supabase
      .from('intel_items')
      .select('*')
      .eq('engagement_id', engId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setRealtimeIntel(data as IntelItem[]);
      });

    // Subscribe to new intel
    const channel = supabase
      .channel(`crisis-intel-${engId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'intel_items', filter: `engagement_id=eq.${engId}` },
        (payload) => {
          setRealtimeIntel((prev) => [payload.new as IntelItem, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [engId, activeEvent?.id]);

  /* ── Intel for sentiment chart (post-crisis) ──────────────────────────── */

  const fetchSentimentData = useCallback(
    async (activatedAt: string) => {
      if (!engId) return [];
      const actDate = new Date(activatedAt);
      const pre30 = new Date(actDate);
      pre30.setDate(pre30.getDate() - 30);
      const post30 = new Date(actDate);
      post30.setDate(post30.getDate() + 30);

      const { data } = await supabase
        .from('intel_items')
        .select('date_logged, sentiment_score')
        .eq('engagement_id', engId)
        .gte('date_logged', pre30.toISOString().split('T')[0])
        .lte('date_logged', post30.toISOString().split('T')[0])
        .not('sentiment_score', 'is', null)
        .order('date_logged');

      return (data ?? []) as Pick<IntelItem, 'date_logged' | 'sentiment_score'>[];
    },
    [engId],
  );

  /* ── Staff list for assignee selectors ────────────────────────────────── */

  const staffQuery = useQuery({
    queryKey: ['profiles_staff'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url');
      return (data ?? []) as Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url'>[];
    },
    staleTime: 60_000,
  });

  return {
    // Crisis types
    crisisTypes: typesQuery.data ?? [],
    typesLoading: typesQuery.isLoading,
    upsertType,
    deleteType,

    // Crisis events
    events: eventsQuery.data ?? [],
    eventsLoading: eventsQuery.isLoading,
    activeEvent,
    latestResolved,
    mode,

    // Actions
    activateCrisis,
    updateEvent,
    resolveCrisis,

    // Intel
    realtimeIntel,
    fetchSentimentData,

    // Staff
    staff: staffQuery.data ?? [],
  };
}
