/**
 * useLeadAdvisorDashboard
 * React Query hooks for the Lead Advisor dashboard.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '@/lib/supabase';

const REFETCH = 30_000;

/* ─────────────────────────────────────────────
   1. KPIs
───────────────────────────────────────────── */

export interface LeadAdvisorKPIs {
  activeEngagements: number;
  overdueCount: number;
  pendingActions: number;
  openEscalations: number;
}

export function useLeadAdvisorKPIs(userId: string) {
  return useQuery<LeadAdvisorKPIs>({
    queryKey: ['la-kpis', userId],
    enabled: !!userId,
    refetchInterval: REFETCH,
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [engResult, touchResult, actionResult, escalResult] = await Promise.all([
        supabase.from('engagements').select('*', { count: 'exact', head: true })
          .eq('lead_advisor_id', userId).eq('status', 'active'),
        supabase.from('cadence_touchpoints').select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled').lt('scheduled_date', today),
        supabase.from('intel_items').select('*', { count: 'exact', head: true })
          .eq('action_required', true).eq('action_status', 'pending'),
        supabase.from('intel_items').select('*', { count: 'exact', head: true })
          .eq('is_escalated', true).or('action_status.neq.done,action_status.is.null'),
      ]);
      return {
        activeEngagements: engResult.count ?? 0,
        overdueCount: touchResult.count ?? 0,
        pendingActions: actionResult.count ?? 0,
        openEscalations: escalResult.count ?? 0,
      };
    },
  });
}

/* ─────────────────────────────────────────────
   2. Engagement Health Board (scoped)
───────────────────────────────────────────── */

export interface MyEngagementRow extends Record<string, unknown> {
  id: string; title: string; client_name: string;
  phase: string; status: string;
  computed_rag: 'red' | 'amber' | 'green';
  latest_intel_days: number | null; start_date: string | null;
}

function computeRag(storedRag: string | null, days: number | null): 'red' | 'amber' | 'green' {
  if (days !== null) {
    if (days > 14) return 'red';
    if (days > 7) return storedRag === 'red' ? 'red' : 'amber';
  }
  if (storedRag === 'red') return 'red';
  if (storedRag === 'amber') return 'amber';
  return 'green';
}

export function useMyEngagements(userId: string) {
  return useQuery<MyEngagementRow[]>({
    queryKey: ['la-engagements', userId],
    enabled: !!userId,
    refetchInterval: REFETCH,
    queryFn: async () => {
      const { data: engs, error } = await supabase.from('engagements')
        .select('id, title, client_id, phase, status, health_rag, start_date')
        .eq('lead_advisor_id', userId).in('status', ['active', 'paused'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!engs?.length) return [];

      const clientIds = [...new Set(engs.map(e => e.client_id))];
      const engIds = engs.map(e => e.id);

      const [clientsRes, intelRes] = await Promise.all([
        supabase.from('clients').select('id, name').in('id', clientIds),
        supabase.from('intel_items').select('engagement_id, date_logged')
          .in('engagement_id', engIds).order('date_logged', { ascending: false }),
      ]);

      const clientMap = new Map((clientsRes.data ?? []).map(c => [c.id, c.name]));
      const latestIntelMap = new Map<string, string>();
      for (const i of intelRes.data ?? []) {
        if (!latestIntelMap.has(i.engagement_id)) latestIntelMap.set(i.engagement_id, i.date_logged);
      }

      const now = Date.now();
      return engs.map(eng => {
        const ld = latestIntelMap.get(eng.id);
        const days = ld ? Math.floor((now - new Date(ld).getTime()) / 86_400_000) : null;
        return {
          id: eng.id, title: eng.title,
          client_name: clientMap.get(eng.client_id) ?? '—',
          phase: `Phase ${eng.phase}`, status: eng.status,
          computed_rag: computeRag(eng.health_rag, days),
          latest_intel_days: days, start_date: eng.start_date,
        };
      });
    },
  });
}

/* ─────────────────────────────────────────────
   3. Escalation Inbox
───────────────────────────────────────────── */

export interface EscalationItem extends Record<string, unknown> {
  id: string; engagement_id: string; engagement_title: string;
  headline: string; summary: string | null;
  sentiment_score: number | null; source_name: string | null;
  source_type: string | null; created_at: string; action_status: string | null;
}

export function useEscalationInbox() {
  return useQuery<EscalationItem[]>({
    queryKey: ['la-escalation-inbox'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const { data: items, error } = await supabase.from('intel_items')
        .select('id, engagement_id, headline, summary, sentiment_score, source_name, source_type, created_at, action_status')
        .eq('is_urgent', true).eq('action_status', 'pending')
        .order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      if (!items?.length) return [];

      const engIds = [...new Set(items.map(i => i.engagement_id))];
      const { data: engs } = await supabase.from('engagements').select('id, title').in('id', engIds);
      const engMap = new Map((engs ?? []).map(e => [e.id, e.title]));
      return items.map(i => ({ ...i, engagement_title: engMap.get(i.engagement_id) ?? '—' })) as EscalationItem[];
    },
  });
}

/* ─────────────────────────────────────────────
   4. Upcoming Touchpoints (this week)
───────────────────────────────────────────── */

export interface TouchpointItem extends Record<string, unknown> {
  id: string; engagement_id: string; engagement_title: string;
  touchpoint_type: string; scheduled_date: string; status: string; notes: string | null;
}

export function useUpcomingTouchpoints() {
  return useQuery<TouchpointItem[]>({
    queryKey: ['la-upcoming-touchpoints'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { data, error } = await supabase.from('cadence_touchpoints')
        .select('id, engagement_id, touchpoint_type, scheduled_date, status, notes')
        .gte('scheduled_date', weekStart).lte('scheduled_date', weekEnd)
        .neq('status', 'cancelled').order('scheduled_date');
      if (error) throw error;
      if (!data?.length) return [];

      const engIds = [...new Set(data.map(t => t.engagement_id))];
      const { data: engs } = await supabase.from('engagements').select('id, title').in('id', engIds);
      const engMap = new Map((engs ?? []).map(e => [e.id, e.title]));
      return data.map(t => ({ ...t, engagement_title: engMap.get(t.engagement_id) ?? '—' })) as TouchpointItem[];
    },
  });
}

/* ─────────────────────────────────────────────
   5. Mutations
───────────────────────────────────────────── */

export function useUpdateIntelStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('intel_items').update({ action_status: status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['la-escalation-inbox'] });
      qc.invalidateQueries({ queryKey: ['la-kpis'] });
    },
  });
}
