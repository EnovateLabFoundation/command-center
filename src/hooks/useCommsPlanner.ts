/**
 * useCommsPlanner
 *
 * React Query hooks for the Governance Communications Planner module.
 * Full CRUD on `comms_initiatives` table, plus KPI calculations
 * and audience coverage analysis against narrative_audience_matrix.
 *
 * Exports:
 *  useInitiativeList      — all initiatives for an engagement
 *  useAddInitiative       — create mutation
 *  useUpdateInitiative    — update mutation
 *  useDeleteInitiative    — delete mutation
 *  useAudienceCoverage    — cross-reference with narrative_audience_matrix
 *  useCommsKPIs           — computed KPI strip values
 *  CHANNEL_OPTIONS        — channel dropdown values
 *  STATUS_CONFIG          — status display config
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { format, isBefore, startOfDay } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type InitiativeStatus = Database['public']['Enums']['initiative_status'];

export interface Initiative extends Record<string, unknown> {
  id: string;
  engagement_id: string;
  policy_area: string | null;
  communication_phase: string | null;
  target_audience: string | null;
  key_message: string | null;
  primary_channel: string | null;
  responsible_id: string | null;
  launch_date: string | null;
  status: InitiativeStatus;
  success_metric: string | null;
  actual_result: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  /** Computed display status — 'overdue' if past launch date and not complete */
  displayStatus: string;
}

export type InitiativeInsert = Omit<Initiative, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'displayStatus'>;
export type InitiativeUpdate = Partial<Omit<InitiativeInsert, 'engagement_id'>> & { id: string };

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

export const CHANNEL_OPTIONS = [
  'TV', 'Radio', 'Print', 'Digital', 'Social Media',
  'Events', 'WhatsApp', 'Direct', 'Email', 'Other',
] as const;

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-muted text-muted-foreground border-border' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  complete:    { label: 'Complete',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  overdue:     { label: 'Overdue',      color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export const PHASE_OPTIONS = [
  'Pre-Launch', 'Launch', 'Sustain', 'Evaluate', 'Close',
] as const;

/* ─────────────────────────────────────────────
   Query keys
───────────────────────────────────────────── */

export const initiativeKeys = {
  all: (engagementId: string) => ['comms-initiatives', engagementId] as const,
  audience: (engagementId: string) => ['audience-coverage', engagementId] as const,
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

/** Compute display status: overdue if past launch date and not complete */
function computeDisplayStatus(status: InitiativeStatus, launchDate: string | null): string {
  if ((status as string) === 'complete') return 'complete';
  if (launchDate && isBefore(new Date(launchDate), startOfDay(new Date())) && status !== 'complete') {
    return 'overdue';
  }
  return status;
}

/* ─────────────────────────────────────────────
   useInitiativeList
───────────────────────────────────────────── */

export function useInitiativeList(engagementId: string | undefined) {
  return useQuery<Initiative[]>({
    queryKey: initiativeKeys.all(engagementId ?? ''),
    enabled: !!engagementId,
    staleTime: 15_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comms_initiatives')
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('launch_date', { ascending: true, nullsFirst: false });

      if (error) throw new Error(error.message);
      return (data ?? []).map((d) => ({
        ...d,
        displayStatus: computeDisplayStatus(d.status, d.launch_date),
      })) as Initiative[];
    },
  });
}

/* ─────────────────────────────────────────────
   useAddInitiative
───────────────────────────────────────────── */

export function useAddInitiative(engagementId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (values: Omit<InitiativeInsert, 'engagement_id'>) => {
      const { data, error } = await supabase
        .from('comms_initiatives')
        .insert({
          ...values,
          engagement_id: engagementId,
          created_by: user?.id ?? '',
        } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: initiativeKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useUpdateInitiative
───────────────────────────────────────────── */

export function useUpdateInitiative(engagementId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...values }: InitiativeUpdate) => {
      const { error } = await supabase
        .from('comms_initiatives')
        .update({ ...values, updated_by: user?.id ?? '' } as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: initiativeKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useDeleteInitiative
───────────────────────────────────────────── */

export function useDeleteInitiative(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comms_initiatives').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: initiativeKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useAudienceCoverage
   Cross-references initiative audiences with
   narrative_audience_matrix segments.
───────────────────────────────────────────── */

export interface AudienceCoverageItem {
  segment: string;
  /** 'covered' = in active initiatives, 'gap' = in matrix but not covered, 'undefined' = in initiatives but not in matrix */
  status: 'covered' | 'gap' | 'undefined';
}

export function useAudienceCoverage(engagementId: string | undefined) {
  return useQuery<AudienceCoverageItem[]>({
    queryKey: initiativeKeys.audience(engagementId ?? ''),
    enabled: !!engagementId,
    staleTime: 30_000,
    queryFn: async () => {
      // Get active initiative audiences
      const { data: initiatives } = await supabase
        .from('comms_initiatives')
        .select('target_audience')
        .eq('engagement_id', engagementId!)
        .in('status', ['not_started', 'in_progress']);

      // Get narrative_audience_matrix segments via narrative_platform
      const { data: platforms } = await supabase
        .from('narrative_platform')
        .select('id')
        .eq('engagement_id', engagementId!);

      let matrixSegments: string[] = [];
      if (platforms?.length) {
        const platformIds = platforms.map(p => p.id);
        const { data: matrix } = await supabase
          .from('narrative_audience_matrix')
          .select('audience_segment')
          .in('narrative_platform_id', platformIds);
        matrixSegments = (matrix ?? []).map(m => m.audience_segment).filter(Boolean);
      }

      const initiativeAudiences = new Set(
        (initiatives ?? [])
          .map(i => i.target_audience?.trim())
          .filter(Boolean) as string[]
      );
      const matrixSet = new Set(matrixSegments.map(s => s.trim()));

      const result: AudienceCoverageItem[] = [];

      // Covered: in both initiatives and matrix
      // Undefined: in initiatives but not in matrix
      for (const seg of initiativeAudiences) {
        result.push({
          segment: seg,
          status: matrixSet.has(seg) ? 'covered' : 'undefined',
        });
      }

      // Gaps: in matrix but not in initiatives
      for (const seg of matrixSet) {
        if (!initiativeAudiences.has(seg)) {
          result.push({ segment: seg, status: 'gap' });
        }
      }

      return result;
    },
  });
}

/* ─────────────────────────────────────────────
   useResponsibleUsers
   Fetch comms_director and digital_strategist users
───────────────────────────────────────────── */

export interface ResponsibleUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export function useResponsibleUsers() {
  return useQuery<ResponsibleUser[]>({
    queryKey: ['responsible-users-comms'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data: roleAssignments } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['comms_director', 'digital_strategist']);

      if (!roleAssignments?.length) return [];
      const userIds = [...new Set(roleAssignments.map(r => r.user_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)
        .eq('is_active', true);

      return (profiles ?? []) as ResponsibleUser[];
    },
  });
}
