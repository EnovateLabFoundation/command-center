/**
 * useCloseOut
 *
 * Data hook for the Engagement Close-Out module. Provides queries for
 * KPIs, archives, and module summaries, plus mutations for the 7-step
 * close-out workflow (archive modules, save lessons, finalise close-out).
 *
 * Note: Uses explicit typing for new tables (engagement_kpis, engagement_archives)
 * that may not yet be reflected in auto-generated Supabase types.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Local types for new tables
───────────────────────────────────────────── */

export interface EngagementKpi {
  id: string;
  engagement_id: string;
  kpi_name: string;
  target_value: string | null;
  actual_value: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
}

export interface EngagementArchive {
  id: string;
  engagement_id: string;
  module_name: string;
  snapshot_data: Record<string, unknown>;
  archived_at: string;
  archived_by: string;
}

/* ─────────────────────────────────────────────
   KPIs
───────────────────────────────────────────── */

export function useEngagementKpis(engagementId: string | undefined) {
  return useQuery({
    queryKey: ['engagement-kpis', engagementId],
    enabled: !!engagementId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('engagement_kpis')
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EngagementKpi[];
    },
  });
}

export function useUpsertKpi() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (kpi: {
      id?: string;
      engagement_id: string;
      kpi_name: string;
      target_value?: string;
      actual_value?: string;
      status?: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (kpi.id) {
        const { data, error } = await (supabase as any)
          .from('engagement_kpis')
          .update({
            kpi_name: kpi.kpi_name || undefined,
            target_value: kpi.target_value,
            actual_value: kpi.actual_value,
            status: kpi.status,
            notes: kpi.notes,
            updated_by: user.id,
          })
          .eq('id', kpi.id)
          .select()
          .single();
        if (error) throw error;
        return data as EngagementKpi;
      }
      const { data, error } = await (supabase as any)
        .from('engagement_kpis')
        .insert({
          engagement_id: kpi.engagement_id,
          kpi_name: kpi.kpi_name,
          target_value: kpi.target_value,
          status: kpi.status || 'pending',
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as EngagementKpi;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['engagement-kpis', vars.engagement_id] });
    },
  });
}

/* ─────────────────────────────────────────────
   Archives
───────────────────────────────────────────── */

export function useEngagementArchives(engagementId: string | undefined) {
  return useQuery({
    queryKey: ['engagement-archives', engagementId],
    enabled: !!engagementId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('engagement_archives')
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('archived_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EngagementArchive[];
    },
  });
}

export function useArchiveModule() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      engagementId,
      moduleName,
      snapshotData,
    }: {
      engagementId: string;
      moduleName: string;
      snapshotData: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('engagement_archives')
        .insert({
          engagement_id: engagementId,
          module_name: moduleName,
          snapshot_data: snapshotData,
          archived_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as EngagementArchive;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['engagement-archives', vars.engagementId] });
    },
  });
}

/* ─────────────────────────────────────────────
   Module summary data for Step 1
───────────────────────────────────────────── */

export function useCloseOutSummary(engagementId: string | undefined) {
  return useQuery({
    queryKey: ['closeout-summary', engagementId],
    enabled: !!engagementId,
    queryFn: async () => {
      const [stakeholders, intel, brandAudit, scenarios, comms] = await Promise.all([
        supabase.from('stakeholders').select('id, name, alignment, influence_score').eq('engagement_id', engagementId!).limit(500),
        supabase.from('intel_items').select('id, sentiment_score, date_logged').eq('engagement_id', engagementId!).order('date_logged', { ascending: false }).limit(500),
        supabase.from('brand_audit').select('*').eq('engagement_id', engagementId!).order('audit_date', { ascending: false }).limit(1),
        supabase.from('scenarios').select('id, name, status, probability').eq('engagement_id', engagementId!),
        supabase.from('comms_initiatives').select('id, status').eq('engagement_id', engagementId!),
      ]);

      const commsData = comms.data ?? [];
      const totalComms = commsData.length;
      const completedComms = commsData.filter((c) => c.status === 'complete').length;

      return {
        stakeholderCount: stakeholders.data?.length ?? 0,
        stakeholders: stakeholders.data ?? [],
        intelItems: intel.data ?? [],
        avgSentiment: intel.data?.length
          ? (intel.data.reduce((sum, i) => sum + (i.sentiment_score ?? 0), 0) / intel.data.length).toFixed(1)
          : 'N/A',
        latestBrandAudit: brandAudit.data?.[0] ?? null,
        scenarios: scenarios.data ?? [],
        commsCompletionRate: totalComms > 0 ? Math.round((completedComms / totalComms) * 100) : 0,
        totalComms,
        completedComms,
      };
    },
  });
}

/* ─────────────────────────────────────────────
   Save lessons learned
───────────────────────────────────────────── */

export function useSaveLessons() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      engagementId,
      lessons,
    }: {
      engagementId: string;
      lessons: Record<string, string>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('engagements')
        .update({
          lessons_learned: lessons,
          updated_by: user.id,
        })
        .eq('id', engagementId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['report-engagement', vars.engagementId] });
    },
  });
}

/* ─────────────────────────────────────────────
   Finalise close-out
───────────────────────────────────────────── */

export function useFinaliseCloseOut() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      engagementId,
      relationshipStatus,
      relationshipNotes,
      reEngagementDate,
      commentary,
    }: {
      engagementId: string;
      relationshipStatus: string;
      relationshipNotes?: string;
      reEngagementDate?: string;
      commentary?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1. Update engagement to closed
      const { error: engErr } = await (supabase as any)
        .from('engagements')
        .update({
          status: 'closed',
          close_out_status: 'completed',
          close_out_commentary: commentary,
          relationship_status: relationshipStatus,
          relationship_notes: relationshipNotes,
          re_engagement_date: reEngagementDate || null,
          closed_at: new Date().toISOString(),
          closed_by: user.id,
          updated_by: user.id,
        })
        .eq('id', engagementId);
      if (engErr) throw engErr;

      // 2. Revoke all portal access
      const { error: portalErr } = await supabase
        .from('client_portal_access')
        .update({
          is_active: false,
          expires_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('engagement_id', engagementId);
      if (portalErr) throw portalErr;

      // 3. Log to audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'update' as const,
        table_name: 'engagements',
        record_id: engagementId,
        new_values: { status: 'closed', close_out_status: 'completed', relationship_status: relationshipStatus },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engagements'] });
    },
  });
}
