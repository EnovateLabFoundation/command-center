/**
 * useIntelDashboard
 * React Query hooks for the Intelligence Analyst dashboard.
 *
 * Sections:
 *  1. Daily Sentiment Monitor  — today vs yesterday vs 7-day avg per engagement
 *  2. Escalation Queue         — is_escalated=true, action_status='pending', with mutations
 *  3. Competitor Activity Feed — last 10 competitor profiles by last_updated
 *  4. Intel Volume Chart       — last 7 days daily item counts by sentiment range
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';

const REFETCH = 30_000;

/* ─────────────────────────────────────────────
   1. Daily Sentiment Monitor
───────────────────────────────────────────── */

export interface DailySentimentRow {
  engagement_id: string;
  engagement_title: string;
  today_avg: number | null;
  yesterday_avg: number | null;
  week_avg: number | null;
  today_count: number;
  trend: 'up' | 'down' | 'flat';
}

export function useDailySentiment() {
  return useQuery<DailySentimentRow[]>({
    queryKey: ['intel-daily-sentiment'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const now  = new Date();
      const dToday     = format(now, 'yyyy-MM-dd');
      const dYesterday = format(subDays(now, 1), 'yyyy-MM-dd');
      const d7ago      = format(subDays(now, 7), 'yyyy-MM-dd');

      const [intelRes, engsRes] = await Promise.all([
        supabase
          .from('intel_items')
          .select('engagement_id, sentiment_score, date_logged')
          .gte('date_logged', d7ago)
          .not('sentiment_score', 'is', null),
        supabase.from('engagements').select('id, title').in('status', ['active', 'paused']),
      ]);
      if (intelRes.error) throw intelRes.error;

      const engMap = new Map((engsRes.data ?? []).map(e => [e.id, e.title]));

      type BucketData = { today: number[]; yesterday: number[]; week: number[] };
      const grouped: Record<string, BucketData> = {};

      for (const item of intelRes.data ?? []) {
        if (item.sentiment_score === null) continue;
        if (!grouped[item.engagement_id]) {
          grouped[item.engagement_id] = { today: [], yesterday: [], week: [] };
        }
        grouped[item.engagement_id].week.push(item.sentiment_score);
        if (item.date_logged === dToday)     grouped[item.engagement_id].today.push(item.sentiment_score);
        if (item.date_logged === dYesterday) grouped[item.engagement_id].yesterday.push(item.sentiment_score);
      }

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      return Object.entries(grouped).map(([engId, { today, yesterday, week }]) => {
        const todayAvg     = avg(today);
        const yesterdayAvg = avg(yesterday);
        const weekAvg      = avg(week);
        let trend: 'up' | 'down' | 'flat' = 'flat';
        if (todayAvg !== null && yesterdayAvg !== null) {
          if (todayAvg - yesterdayAvg >  0.05) trend = 'up';
          else if (yesterdayAvg - todayAvg > 0.05) trend = 'down';
        }
        return {
          engagement_id: engId,
          engagement_title: engMap.get(engId) ?? '—',
          today_avg: todayAvg,
          yesterday_avg: yesterdayAvg,
          week_avg: weekAvg,
          today_count: today.length,
          trend,
        };
      }).sort((a, b) => (a.today_avg ?? 0) - (b.today_avg ?? 0));
    },
  });
}

/* ─────────────────────────────────────────────
   2. Escalation Queue
───────────────────────────────────────────── */

export interface IntelEscalationRow extends Record<string, unknown> {
  id: string;
  headline: string;
  summary: string | null;
  sentiment_score: number | null;
  source_name: string | null;
  platform: string | null;
  reach_tier: string | null;
  narrative_theme: string | null;
  date_logged: string;
  is_urgent: boolean;
  action_status: string | null;
  engagement_id: string;
  engagement_title: string;
}

export function useIntelEscalationQueue() {
  return useQuery<IntelEscalationRow[]>({
    queryKey: ['intel-escalation-queue'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intel_items')
        .select(
          'id, headline, summary, sentiment_score, source_name, platform, reach_tier, narrative_theme, date_logged, is_urgent, action_status, engagement_id',
        )
        .eq('is_escalated', true)
        .in('action_status', ['pending', null as unknown as string])
        .order('is_urgent', { ascending: false })
        .order('date_logged', { ascending: false })
        .limit(25);
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
      })) as IntelEscalationRow[];
    },
  });
}

/** Set action_status on an intel item */
export function useUpdateEscalationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('intel_items')
        .update({ action_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intel-escalation-queue'] });
      qc.invalidateQueries({ queryKey: ['intel-daily-sentiment'] });
    },
  });
}

/* ─────────────────────────────────────────────
   3. Competitor Activity Feed
───────────────────────────────────────────── */

export interface CompetitorFeedRow extends Record<string, unknown> {
  id: string;
  name: string;
  avg_sentiment_score: number | null;
  monthly_media_mentions: number | null;
  threat_score: number | null;
  influence_score: number | null;
  last_updated: string;
  engagement_title: string;
  engagement_id: string;
}

export function useCompetitorFeed() {
  return useQuery<CompetitorFeedRow[]>({
    queryKey: ['intel-competitor-feed'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_profiles')
        .select('id, name, avg_sentiment_score, monthly_media_mentions, threat_score, influence_score, last_updated, engagement_id')
        .order('last_updated', { ascending: false })
        .limit(10);
      if (error) throw error;
      if (!data?.length) return [];

      const engIds = [...new Set(data.map(c => c.engagement_id))];
      const { data: engs } = await supabase
        .from('engagements')
        .select('id, title')
        .in('id', engIds);
      const engMap = new Map((engs ?? []).map(e => [e.id, e.title]));

      return data.map(c => ({
        ...c,
        engagement_title: engMap.get(c.engagement_id) ?? '—',
      })) as CompetitorFeedRow[];
    },
  });
}

/* ─────────────────────────────────────────────
   4. Intel Volume Chart (last 7 days)
───────────────────────────────────────────── */

export interface IntelVolumeDatum {
  date: string;       // 'Mon', 'Tue', etc.
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export function useIntelVolumeChart() {
  return useQuery<IntelVolumeDatum[]>({
    queryKey: ['intel-volume-chart'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const now   = new Date();
      const d7ago = format(subDays(now, 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('intel_items')
        .select('sentiment_score, date_logged')
        .gte('date_logged', d7ago)
        .order('date_logged');
      if (error) throw error;

      // Build last-7-days skeleton
      const days: IntelVolumeDatum[] = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i);
        return {
          date: format(d, 'EEE'),            // Mon, Tue …
          _iso: format(d, 'yyyy-MM-dd'),      // for matching
          positive: 0, neutral: 0, negative: 0, total: 0,
        } as IntelVolumeDatum & { _iso: string };
      });

      const dayMap = new Map(
        (days as (IntelVolumeDatum & { _iso: string })[]).map(d => [d._iso, d]),
      );

      for (const item of data ?? []) {
        const bucket = dayMap.get(item.date_logged);
        if (!bucket) continue;
        bucket.total++;
        const s = item.sentiment_score ?? 0;
        if (s > 0.3)       bucket.positive++;
        else if (s < -0.3) bucket.negative++;
        else               bucket.neutral++;
      }

      // Strip the internal _iso field
      return days.map(({ date, positive, neutral, negative, total }) => ({
        date, positive, neutral, negative, total,
      }));
    },
  });
}
