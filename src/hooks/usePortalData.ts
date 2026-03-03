/**
 * usePortalData
 *
 * Central data hook for the Client Portal. Fetches the client_principal's
 * portal access record, linked engagement, client details, and module-gated
 * data (intel items, brand audit, briefs). Also provides an audit logger
 * that records every portal page access.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface PortalAccess {
  id: string;
  engagement_id: string;
  allowed_modules: string[];
  is_active: boolean;
  expires_at: string | null;
}

export interface PortalEngagement {
  id: string;
  title: string;
  phase: string;
  status: string;
  health_rag: string | null;
  start_date: string | null;
  updated_at: string;
  client_id: string;
}

export interface PortalClient {
  id: string;
  name: string;
  type: string;
}

/* ─────────────────────────────────────────────
   Audit helper
───────────────────────────────────────────── */

/** Log a portal page access to audit_logs */
export async function logPortalAccess(userId: string, module: string) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'read' as const,
      table_name: 'client_portal',
      record_id: null,
      new_values: { module, accessed_at: new Date().toISOString() },
    });
  } catch {
    // Non-blocking — don't break UX if audit insert fails
  }
}

/* ─────────────────────────────────────────────
   Hooks
───────────────────────────────────────────── */

/** Fetch the portal access record for the current user */
export function usePortalAccess() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['portal-access', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PortalAccess | null> => {
      const { data, error } = await supabase
        .from('client_portal_access')
        .select('id, engagement_id, allowed_modules, is_active, expires_at')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        allowed_modules: Array.isArray(data.allowed_modules)
          ? (data.allowed_modules as string[])
          : [],
      };
    },
  });
}

/** Fetch engagement linked to portal access */
export function usePortalEngagement(engagementId: string | undefined) {
  return useQuery({
    queryKey: ['portal-engagement', engagementId],
    enabled: !!engagementId,
    queryFn: async (): Promise<PortalEngagement | null> => {
      const { data, error } = await supabase
        .from('engagements')
        .select('id, title, phase, status, health_rag, start_date, updated_at, client_id')
        .eq('id', engagementId!)
        .maybeSingle();
      if (error) throw error;
      return data as PortalEngagement | null;
    },
  });
}

/** Fetch client record */
export function usePortalClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['portal-client', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<PortalClient | null> => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, type')
        .eq('id', clientId!)
        .maybeSingle();
      if (error) throw error;
      return data as PortalClient | null;
    },
  });
}

/** Fetch portal-approved intel items */
export function usePortalIntel(engagementId: string | undefined) {
  return useQuery({
    queryKey: ['portal-intel', engagementId],
    enabled: !!engagementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intel_items')
        .select('id, headline, source_name, source_type, date_logged, reach_tier, sentiment_score, platform')
        .eq('engagement_id', engagementId!)
        .eq('portal_approved', true)
        .order('date_logged', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Fetch brand audit for engagement */
export function usePortalBrandAudit(engagementId: string | undefined) {
  return useQuery({
    queryKey: ['portal-brand-audit', engagementId],
    enabled: !!engagementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_audit')
        .select('id, audit_date, overall_score, target_score, scores')
        .eq('engagement_id', engagementId!)
        .order('audit_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Fetch published briefs for engagement */
export function usePortalBriefs(engagementId: string | undefined) {
  return useQuery({
    queryKey: ['portal-briefs', engagementId],
    enabled: !!engagementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('briefs')
        .select('id, type, content, generated_at, date_from, date_to')
        .eq('engagement_id', engagementId!)
        .order('generated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}
