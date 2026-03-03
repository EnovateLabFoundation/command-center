/**
 * useMediaMonitoring
 *
 * Data hooks for the Media Monitoring Hub sub-tab within Intel Tracker.
 * Manages the live feed, keyword monitoring config, and realtime subscriptions.
 *
 * Feed items come from intel_items; keyword configs are stored in
 * integration_configs with platform_name = 'keyword_monitor'.
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Tables } from '@/integrations/supabase/types';

/* ── Types ──────────────────────────────────── */

export type IntelFeedItem = Tables<'intel_items'>;

export interface MonitoringKeyword {
  id: string;
  keyword: string;
  platforms: string[];
  created_by: string;
  created_at: string;
}

export type PlatformFilter = 'all' | 'print' | 'digital' | 'broadcast' | 'social';
export type SentimentFilter = 'all' | 'negative' | 'positive' | 'urgent';
export type DateFilter = 'today' | '3days' | '7days';

/* ── Query keys ─────────────────────────────── */

const KEYS = {
  feed: (engagementId: string) => ['monitoring-feed', engagementId] as const,
  keywords: (engagementId: string) => ['monitoring-keywords', engagementId] as const,
};

/* ── Date helpers ───────────────────────────── */

function getDateCutoff(filter: DateFilter): string {
  const d = new Date();
  if (filter === '3days') d.setDate(d.getDate() - 3);
  else if (filter === '7days') d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

/* ── Live feed hook ─────────────────────────── */

export function useMonitoringFeed(engagementId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.feed(engagementId ?? ''),
    queryFn: async () => {
      if (!engagementId) return [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('intel_items')
        .select('*')
        .eq('engagement_id', engagementId)
        .gte('date_logged', sevenDaysAgo.toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as IntelFeedItem[];
    },
    enabled: !!engagementId,
    refetchInterval: 120_000, // 2 minute polling fallback
  });

  /* Supabase Realtime subscription for new inserts */
  useEffect(() => {
    if (!engagementId) return;

    const channel = supabase
      .channel(`monitoring-${engagementId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intel_items',
          filter: `engagement_id=eq.${engagementId}`,
        },
        (payload) => {
          // Invalidate feed to pick up new item
          queryClient.invalidateQueries({ queryKey: KEYS.feed(engagementId) });

          // If urgent, trigger callback (handled at component level)
          const newItem = payload.new as IntelFeedItem;
          if (newItem.is_urgent) {
            window.dispatchEvent(
              new CustomEvent('urgent-intel', { detail: newItem }),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [engagementId, queryClient]);

  return query;
}

/* ── Dismiss item (soft-delete via action_status) ── */

export function useDismissItem(engagementId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('intel_items')
        .update({
          action_status: 'monitor_only' as const,
          updated_by: userId,
        } as any)
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.feed(engagementId) });
    },
  });
}

/* ── Keyword monitoring config ─────────────── */

export function useMonitoringKeywords(engagementId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: KEYS.keywords(engagementId ?? ''),
    queryFn: async () => {
      if (!engagementId) return [];
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .eq('platform_name', 'keyword_monitor')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Parse config JSON to extract keywords for this engagement
      return (data ?? [])
        .filter((c: any) => {
          const cfg = c.config as any;
          return cfg?.engagement_id === engagementId;
        })
        .map((c: any): MonitoringKeyword => ({
          id: c.id,
          keyword: (c.config as any)?.keyword ?? '',
          platforms: (c.config as any)?.platforms ?? [],
          created_by: c.created_by,
          created_at: c.created_at,
        }));
    },
    enabled: !!engagementId,
  });

  const addKeyword = useMutation({
    mutationFn: async (input: { keyword: string; platforms: string[] }) => {
      if (!engagementId || !userId) throw new Error('Missing context');
      const { error } = await supabase
        .from('integration_configs')
        .insert({
          platform_name: 'keyword_monitor',
          created_by: userId,
          is_active: true,
          config: {
            engagement_id: engagementId,
            keyword: input.keyword,
            platforms: input.platforms,
          },
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.keywords(engagementId ?? '') });
    },
  });

  const deleteKeyword = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integration_configs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.keywords(engagementId ?? '') });
    },
  });

  return { keywords: query.data ?? [], isLoading: query.isLoading, addKeyword, deleteKeyword };
}

/* ── Filter helpers ─────────────────────────── */

export function filterFeedItems(
  items: IntelFeedItem[],
  platformFilter: PlatformFilter[],
  sentimentFilter: SentimentFilter,
  dateFilter: DateFilter,
): IntelFeedItem[] {
  const cutoff = getDateCutoff(dateFilter);

  return items.filter((item) => {
    // Date filter
    if (item.date_logged < cutoff) return false;

    // Platform filter
    if (platformFilter.length > 0 && !platformFilter.includes('all')) {
      if (!item.source_type || !platformFilter.includes(item.source_type as PlatformFilter)) {
        return false;
      }
    }

    // Sentiment filter
    if (sentimentFilter !== 'all') {
      const score = Number(item.sentiment_score ?? 0);
      if (sentimentFilter === 'negative' && score >= 0) return false;
      if (sentimentFilter === 'positive' && score <= 0) return false;
      if (sentimentFilter === 'urgent' && !item.is_urgent) return false;
    }

    return true;
  });
}

/* ── Analytics helpers ──────────────────────── */

/** Volume by hour for today's items */
export function volumeByHour(items: IntelFeedItem[]): Array<{ hour: string; count: number }> {
  const today = new Date().toISOString().split('T')[0];
  const hourCounts = new Map<number, number>();

  for (let h = 6; h <= 23; h++) hourCounts.set(h, 0);

  for (const item of items) {
    if (item.date_logged !== today) continue;
    const hour = new Date(item.created_at).getHours();
    if (hour >= 6 && hour <= 23) {
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }
  }

  return Array.from(hourCounts.entries()).map(([h, count]) => ({
    hour: `${h.toString().padStart(2, '0')}:00`,
    count,
  }));
}

/** Top trending themes in last 24h */
export function trendingThemes(items: IntelFeedItem[]): Array<{ theme: string; count: number }> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const cutoff = oneDayAgo.toISOString().split('T')[0];

  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.date_logged < cutoff || !item.narrative_theme) continue;
    counts.set(item.narrative_theme, (counts.get(item.narrative_theme) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}
