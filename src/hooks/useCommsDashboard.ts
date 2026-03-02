/**
 * useCommsDashboard
 * React Query hooks for the Communications Director dashboard.
 *
 * Sections:
 *  1. Narrative Health Scores — avg sentiment per engagement (last 30d) + trend
 *  2. Active Initiatives       — comms_initiatives where status='in_progress'
 *  3. Upcoming Comms Events    — content_items scheduled + touchpoints this week
 */
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '@/lib/supabase';

const REFETCH = 30_000;

/* ─────────────────────────────────────────────
   1. Narrative Health Scores
───────────────────────────────────────────── */

export interface NarrativeHealthRow {
  engagement_id: string;
  engagement_title: string;
  avg_sentiment_30d: number | null;
  avg_sentiment_7d: number | null;
  /** positive trend means improving */
  trend: 'up' | 'down' | 'flat';
  item_count: number;
}

export function useNarrativeSentiment() {
  return useQuery<NarrativeHealthRow[]>({
    queryKey: ['comms-narrative-sentiment'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const now = new Date();
      const d30 = format(subDays(now, 30), 'yyyy-MM-dd');
      const d7  = format(subDays(now, 7),  'yyyy-MM-dd');

      const [intelRes, engsRes] = await Promise.all([
        supabase
          .from('intel_items')
          .select('engagement_id, sentiment_score, date_logged')
          .gte('date_logged', d30),
        supabase
          .from('engagements')
          .select('id, title')
          .in('status', ['active', 'paused']),
      ]);
      if (intelRes.error) throw intelRes.error;

      const engMap = new Map((engsRes.data ?? []).map(e => [e.id, e.title]));

      // Group items by engagement
      type Acc = Record<string, { all: number[]; last7: number[] }>;
      const grouped = (intelRes.data ?? []).reduce<Acc>((acc, item) => {
        if (item.sentiment_score === null) return acc;
        if (!acc[item.engagement_id]) acc[item.engagement_id] = { all: [], last7: [] };
        acc[item.engagement_id].all.push(item.sentiment_score);
        if (item.date_logged >= d7) acc[item.engagement_id].last7.push(item.sentiment_score);
        return acc;
      }, {});

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      return Object.entries(grouped).map(([engId, { all, last7 }]) => {
        const avg30 = avg(all);
        const avg7  = avg(last7);
        let trend: 'up' | 'down' | 'flat' = 'flat';
        if (avg30 !== null && avg7 !== null) {
          if (avg7 - avg30 > 0.05) trend = 'up';
          else if (avg30 - avg7 > 0.05) trend = 'down';
        }
        return {
          engagement_id: engId,
          engagement_title: engMap.get(engId) ?? '—',
          avg_sentiment_30d: avg30,
          avg_sentiment_7d: avg7,
          trend,
          item_count: all.length,
        };
      }).sort((a, b) => (a.avg_sentiment_30d ?? 0) - (b.avg_sentiment_30d ?? 0));
    },
  });
}

/* ─────────────────────────────────────────────
   2. Active Initiatives
───────────────────────────────────────────── */

export interface InitiativeRow extends Record<string, unknown> {
  id: string;
  key_message: string | null;
  policy_area: string | null;
  launch_date: string | null;
  status: string;
  success_metric: string | null;
  target_audience: string | null;
  engagement_id: string;
  engagement_title: string;
}

export function useActiveInitiatives() {
  return useQuery<InitiativeRow[]>({
    queryKey: ['comms-active-initiatives'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comms_initiatives')
        .select('id, key_message, policy_area, launch_date, status, success_metric, target_audience, engagement_id')
        .eq('status', 'in_progress')
        .order('launch_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      if (!data?.length) return [];

      const engIds = [...new Set(data.map(i => i.engagement_id))];
      const { data: engs } = await supabase
        .from('engagements')
        .select('id, title')
        .in('id', engIds);
      const engMap = new Map((engs ?? []).map(e => [e.id, e.title]));

      return data.map(i => ({
        ...i,
        engagement_title: engMap.get(i.engagement_id) ?? '—',
      })) as InitiativeRow[];
    },
  });
}

/* ─────────────────────────────────────────────
   3. Upcoming Comms Events (this week)
───────────────────────────────────────────── */

export type CommsEventType = 'content' | 'touchpoint';

export interface CommsEventItem extends Record<string, unknown> {
  id: string;
  type: CommsEventType;
  title: string;
  scheduled_date: string;
  platform: string | null;
  status: string;
  engagement_title: string;
  engagement_id: string;
}

export function useUpcomingCommsEvents() {
  return useQuery<CommsEventItem[]>({
    queryKey: ['comms-upcoming-events'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd   = format(endOfWeek(new Date(), { weekStartsOn: 1 }),   'yyyy-MM-dd');

      const [contentRes, touchRes] = await Promise.all([
        supabase
          .from('content_items')
          .select('id, title, scheduled_date, platform, status, engagement_id')
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd)
          .neq('status', 'archived')
          .order('scheduled_date'),
        supabase
          .from('cadence_touchpoints')
          .select('id, touchpoint_type, scheduled_date, status, engagement_id')
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd)
          .neq('status', 'cancelled')
          .order('scheduled_date'),
      ]);
      if (contentRes.error) throw contentRes.error;
      if (touchRes.error) throw touchRes.error;

      const allEngIds = [
        ...new Set([
          ...(contentRes.data ?? []).map(c => c.engagement_id),
          ...(touchRes.data ?? []).map(t => t.engagement_id),
        ]),
      ];
      const { data: engs } = await supabase
        .from('engagements')
        .select('id, title')
        .in('id', allEngIds);
      const engMap = new Map((engs ?? []).map(e => [e.id, e.title]));

      const contentEvents: CommsEventItem[] = (contentRes.data ?? []).map(c => ({
        id: c.id,
        type: 'content' as const,
        title: c.title,
        scheduled_date: c.scheduled_date ?? '',
        platform: c.platform,
        status: c.status,
        engagement_id: c.engagement_id,
        engagement_title: engMap.get(c.engagement_id) ?? '—',
      }));

      const touchEvents: CommsEventItem[] = (touchRes.data ?? []).map(t => ({
        id: t.id,
        type: 'touchpoint' as const,
        title: t.touchpoint_type,
        scheduled_date: t.scheduled_date ?? '',
        platform: null,
        status: t.status,
        engagement_id: t.engagement_id,
        engagement_title: engMap.get(t.engagement_id) ?? '—',
      }));

      return [...contentEvents, ...touchEvents].sort(
        (a, b) => a.scheduled_date.localeCompare(b.scheduled_date),
      );
    },
  });
}
