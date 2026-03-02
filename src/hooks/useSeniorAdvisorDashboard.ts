/**
 * useSeniorAdvisorDashboard
 * React Query hooks for the Senior Advisor dashboard.
 *
 * Sections:
 *  1. Alignment Distribution  — donut chart data (hostile/neutral/supportive/champion)
 *  2. Overdue Critical Stakeholders — strategic_priority=critical, >30 days no contact
 *  3. High-Risk Scenarios     — probability=high OR impact_score >= 8
 *  4. Alliance Gaps           — critical stakeholders with hostile/neutral alignment
 */
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';

const REFETCH = 30_000;

/* ─────────────────────────────────────────────
   1. Alignment Distribution
───────────────────────────────────────────── */

export interface AlignmentSlice {
  alignment: string;
  count: number;
}

export function useAlignmentDistribution() {
  return useQuery<AlignmentSlice[]>({
    queryKey: ['sa-alignment-distribution'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('alignment');
      if (error) throw error;
      if (!data?.length) return [];

      const counts: Record<string, number> = {
        hostile: 0, neutral: 0, supportive: 0, champion: 0,
      };
      for (const s of data) {
        const a = (s.alignment ?? 'neutral').toLowerCase();
        if (a in counts) counts[a]++;
      }
      return Object.entries(counts)
        .map(([alignment, count]) => ({ alignment, count }))
        .filter(d => d.count > 0);
    },
  });
}

/* ─────────────────────────────────────────────
   2. Overdue Critical Stakeholders
───────────────────────────────────────────── */

export interface OverdueStakeholder extends Record<string, unknown> {
  id: string;
  name: string;
  role_position: string | null;
  alignment: string;
  influence_score: number | null;
  last_contact_date: string | null;
  days_overdue: number;
  engagement_title: string;
  engagement_id: string;
}

export function useOverdueStakeholders() {
  return useQuery<OverdueStakeholder[]>({
    queryKey: ['sa-overdue-stakeholders'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const cutoff = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { data: stks, error } = await supabase
        .from('stakeholders')
        .select('id, name, role_position, alignment, influence_score, last_contact_date, engagement_id')
        .eq('strategic_priority', 'critical')
        .or(`last_contact_date.lt.${cutoff},last_contact_date.is.null`)
        .order('influence_score', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!stks?.length) return [];

      const engIds = [...new Set(stks.map(s => s.engagement_id))];
      const { data: engs } = await supabase
        .from('engagements')
        .select('id, title')
        .in('id', engIds);
      const engMap = new Map((engs ?? []).map(e => [e.id, e.title]));

      const now = Date.now();
      return stks.map(s => {
        const days = s.last_contact_date
          ? Math.floor((now - new Date(s.last_contact_date).getTime()) / 86_400_000)
          : 999;
        return {
          ...s,
          days_overdue: days,
          engagement_title: engMap.get(s.engagement_id) ?? '—',
        };
      });
    },
  });
}

/* ─────────────────────────────────────────────
   3. High-Risk Scenarios
───────────────────────────────────────────── */

export interface ScenarioRiskRow extends Record<string, unknown> {
  id: string;
  name: string;
  probability: string;
  impact_score: number | null;
  status: string;
  updated_at: string;
  engagement_title: string;
  engagement_id: string;
}

export function useHighRiskScenarios() {
  return useQuery<ScenarioRiskRow[]>({
    queryKey: ['sa-high-risk-scenarios'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenarios')
        .select('id, name, probability, impact_score, status, updated_at, engagement_id')
        .neq('status', 'resolved')
        .or('probability.eq.high,impact_score.gte.8')
        .order('impact_score', { ascending: false })
        .limit(25);
      if (error) throw error;
      if (!data?.length) return [];

      const engIds = [...new Set(data.map(s => s.engagement_id))];
      const { data: engs } = await supabase
        .from('engagements')
        .select('id, title')
        .in('id', engIds);
      const engMap = new Map((engs ?? []).map(e => [e.id, e.title]));

      return data.map(s => ({
        ...s,
        engagement_title: engMap.get(s.engagement_id) ?? '—',
      })) as ScenarioRiskRow[];
    },
  });
}

/* ─────────────────────────────────────────────
   4. Alliance Gap Alerts
───────────────────────────────────────────── */

export interface AllianceGapRow extends Record<string, unknown> {
  id: string;
  name: string;
  alignment: string;
  role_position: string | null;
  influence_score: number | null;
  strategic_priority: string;
  engagement_title: string;
  engagement_id: string;
}

export function useAllianceGaps() {
  return useQuery<AllianceGapRow[]>({
    queryKey: ['sa-alliance-gaps'],
    refetchInterval: REFETCH,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('id, name, alignment, role_position, influence_score, strategic_priority, engagement_id')
        .eq('strategic_priority', 'critical')
        .in('alignment', ['hostile', 'neutral'])
        .order('influence_score', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!data?.length) return [];

      const engIds = [...new Set(data.map(s => s.engagement_id))];
      const { data: engs } = await supabase
        .from('engagements')
        .select('id, title')
        .in('id', engIds);
      const engMap = new Map((engs ?? []).map(e => [e.id, e.title]));

      return data.map(s => ({
        ...s,
        engagement_title: engMap.get(s.engagement_id) ?? '—',
      })) as AllianceGapRow[];
    },
  });
}
