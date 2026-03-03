/**
 * useIntelTracker
 *
 * React Query hooks for the Intelligence & Sentiment Tracker module.
 * Full CRUD on `intel_items`, plus escalation which creates a `notifications` record.
 *
 * Exports:
 *  useIntelList        — all intel items for an engagement (with live-refresh)
 *  useAddIntelItem     — create mutation
 *  useUpdateIntelItem  — update mutation (action status, notes, escalation)
 *  useDeleteIntelItem  — delete mutation
 *  useEscalateItem     — escalate + create notification
 *  useMarkNotificationRead — mark a notification read
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Enums & constants
───────────────────────────────────────────── */

export type SourceType    = 'print' | 'digital' | 'broadcast' | 'social';
export type ActionStatus  = 'pending' | 'in_progress' | 'done' | 'monitor_only';

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  print:     'Print',
  digital:   'Digital',
  broadcast: 'Broadcast',
  social:    'Social',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending:      'Pending',
  in_progress:  'In Progress',
  done:         'Done',
  monitor_only: 'Monitor Only',
};

/** Common narrative theme presets — user can also type a custom value */
export const NARRATIVE_THEME_PRESETS = [
  'Economic Development',
  'Security & Stability',
  'Anti-Corruption',
  'Healthcare Reform',
  'Education Policy',
  'Infrastructure',
  'Electoral Process',
  'Human Rights',
  'International Relations',
  'Social Welfare',
  'Energy & Environment',
  'Governance Reform',
] as const;

/** Source type badge colours for display */
export const SOURCE_TYPE_COLOUR: Record<SourceType, string> = {
  print:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
  digital:   'bg-purple-500/15 text-purple-400 border-purple-500/30',
  broadcast: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  social:    'bg-pink-500/15 text-pink-400 border-pink-500/30',
};

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface IntelItem extends Record<string, unknown> {
  id:                string;
  engagement_id:     string;
  headline:          string;
  summary:           string | null;
  raw_content:       string | null;
  date_logged:       string;
  source_name:       string | null;
  source_type:       SourceType | null;
  sentiment_score:   number | null;   // -2 to +2
  reach_tier:        number | null;   // 1 | 2 | 3
  narrative_theme:   string | null;
  platform:          string | null;
  url:               string | null;
  action_required:   boolean;
  action_status:     ActionStatus | null;
  is_escalated:      boolean;
  is_urgent:         boolean;
  created_by:        string;
  created_at:        string;
  updated_at:        string;
  updated_by:        string | null;
}

export type IntelInsert = Omit<IntelItem,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'is_escalated'
>;

export type IntelUpdate = Partial<Omit<IntelInsert, 'engagement_id'>>;

/* ─────────────────────────────────────────────
   Query key
───────────────────────────────────────────── */

export const intelKeys = {
  all: (engagementId: string) => ['intel-items', engagementId] as const,
};

/* ─────────────────────────────────────────────
   Sentiment helpers
───────────────────────────────────────────── */

export function sentimentLabel(score: number | null): string {
  if (score === null) return 'Unknown';
  if (score >= 1.0)  return 'Very Positive';
  if (score >= 0.3)  return 'Positive';
  if (score >= -0.5) return 'Neutral';
  if (score >= -1.0) return 'Negative';
  return 'Very Negative';
}

export function sentimentColour(score: number | null): 'red' | 'amber' | 'green' {
  if (score === null)  return 'amber';
  if (score > 0.3)    return 'green';
  if (score >= -0.5)  return 'amber';
  return 'red';
}

export function sentimentHex(score: number | null): string {
  const c = sentimentColour(score);
  return c === 'green' ? '#34d399' : c === 'red' ? '#f87171' : '#fbbf24';
}

/* ─────────────────────────────────────────────
   useIntelList
───────────────────────────────────────────── */

export function useIntelList(engagementId: string | undefined) {
  return useQuery<IntelItem[]>({
    queryKey:  intelKeys.all(engagementId ?? ''),
    enabled:   !!engagementId,
    staleTime: 15_000,
    refetchInterval: 60_000,   // live refresh every 60s
    queryFn:   async () => {
      const { data, error } = await supabase
        .from('intel_items')
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('date_logged', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as IntelItem[];
    },
  });
}

/* ─────────────────────────────────────────────
   useAddIntelItem
───────────────────────────────────────────── */

export function useAddIntelItem(engagementId: string) {
  const qc       = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (values: IntelUpdate & { headline: string }) => {
      const { data, error } = await supabase
        .from('intel_items')
        .insert({
          ...values,
          engagement_id: engagementId,
          is_escalated:  false,
          is_urgent:     values.is_urgent ?? false,
          action_required: values.action_required ?? false,
          date_logged:   values.date_logged ?? new Date().toISOString().slice(0, 10),
          created_by:    user?.id ?? '',
          updated_by:    user?.id ?? '',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: intelKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useUpdateIntelItem
───────────────────────────────────────────── */

export function useUpdateIntelItem(engagementId: string) {
  const qc       = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...values }: IntelUpdate & { id: string }) => {
      const { error } = await supabase
        .from('intel_items')
        .update({ ...values, updated_by: user?.id ?? '' })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: intelKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useDeleteIntelItem
───────────────────────────────────────────── */

export function useDeleteIntelItem(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('intel_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: intelKeys.all(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useEscalateItem
   Sets is_escalated=true, is_urgent=true, and creates a notification
   for the lead_advisor assigned to the engagement.
───────────────────────────────────────────── */

export function useEscalateItem(engagementId: string) {
  const qc       = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ itemId, headline }: { itemId: string; headline: string }) => {
      // 1. Mark item as escalated
      const { error: updErr } = await supabase
        .from('intel_items')
        .update({ is_escalated: true, is_urgent: true, updated_by: user?.id ?? '' })
        .eq('id', itemId);
      if (updErr) throw new Error(updErr.message);

      // 2. Look up the engagement to find lead_advisor_id
      const { data: eng } = await supabase
        .from('engagements')
        .select('lead_advisor_id')
        .eq('id', engagementId)
        .maybeSingle();

      const targetUserId = eng?.lead_advisor_id ?? user?.id;
      if (!targetUserId) return;

      // 3. Create notification record
      await supabase.from('notifications').insert({
        user_id:          targetUserId,
        engagement_id:    engagementId,
        title:            '⚡ Escalated Intel Item',
        message:          `Item requiring urgent attention: "${headline}"`,
        type:             'escalation',
        is_read:          false,
        related_record_id: itemId,
        related_table:    'intel_items',
        created_by:       user?.id,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: intelKeys.all(engagementId) }),
  });
}
