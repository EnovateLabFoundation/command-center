/**
 * usePowerMap
 *
 * React Query hooks for the Power & Stakeholder Intelligence Map module.
 * Provides full CRUD for the `stakeholders` table scoped to a single engagement.
 *
 * Exports:
 *  useStakeholderList  — all stakeholders for an engagement
 *  useAddStakeholder   — create mutation
 *  useUpdateStakeholder — update mutation
 *  useDeleteStakeholder — delete mutation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Enums & labels
───────────────────────────────────────────── */

export type StakeholderAlignment = 'hostile' | 'neutral' | 'supportive' | 'champion';
export type StakeholderCategory  = 'government' | 'media' | 'civil_society' | 'business' | 'traditional' | 'international' | 'political_party';
export type StrategicPriority    = 'critical' | 'high' | 'medium' | 'low';

export const ALIGNMENT_LABELS: Record<StakeholderAlignment, string> = {
  hostile:    'Hostile',
  neutral:    'Neutral',
  supportive: 'Supportive',
  champion:   'Champion',
};

export const CATEGORY_LABELS: Record<StakeholderCategory, string> = {
  government:     'Government',
  media:          'Media',
  civil_society:  'Civil Society',
  business:       'Business',
  traditional:    'Traditional',
  international:  'International',
  political_party:'Political Party',
};

export const PRIORITY_LABELS: Record<StrategicPriority, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
};

export const ENGAGEMENT_STRATEGY_OPTIONS = [
  'Regular briefings',
  'Coalition building',
  'Media coordination',
  'Direct lobbying',
  'Soft engagement',
  'Monitoring only',
  'Avoid contact',
] as const;

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface StakeholderRow extends Record<string, unknown> {
  id:                   string;
  engagement_id:        string;
  name:                 string;
  role_position:        string | null;
  category:             StakeholderCategory;
  alignment:            StakeholderAlignment | null;
  influence_score:      number | null;
  strategic_priority:   StrategicPriority | null;
  relationship_owner_id: string | null;
  last_contact_date:    string | null;
  contact_frequency:    string | null;
  risk_level:           string | null;
  lat:                  number | null;
  lng:                  number | null;
  state:                string | null;
  senatorial_district:  string | null;
  geopolitical_zone:    string | null;
  lga:                  string | null;
  ward:                 string | null;
  strategic_notes:      string | null;
  engagement_strategy:  string | null;
  created_by:           string;
  created_at:           string;
  updated_at:           string;
  updated_by:           string | null;
  // joined
  owner_name?:          string | null;
}

export type StakeholderInsert = Omit<StakeholderRow,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'owner_name'
>;

export type StakeholderUpdate = Partial<Omit<StakeholderInsert, 'engagement_id'>>;

/* ─────────────────────────────────────────────
   Query key factory
───────────────────────────────────────────── */

export const stakeholderKeys = {
  all:  (engagementId: string) => ['stakeholders', engagementId] as const,
};

/* ─────────────────────────────────────────────
   useStakeholderList
───────────────────────────────────────────── */

export function useStakeholderList(engagementId: string | undefined) {
  return useQuery<StakeholderRow[]>({
    queryKey: stakeholderKeys.all(engagementId ?? ''),
    enabled:  !!engagementId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stakeholders')
        .select(`
          *,
          profiles!stakeholders_relationship_owner_id_fkey(full_name)
        `)
        .eq('engagement_id', engagementId!)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback without join if FK alias fails
        const { data: fallback, error: err2 } = await supabase
          .from('stakeholders')
          .select('*')
          .eq('engagement_id', engagementId!)
          .order('created_at', { ascending: false });
        if (err2) throw new Error(err2.message);
        return (fallback ?? []) as StakeholderRow[];
      }

      // Flatten joined profile name
      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        owner_name: (row.profiles as { full_name?: string } | null)?.full_name ?? null,
      })) as StakeholderRow[];
    },
  });
}

/* ─────────────────────────────────────────────
   useAddStakeholder
───────────────────────────────────────────── */

export function useAddStakeholder(engagementId: string) {
  const qc     = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (values: StakeholderUpdate & { name: string; category: StakeholderCategory }) => {
      const { data, error } = await supabase
        .from('stakeholders')
        .insert({
          ...values,
          engagement_id: engagementId,
          created_by:    user?.id ?? '',
          updated_by:    user?.id ?? '',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: stakeholderKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useUpdateStakeholder
───────────────────────────────────────────── */

export function useUpdateStakeholder(engagementId: string) {
  const qc     = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...values }: StakeholderUpdate & { id: string }) => {
      const { error } = await supabase
        .from('stakeholders')
        .update({ ...values, updated_by: user?.id ?? '' })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: stakeholderKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useDeleteStakeholder
───────────────────────────────────────────── */

export function useDeleteStakeholder(engagementId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stakeholders')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: stakeholderKeys.all(engagementId) }),
  });
}
