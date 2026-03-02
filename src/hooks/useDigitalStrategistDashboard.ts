/**
 * useDigitalStrategistDashboard
 * React Query hooks for the Digital Strategist dashboard.
 *
 * Sections:
 *  1. Social Platform KPIs    — content_items grouped by platform + social intel sentiment
 *  2. Content Calendar        — this week Mon–Sun content items per day
 *  3. Platform Reach Trend    — last 14 days content published/scheduled by platform
 */
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { supabase } from '@/lib/supabase';

const REFETCH = 30_000;

/* ─────────────────────────────────────────────
   1. Social Platform KPIs
───────────────────────────────────────────── */

export interface PlatformKPI {
  platform: string;
  total_published: number;
  scheduled_count: number;
  avg_sentiment: number | null;
  recent_items: number;  // last 7 days
}

export function useSocialPlatformKPIs() {
  return useQuery<PlatformKPI[]>({
    queryKey: ['ds-platform-kpis'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const d7ago = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      const [contentRes, intelRes] = await Promise.all([
        supabase
          .from('content_items')
          .select('platform, status, published_date, scheduled_date')
          .not('platform', 'is', null),
        supabase
          .from('intel_items')
          .select('platform, sentiment_score')
          .eq('source_type', 'social')
          .not('platform', 'is', null)
          .not('sentiment_score', 'is', null),
      ]);
      if (contentRes.error) throw contentRes.error;
      if (intelRes.error) throw intelRes.error;

      // Group content by platform
      type ContentBucket = { published: number; scheduled: number; recent: number };
      const contentMap: Record<string, ContentBucket> = {};
      for (const c of contentRes.data ?? []) {
        const p = c.platform ?? 'unknown';
        if (!contentMap[p]) contentMap[p] = { published: 0, scheduled: 0, recent: 0 };
        if (c.status === 'published') contentMap[p].published++;
        if (c.status === 'scheduled') contentMap[p].scheduled++;
        const refDate = c.published_date ?? c.scheduled_date;
        if (refDate && refDate >= d7ago) contentMap[p].recent++;
      }

      // Group sentiment by platform
      type SentBucket = { scores: number[] };
      const sentMap: Record<string, SentBucket> = {};
      for (const i of intelRes.data ?? []) {
        const p = i.platform ?? 'unknown';
        if (!sentMap[p]) sentMap[p] = { scores: [] };
        if (i.sentiment_score !== null) sentMap[p].scores.push(i.sentiment_score);
      }

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      const allPlatforms = new Set([
        ...Object.keys(contentMap),
        ...Object.keys(sentMap),
      ]);

      return Array.from(allPlatforms).map(platform => ({
        platform,
        total_published: contentMap[platform]?.published ?? 0,
        scheduled_count: contentMap[platform]?.scheduled ?? 0,
        avg_sentiment: avg(sentMap[platform]?.scores ?? []),
        recent_items: contentMap[platform]?.recent ?? 0,
      })).sort((a, b) => b.total_published - a.total_published);
    },
  });
}

/* ─────────────────────────────────────────────
   2. Content Calendar (this week)
───────────────────────────────────────────── */

export interface CalendarDaySlot extends Record<string, unknown> {
  iso: string;        // 'yyyy-MM-dd'
  label: string;      // 'Mon 3 Mar'
  items: ContentCalendarItem[];
}

export interface ContentCalendarItem {
  id: string;
  title: string;
  platform: string | null;
  status: string;
  engagement_title: string;
}

export function useContentCalendar() {
  return useQuery<CalendarDaySlot[]>({
    queryKey: ['ds-content-calendar'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd   = endOfWeek(new Date(), { weekStartsOn: 1 });
      const startStr  = format(weekStart, 'yyyy-MM-dd');
      const endStr    = format(weekEnd,   'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('content_items')
        .select('id, title, platform, status, scheduled_date, published_date, engagement_id')
        .or(`scheduled_date.gte.${startStr},published_date.gte.${startStr}`)
        .or(`scheduled_date.lte.${endStr},published_date.lte.${endStr}`)
        .neq('status', 'archived')
        .order('scheduled_date');
      if (error) throw error;

      const engIds = [...new Set((data ?? []).map(c => c.engagement_id))];
      const { data: engs } = engIds.length
        ? await supabase.from('engagements').select('id, title').in('id', engIds)
        : { data: [] };
      const engMap = new Map((engs ?? []).map(e => [e.id, e.title]));

      // Build 7-day skeleton
      const slots: CalendarDaySlot[] = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return {
          iso: format(d, 'yyyy-MM-dd'),
          label: format(d, 'EEE d MMM'),
          items: [],
        };
      });

      const slotMap = new Map(slots.map(s => [s.iso, s]));

      for (const c of data ?? []) {
        const date = c.scheduled_date ?? c.published_date;
        if (!date) continue;
        const slot = slotMap.get(date);
        if (!slot) continue;
        slot.items.push({
          id: c.id,
          title: c.title,
          platform: c.platform,
          status: c.status,
          engagement_title: engMap.get(c.engagement_id) ?? '—',
        });
      }

      return slots;
    },
  });
}

/* ─────────────────────────────────────────────
   3. Platform Reach Trend (last 14 days)
───────────────────────────────────────────── */

export interface PlatformTrendDatum {
  date: string;     // 'dd MMM'  e.g. '01 Mar'
  [platform: string]: number | string;  // dynamic keys per platform
}

export function usePlatformTrend() {
  return useQuery<PlatformTrendDatum[]>({
    queryKey: ['ds-platform-trend'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const now   = new Date();
      const d14ago = format(subDays(now, 13), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('content_items')
        .select('platform, scheduled_date, published_date, status')
        .or(`scheduled_date.gte.${d14ago},published_date.gte.${d14ago}`)
        .in('status', ['published', 'scheduled'])
        .not('platform', 'is', null);
      if (error) throw error;

      // Collect all platforms
      const platformSet = new Set<string>();
      for (const c of data ?? []) if (c.platform) platformSet.add(c.platform);
      const platforms = Array.from(platformSet);

      // Build 14-day skeleton
      const days: PlatformTrendDatum[] = Array.from({ length: 14 }, (_, i) => {
        const d = subDays(now, 13 - i);
        const datum: PlatformTrendDatum = { date: format(d, 'dd MMM'), _iso: format(d, 'yyyy-MM-dd') };
        for (const p of platforms) datum[p] = 0;
        return datum;
      });

      const dayMap = new Map(days.map(d => [d._iso as string, d]));

      for (const c of data ?? []) {
        const date = c.published_date ?? c.scheduled_date;
        if (!date || !c.platform) continue;
        const bucket = dayMap.get(date);
        if (!bucket) continue;
        (bucket[c.platform] as number) = ((bucket[c.platform] as number) || 0) + 1;
      }

      // Strip internal _iso key
      return days.map(({ _iso: _ignored, ...rest }) => rest as PlatformTrendDatum);
    },
  });
}
