/**
 * useGeospatial
 *
 * Data hooks for the Geospatial Analytics Engine.
 * Aggregates intel_items and stakeholders by geographic region,
 * provides field report submission, and computes coverage gaps.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

/* ── Types ──────────────────────────────────── */

export type GeoLevel = 'national' | 'state' | 'lga' | 'ward' | 'polling_unit';

export interface RegionSentiment {
  region: string;
  avgSentiment: number | null;
  itemCount: number;
  stakeholderCount: number;
}

export interface FieldReportInput {
  area_state: string;
  area_lga?: string;
  area_ward?: string;
  report_date: string;
  report_source: string;
  summary: string;
  sentiment: number;
  tags: string[];
}

/** Nigeria's 36 states + FCT for reference */
export const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const;

export const FIELD_REPORT_TAGS = [
  'positive_event',
  'negative_event',
  'opposition_activity',
  'stakeholder_movement',
  'media_event',
] as const;

/* ── Query keys ─────────────────────────────── */

const KEYS = {
  intelByRegion: (engagementId: string) => ['geo-intel', engagementId] as const,
  stakeholdersByRegion: (engagementId: string) => ['geo-stakeholders', engagementId] as const,
  fieldReports: (engagementId: string) => ['geo-field-reports', engagementId] as const,
  regionDetail: (engagementId: string, region: string) => ['geo-region', engagementId, region] as const,
};

/* ── Intel items aggregated by state (via narrative_theme or platform as geo proxy) ── */

export function useIntelByRegion(engagementId: string | undefined) {
  return useQuery({
    queryKey: KEYS.intelByRegion(engagementId ?? ''),
    queryFn: async () => {
      if (!engagementId) return [];
      const { data, error } = await supabase
        .from('intel_items')
        .select('id, headline, summary, sentiment_score, narrative_theme, platform, date_logged, source_type')
        .eq('engagement_id', engagementId)
        .order('date_logged', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!engagementId,
  });
}

/* ── Stakeholders with lat/lng ────────────── */

export function useStakeholderLocations(engagementId: string | undefined) {
  return useQuery({
    queryKey: KEYS.stakeholdersByRegion(engagementId ?? ''),
    queryFn: async () => {
      if (!engagementId) return [];
      const { data, error } = await supabase
        .from('stakeholders')
        .select('id, name, role_position, category, alignment, influence_score, lat, lng, strategic_priority')
        .eq('engagement_id', engagementId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!engagementId,
  });
}

/* ── Region detail (intel items filtered by narrative_theme containing region name) ── */

export function useRegionDetail(engagementId: string | undefined, region: string | null) {
  return useQuery({
    queryKey: KEYS.regionDetail(engagementId ?? '', region ?? ''),
    queryFn: async () => {
      if (!engagementId || !region) return { intel: [], stakeholders: [] };

      const [intelRes, stakeholderRes] = await Promise.all([
        supabase
          .from('intel_items')
          .select('*')
          .eq('engagement_id', engagementId)
          .ilike('narrative_theme', `%${region}%`)
          .order('date_logged', { ascending: false })
          .limit(20),
        supabase
          .from('stakeholders')
          .select('*')
          .eq('engagement_id', engagementId)
          .ilike('strategic_notes', `%${region}%`)
          .limit(20),
      ]);

      if (intelRes.error) throw intelRes.error;
      if (stakeholderRes.error) throw stakeholderRes.error;

      return {
        intel: intelRes.data ?? [],
        stakeholders: stakeholderRes.data ?? [],
      };
    },
    enabled: !!engagementId && !!region,
  });
}

/* ── Submit field report as intel_item ─────── */

export function useSubmitFieldReport(engagementId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: FieldReportInput) => {
      if (!engagementId || !userId) throw new Error('Missing engagement or user');

      const { data, error } = await supabase
        .from('intel_items')
        .insert({
          engagement_id: engagementId,
          created_by: userId,
          headline: `Field Report: ${input.area_state}${input.area_lga ? ` — ${input.area_lga}` : ''}`,
          summary: input.summary,
          sentiment_score: input.sentiment,
          narrative_theme: [input.area_state, input.area_lga, input.area_ward].filter(Boolean).join(' > '),
          source_name: input.report_source,
          source_type: 'digital' as const,
          platform: input.tags.join(', '),
          date_logged: input.report_date,
          action_required: false,
          is_urgent: false,
          is_escalated: false,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.intelByRegion(engagementId ?? '') });
      queryClient.invalidateQueries({ queryKey: KEYS.fieldReports(engagementId ?? '') });
    },
  });
}

/**
 * Aggregate intel items into state-level sentiment data.
 * Uses narrative_theme field which stores geographic info like "Lagos > Ikeja > Ward 3".
 */
export function aggregateByState(
  intelItems: Array<{ narrative_theme: string | null; sentiment_score: number | null }>,
): Map<string, { total: number; sentimentSum: number; count: number }> {
  const map = new Map<string, { total: number; sentimentSum: number; count: number }>();

  for (const item of intelItems) {
    const theme = item.narrative_theme;
    if (!theme) continue;

    // Try to extract state name from narrative_theme
    const stateName = NIGERIA_STATES.find(
      (s) => theme.toLowerCase().includes(s.toLowerCase()),
    );
    if (!stateName) continue;

    const existing = map.get(stateName) ?? { total: 0, sentimentSum: 0, count: 0 };
    existing.total++;
    if (item.sentiment_score != null) {
      existing.sentimentSum += Number(item.sentiment_score);
      existing.count++;
    }
    map.set(stateName, existing);
  }

  return map;
}
