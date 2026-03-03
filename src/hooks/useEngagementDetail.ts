/**
 * useEngagementDetail  — full engagement row joined with client name + lead-advisor name
 * useLeadAdvisors      — active profiles holding the lead_advisor role
 * useQualifiedClients  — clients with qualification_status = 'qualified'
 * useCreateEngagement  — mutation: INSERT engagements + scope_notes audit log
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface EngagementDetail {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'closed';
  phase: '1' | '2' | '3' | '4';
  health_rag: 'red' | 'amber' | 'green' | null;
  start_date: string | null;
  end_date: string | null;
  fee_amount: number | null;
  billing_status: string | null;
  lead_advisor_id: string | null;
  lead_advisor_name: string | null;
  client_id: string;
  client_name: string;
  client_type: string;
  created_at: string;
  created_by: string;
}

export interface LeadAdvisorOption {
  id: string;
  full_name: string;
  email: string;
}

export interface QualifiedClientOption {
  id: string;
  name: string;
  type: string;
}

/* ─────────────────────────────────────────────
   Hooks
───────────────────────────────────────────── */

/** Full engagement detail with joined client + lead-advisor name */
export function useEngagementDetail(engagementId: string | undefined) {
  return useQuery<EngagementDetail>({
    queryKey: ['engagement-detail', engagementId],
    enabled: !!engagementId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagements')
        .select(`
          id, title, status, phase, health_rag,
          start_date, end_date, fee_amount, billing_status,
          lead_advisor_id, client_id, created_at, created_by,
          clients ( name, type )
        `)
        .eq('id', engagementId!)
        .single();

      if (error) throw error;

      // Fetch lead advisor name separately (no direct FK from engagements to profiles)
      let leadAdvisorName: string | null = null;
      if ((data as any).lead_advisor_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', (data as any).lead_advisor_id)
          .maybeSingle();
        leadAdvisorName = profile?.full_name ?? null;
      }

      const raw = data as any;

      return {
        id: raw.id,
        title: raw.title,
        status: raw.status as EngagementDetail['status'],
        phase: raw.phase as EngagementDetail['phase'],
        health_rag: raw.health_rag as EngagementDetail['health_rag'],
        start_date: raw.start_date,
        end_date: raw.end_date,
        fee_amount: raw.fee_amount,
        billing_status: raw.billing_status,
        lead_advisor_id: raw.lead_advisor_id,
        lead_advisor_name: leadAdvisorName,
        client_id: raw.client_id,
        client_name: raw.clients?.name ?? '—',
        client_type: raw.clients?.type ?? '—',
        created_at: raw.created_at,
        created_by: raw.created_by,
      };
    },
  });
}

/** All active users who hold the lead_advisor role (via user_roles JOIN profiles) */
export function useLeadAdvisors() {
  return useQuery<LeadAdvisorOption[]>({
    queryKey: ['lead-advisors'],
    staleTime: 60_000,
    queryFn: async () => {
      // Get user_ids with lead_advisor role
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'lead_advisor');

      if (error) throw error;
      if (!roleData?.length) return [];

      const userIds = roleData.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active')
        .in('id', userIds)
        .eq('is_active', true);

      return (profiles ?? []).map(({ id, full_name, email }) => ({ id, full_name, email }));
    },
  });
}

/** Qualified & active clients — eligible to have a new engagement created */
export function useQualifiedClients() {
  return useQuery<QualifiedClientOption[]>({
    queryKey: ['qualified-clients'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, type')
        .eq('qualification_status', 'qualified')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data ?? []) as QualifiedClientOption[];
    },
  });
}

/** INSERT a new engagement row (+ optional scope_notes to audit_logs) */
export function useCreateEngagement() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      client_id: string;
      lead_advisor_id: string | null;
      start_date: string | null;
      fee_amount: number | null;
      scope_notes: string;
    }) => {
      const { data, error } = await supabase
        .from('engagements')
        .insert({
          title: input.title,
          client_id: input.client_id,
          lead_advisor_id: input.lead_advisor_id || null,
          start_date: input.start_date || null,
          fee_amount: input.fee_amount ? Number(input.fee_amount) : null,
          status: 'active',
          phase: '1',
          health_rag: 'green',
          created_by: user!.id,
        })
        .select('id, title')
        .single();

      if (error) throw error;

      // Scope notes are not a DB column — persist to audit_logs
      if (input.scope_notes?.trim()) {
        await supabase.from('audit_logs').insert({
          action: 'create',
          table_name: 'engagements',
          record_id: (data as { id: string }).id,
          user_id: user!.id,
          new_values: { scope_notes: input.scope_notes },
        });
      }

      return data as { id: string; title: string };
    },
    onSuccess: () => {
      // Refresh the context list and any engagement queries
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['engagement-detail'] });
    },
  });
}
