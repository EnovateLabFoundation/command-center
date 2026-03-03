/**
 * usePortalAccess
 *
 * Hooks for the Client Portal Access Manager. Provides:
 *   - usePortalAccessRecords() — all client_portal_access rows with resolved names
 *   - useGrantPortalAccess()   — insert new access record
 *   - useRevokePortalAccess()  — immediate revocation
 *   - useUpdatePortalAccess()  — edit allowed_modules / expiry
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

const ACCESS_KEY = ['admin', 'portal-access'];

/** Portal access row for the management table */
export interface PortalAccessRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  engagement_id: string;
  engagement_title: string;
  client_name: string;
  allowed_modules: string[];
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by_name: string;
}

/**
 * Fetches all client_portal_access records with resolved user, engagement,
 * and client names for display in the management table.
 */
export function usePortalAccessRecords() {
  return useQuery<PortalAccessRow[]>({
    queryKey: ACCESS_KEY,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: records, error } = await supabase
        .from('client_portal_access')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!records?.length) return [];

      // Collect unique IDs for batch lookups
      const userIds = [...new Set(records.map((r) => r.user_id))];
      const engIds = [...new Set(records.map((r) => r.engagement_id))];
      const creatorIds = [...new Set(records.map((r) => r.created_by))];
      const allProfileIds = [...new Set([...userIds, ...creatorIds])];

      const [profilesRes, engRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', allProfileIds),
        supabase.from('engagements').select('id, title, client_id').in('id', engIds),
      ]);

      const profileMap = new Map(
        (profilesRes.data ?? []).map((p) => [p.id, { name: p.full_name, email: p.email }]),
      );

      // Resolve client names
      const clientIds = [...new Set((engRes.data ?? []).map((e) => e.client_id))];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      const clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]));
      const engMap = new Map(
        (engRes.data ?? []).map((e) => [
          e.id,
          { title: e.title, client_name: clientMap.get(e.client_id) ?? '—' },
        ]),
      );

      return records.map((r) => {
        const user = profileMap.get(r.user_id);
        const eng = engMap.get(r.engagement_id);
        const creator = profileMap.get(r.created_by);
        return {
          id: r.id,
          user_id: r.user_id,
          user_email: user?.email ?? '—',
          user_name: user?.name ?? '—',
          engagement_id: r.engagement_id,
          engagement_title: eng?.title ?? '—',
          client_name: eng?.client_name ?? '—',
          allowed_modules: Array.isArray(r.allowed_modules) ? r.allowed_modules as string[] : [],
          is_active: r.is_active,
          expires_at: r.expires_at,
          created_at: r.created_at,
          created_by_name: creator?.name ?? '—',
        };
      });
    },
  });
}

/** Grant new portal access */
export function useGrantPortalAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      engagement_id: string;
      allowed_modules: string[];
      expires_at: string | null;
      created_by: string;
    }) => {
      const { error } = await supabase.from('client_portal_access').insert({
        user_id: params.user_id,
        engagement_id: params.engagement_id,
        allowed_modules: params.allowed_modules as unknown as Json,
        expires_at: params.expires_at,
        created_by: params.created_by,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCESS_KEY }),
  });
}

/** Immediately revoke portal access */
export function useRevokePortalAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; revoked_by: string }) => {
      const { error } = await supabase
        .from('client_portal_access')
        .update({
          is_active: false,
          expires_at: new Date().toISOString(),
          updated_by: params.revoked_by,
        })
        .eq('id', params.id);
      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: params.revoked_by,
        action: 'update' as const,
        table_name: 'client_portal_access',
        record_id: params.id,
        new_values: { is_active: false, action: 'revoked' },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCESS_KEY }),
  });
}

/** Update portal access modules or expiry */
export function useUpdatePortalAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      allowed_modules: string[];
      expires_at: string | null;
      updated_by: string;
    }) => {
      const { error } = await supabase
        .from('client_portal_access')
        .update({
          allowed_modules: params.allowed_modules as unknown as Json,
          expires_at: params.expires_at,
          updated_by: params.updated_by,
        })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCESS_KEY }),
  });
}
