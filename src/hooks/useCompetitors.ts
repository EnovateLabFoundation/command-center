/**
 * useCompetitors
 *
 * Data hook for the Competitor Intelligence Profiler module.
 * Handles CRUD operations on the `competitor_profiles` table
 * scoped to a specific engagement.
 *
 * Provides:
 *   - List of all competitors for an engagement
 *   - Single competitor fetch
 *   - Create / update / delete mutations
 *   - Related intel items mentioning a competitor (activity log)
 *
 * @example
 * const { competitors, isLoading, createCompetitor } = useCompetitors(engagementId);
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type CompetitorProfile = Tables<'competitor_profiles'>;
export type CompetitorInsert = TablesInsert<'competitor_profiles'>;
export type CompetitorUpdate = TablesUpdate<'competitor_profiles'>;

/* ── Keys ────────────────────────────────────────────────────── */
const KEYS = {
  list: (engagementId: string) => ['competitors', engagementId] as const,
  detail: (id: string) => ['competitor', id] as const,
  activity: (competitorName: string, engagementId: string) =>
    ['competitor-activity', competitorName, engagementId] as const,
};

/* ── Hook ─────────────────────────────────────────────────────── */
export function useCompetitors(engagementId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  /* Fetch all competitors for the engagement */
  const {
    data: competitors = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: KEYS.list(engagementId ?? ''),
    queryFn: async () => {
      if (!engagementId) return [];
      const { data, error } = await supabase
        .from('competitor_profiles')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('threat_score', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as CompetitorProfile[];
    },
    enabled: !!engagementId,
  });

  /* Create competitor */
  const createCompetitor = useMutation({
    mutationFn: async (input: Omit<CompetitorInsert, 'created_by' | 'engagement_id'>) => {
      if (!engagementId || !userId) throw new Error('Missing engagement or user');
      const { data, error } = await supabase
        .from('competitor_profiles')
        .insert({
          ...input,
          engagement_id: engagementId,
          created_by: userId,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as CompetitorProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list(engagementId ?? '') });
    },
  });

  /* Update competitor */
  const updateCompetitor = useMutation({
    mutationFn: async ({ id, ...updates }: CompetitorUpdate & { id: string }) => {
      if (!userId) throw new Error('Missing user');
      const { data, error } = await supabase
        .from('competitor_profiles')
        .update({ ...updates, updated_by: userId } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CompetitorProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEYS.list(engagementId ?? '') });
      queryClient.invalidateQueries({ queryKey: KEYS.detail(data.id) });
    },
  });

  /* Delete competitor */
  const deleteCompetitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competitor_profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list(engagementId ?? '') });
    },
  });

  return {
    competitors,
    isLoading,
    error,
    createCompetitor,
    updateCompetitor,
    deleteCompetitor,
  };
}

/**
 * Fetch intel items that mention a competitor by name.
 * Used for the Recent Activity Log section.
 */
export function useCompetitorActivity(competitorName: string, engagementId: string | undefined) {
  return useQuery({
    queryKey: KEYS.activity(competitorName, engagementId ?? ''),
    queryFn: async () => {
      if (!engagementId || !competitorName) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('intel_items')
        .select('*')
        .eq('engagement_id', engagementId)
        .or(`headline.ilike.%${competitorName}%,summary.ilike.%${competitorName}%`)
        .gte('date_logged', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date_logged', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!engagementId && !!competitorName,
  });
}
