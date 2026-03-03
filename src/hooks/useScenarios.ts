/**
 * useScenarios
 *
 * React Query hooks for the Scenario Planning Matrix module.
 * Full CRUD on `scenarios` table, plus trigger/resolve workflows
 * with audit logging.
 *
 * Exports:
 *  useScenarioList     — all scenarios for an engagement
 *  useAddScenario      — create mutation
 *  useUpdateScenario   — update mutation
 *  useDeleteScenario   — delete mutation
 *  useTriggerScenario  — trigger workflow (status → triggered + audit log)
 *  useResolveScenario  — resolve workflow (status → resolved)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createNotification } from '@/hooks/useNotifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/integrations/supabase/types';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type ScenarioProbability = Database['public']['Enums']['scenario_probability'];
export type ScenarioStatus = Database['public']['Enums']['scenario_status'];

export interface Scenario extends Record<string, unknown> {
  id: string;
  engagement_id: string;
  name: string;
  key_driver: string | null;
  probability: ScenarioProbability | null;
  impact_score: number | null;
  time_horizon_months: number | null;
  status: ScenarioStatus;
  strategic_response: string | null;
  key_risks: string | null;
  key_opportunities: string | null;
  trigger_events: string[];
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ScenarioInsert = Omit<Scenario, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type ScenarioUpdate = Partial<Omit<ScenarioInsert, 'engagement_id'>> & { id: string };

/* ─────────────────────────────────────────────
   Query keys
───────────────────────────────────────────── */

export const scenarioKeys = {
  all: (engagementId: string) => ['scenarios', engagementId] as const,
};

/* ─────────────────────────────────────────────
   Colour / label helpers
───────────────────────────────────────────── */

export const PROBABILITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  medium: { label: 'Medium', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  high:   { label: 'High',   color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  watching:  { label: 'Watching',  color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  triggered: { label: 'Triggered', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  resolved:  { label: 'Resolved',  color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

/* ─────────────────────────────────────────────
   useScenarioList
───────────────────────────────────────────── */

export function useScenarioList(engagementId: string | undefined) {
  return useQuery<Scenario[]>({
    queryKey: scenarioKeys.all(engagementId ?? ''),
    enabled: !!engagementId,
    staleTime: 15_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []).map((d) => ({
        ...d,
        trigger_events: Array.isArray(d.trigger_events) ? d.trigger_events as string[] : [],
      })) as Scenario[];
    },
  });
}

/* ─────────────────────────────────────────────
   useAddScenario
───────────────────────────────────────────── */

export function useAddScenario(engagementId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (values: Omit<ScenarioInsert, 'engagement_id'>) => {
      const { data, error } = await supabase
        .from('scenarios')
        .insert({
          ...values,
          engagement_id: engagementId,
          created_by: user?.id ?? '',
          trigger_events: values.trigger_events ?? [],
        } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: scenarioKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useUpdateScenario
───────────────────────────────────────────── */

export function useUpdateScenario(engagementId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...values }: ScenarioUpdate) => {
      const { error } = await supabase
        .from('scenarios')
        .update({ ...values, updated_by: user?.id ?? '' } as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: scenarioKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useDeleteScenario
───────────────────────────────────────────── */

export function useDeleteScenario(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scenarios').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: scenarioKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useTriggerScenario
   Sets status → 'triggered', writes audit log,
   and creates notification for lead_advisor.
───────────────────────────────────────────── */

export function useTriggerScenario(engagementId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      // 1. Update status
      const { error } = await supabase
        .from('scenarios')
        .update({ status: 'triggered', updated_by: user?.id ?? '' } as any)
        .eq('id', id);
      if (error) throw new Error(error.message);

      // 2. Audit log
      try {
        await (supabase.from('audit_logs').insert as any)({
          user_id: user?.id ?? '',
          action: 'update',
          table_name: 'scenarios',
          record_id: id,
          new_values: { status: 'triggered', scenario_name: name },
        });
      } catch { /* non-blocking */ }

      // 3. Notification for lead advisor
      const { data: eng } = await supabase
        .from('engagements')
        .select('lead_advisor_id')
        .eq('id', engagementId)
        .maybeSingle();

      if (eng?.lead_advisor_id) {
        await createNotification({
          user_id:       eng.lead_advisor_id,
          engagement_id: engagementId,
          type:          'scenario',
          title:         `Scenario Triggered: ${name}`,
          body:          `Scenario "${name}" has been triggered and requires immediate attention.`,
          link_to:       `/engagements/${engagementId}/scenarios`,
          created_by:    user?.id,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: scenarioKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useResolveScenario
───────────────────────────────────────────── */

export function useResolveScenario(engagementId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scenarios')
        .update({ status: 'resolved', updated_by: user?.id ?? '' } as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: scenarioKeys.all(engagementId) }),
  });
}
