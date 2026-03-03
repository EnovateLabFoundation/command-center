/**
 * useNarrative
 *
 * Data hooks for the Narrative Architecture Matrix module.
 * Manages narrative_platform CRUD, version history, approval workflow,
 * and narrative_audience_matrix rows.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

/* ── Types ──────────────────────────────────── */

export type NarrativePlatform = Tables<'narrative_platform'>;
export type AudienceRow = Tables<'narrative_audience_matrix'>;

/* ── Query keys ─────────────────────────────── */

const KEYS = {
  platforms: (engagementId: string) => ['narrative-platforms', engagementId] as const,
  audiences: (platformId: string) => ['narrative-audiences', platformId] as const,
};

/* ── Narrative platform (versions) ─────────── */

/**
 * Fetches all narrative_platform versions for an engagement, ordered by version desc.
 * The first item is the current/latest version.
 */
export function useNarrativePlatforms(engagementId: string | undefined) {
  return useQuery({
    queryKey: KEYS.platforms(engagementId ?? ''),
    queryFn: async () => {
      if (!engagementId) return [];
      const { data, error } = await supabase
        .from('narrative_platform')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('version', { ascending: false });
      if (error) throw error;
      return (data ?? []) as NarrativePlatform[];
    },
    enabled: !!engagementId,
  });
}

/* ── Create initial platform ───────────────── */

export function useCreateNarrative(engagementId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: Partial<TablesInsert<'narrative_platform'>>) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('narrative_platform')
        .insert({
          engagement_id: engagementId,
          created_by: userId,
          version: 1,
          ...input,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as NarrativePlatform;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.platforms(engagementId) });
    },
  });
}

/* ── Update (save draft) ───────────────────── */

export function useUpdateNarrative(engagementId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<NarrativePlatform> & { id: string }) => {
      const { error } = await supabase
        .from('narrative_platform')
        .update({ ...fields, updated_by: userId } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.platforms(engagementId) });
    },
  });
}

/* ── Approve & lock ────────────────────────── */

export function useApproveNarrative(engagementId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('narrative_platform')
        .update({
          is_approved: true,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_by: userId,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.platforms(engagementId) });
    },
  });
}

/* ── Create new version (clone current) ────── */

export function useNewVersion(engagementId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (current: NarrativePlatform) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('narrative_platform')
        .insert({
          engagement_id: engagementId,
          created_by: userId,
          version: current.version + 1,
          master_narrative: current.master_narrative,
          defining_purpose: current.defining_purpose,
          leadership_promise: current.leadership_promise,
          core_values_in_action: current.core_values_in_action,
          voice_tone_guide: current.voice_tone_guide,
          what_we_never_say: current.what_we_never_say,
          crisis_anchor_message: current.crisis_anchor_message,
          is_approved: false,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as NarrativePlatform;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.platforms(engagementId) });
    },
  });
}

/* ── Audience matrix ───────────────────────── */

export function useAudienceMatrix(platformId: string | undefined) {
  return useQuery({
    queryKey: KEYS.audiences(platformId ?? ''),
    queryFn: async () => {
      if (!platformId) return [];
      const { data, error } = await supabase
        .from('narrative_audience_matrix')
        .select('*')
        .eq('narrative_platform_id', platformId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AudienceRow[];
    },
    enabled: !!platformId,
  });
}

export function useCreateAudience(platformId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: Partial<TablesInsert<'narrative_audience_matrix'>>) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('narrative_audience_matrix')
        .insert({
          narrative_platform_id: platformId,
          created_by: userId,
          ...input,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as AudienceRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.audiences(platformId) });
    },
  });
}

export function useUpdateAudience(platformId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<AudienceRow> & { id: string }) => {
      const { error } = await supabase
        .from('narrative_audience_matrix')
        .update({ ...fields, updated_by: userId } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.audiences(platformId) });
    },
  });
}

export function useDeleteAudience(platformId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('narrative_audience_matrix')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.audiences(platformId) });
    },
  });
}
