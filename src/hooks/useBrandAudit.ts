/**
 * useBrandAudit
 *
 * React Query hooks for the Leadership Brand Audit & Scorecard module.
 * CRUD on `brand_audit` table. Scores stored as JSONB:
 *   { [dimension]: { current, target, evidence, action } }
 * Roadmap stored as JSONB array in `repositioning_roadmap`.
 *
 * Exports:
 *  useBrandAuditList   — all audits for an engagement (newest first)
 *  useBrandAudit       — single audit by ID
 *  useCreateBrandAudit — create mutation
 *  useUpdateBrandAudit — update mutation (scores, roadmap, overall, etc.)
 *  useFinaliseBrandAudit — set status to finalised (locks editing)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   12 brand dimensions
───────────────────────────────────────────── */

export const BRAND_DIMENSIONS = [
  'Credibility & Trust',
  'Policy Competence',
  'Leadership Presence',
  'Communication Clarity',
  'Emotional Connection',
  'Innovation & Vision',
  'Integrity Perception',
  'Grassroots Appeal',
  'Elite Acceptance',
  'Media Portrayal',
  'Digital Presence',
  'Crisis Resilience',
] as const;

export type BrandDimension = (typeof BRAND_DIMENSIONS)[number];

/* ─────────────────────────────────────────────
   Score shape per dimension
───────────────────────────────────────────── */

export interface DimensionScore {
  current: number;
  target: number;
  evidence: string;
  action: string;
}

/** Full scores map keyed by dimension name */
export type ScoresMap = Record<string, DimensionScore>;

/* ─────────────────────────────────────────────
   Roadmap item
───────────────────────────────────────────── */

export interface RoadmapItem {
  id: string;
  objective: string;
  target_dimensions: string[];
  action_plan: string;
  responsible: string;
  timeline: string;
  success_metric: string;
  status: 'not_started' | 'in_progress' | 'complete';
}

/* ─────────────────────────────────────────────
   BrandAudit row type
───────────────────────────────────────────── */

export interface BrandAudit {
  id: string;
  engagement_id: string;
  audit_date: string;
  overall_score: number | null;
  target_score: number | null;
  scores: ScoresMap;
  priority_actions: string[];
  repositioning_roadmap: RoadmapItem[];
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────
   Query keys
───────────────────────────────────────────── */

const auditKeys = {
  list: (engagementId: string) => ['brand-audits', engagementId] as const,
  detail: (id: string) => ['brand-audit', id] as const,
};

/* ─────────────────────────────────────────────
   Empty scores factory
───────────────────────────────────────────── */

export function emptyScores(): ScoresMap {
  const map: ScoresMap = {};
  for (const dim of BRAND_DIMENSIONS) {
    map[dim] = { current: 5, target: 7, evidence: '', action: '' };
  }
  return map;
}

/* ─────────────────────────────────────────────
   Calculate overall score from dimension scores
───────────────────────────────────────────── */

export function calcOverall(scores: ScoresMap): number {
  const vals = Object.values(scores);
  if (vals.length === 0) return 0;
  const sum = vals.reduce((acc, v) => acc + (v.current ?? 0), 0);
  return Math.round((sum / vals.length) * 10) / 10;
}

/* ─────────────────────────────────────────────
   useBrandAuditList
───────────────────────────────────────────── */

export function useBrandAuditList(engagementId: string | undefined) {
  return useQuery<BrandAudit[]>({
    queryKey: auditKeys.list(engagementId ?? ''),
    enabled: !!engagementId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_audit')
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('audit_date', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []).map(normalise);
    },
  });
}

/* ─────────────────────────────────────────────
   useCreateBrandAudit
───────────────────────────────────────────── */

export function useCreateBrandAudit(engagementId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (opts?: { prefillFrom?: BrandAudit }) => {
      const scores = opts?.prefillFrom
        ? { ...opts.prefillFrom.scores }
        : emptyScores();

      const overall = calcOverall(scores);

      const { data, error } = await supabase
        .from('brand_audit')
        .insert({
          engagement_id: engagementId,
          created_by: user?.id ?? '',
          scores,
          overall_score: overall,
          target_score: opts?.prefillFrom?.target_score ?? null,
          priority_actions: [],
          repositioning_roadmap: [],
        } as any)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return normalise(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: auditKeys.list(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   useUpdateBrandAudit
───────────────────────────────────────────── */

export function useUpdateBrandAudit(engagementId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<Pick<BrandAudit, 'scores' | 'overall_score' | 'target_score' | 'repositioning_roadmap' | 'priority_actions'>> & {
      id: string;
    }) => {
      const { error } = await supabase
        .from('brand_audit')
        .update({ ...values, updated_by: user?.id ?? '' } as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: auditKeys.list(engagementId) }),
  });
}

/* ─────────────────────────────────────────────
   Row normaliser
───────────────────────────────────────────── */

function normalise(row: any): BrandAudit {
  return {
    ...row,
    scores: (row.scores && typeof row.scores === 'object' ? row.scores : emptyScores()) as ScoresMap,
    priority_actions: Array.isArray(row.priority_actions) ? row.priority_actions : [],
    repositioning_roadmap: Array.isArray(row.repositioning_roadmap) ? row.repositioning_roadmap : [],
  };
}
