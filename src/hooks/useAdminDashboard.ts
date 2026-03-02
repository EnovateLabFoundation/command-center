/**
 * useAdminDashboard
 *
 * Six React Query hooks that power the Super Admin Command Dashboard.
 * All hooks poll automatically every 60 seconds via refetchInterval.
 *
 * Hooks:
 *   usePortfolioKPIs          – 4 top-level platform counters
 *   useEngagementHealthBoard  – all active/paused engagements with computed RAG
 *   useTeamActivityFeed       – last 20 non-auth audit log events
 *   useIntegrationHealth      – integration_configs table
 *   useUserManagementSummary  – profiles with role and MFA status
 *   useSecurityEventLog       – last 10 auth/delete/export audit events
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** Auto-refresh cadence for all admin dashboard queries */
const REFETCH_INTERVAL = 60_000;

/* ─────────────────────────────────────────────
   1. Portfolio KPIs
───────────────────────────────────────────── */

export interface PortfolioKPIs {
  activeEngagements: number;
  totalClients: number;
  integrationHealthPct: number;
  openEscalations: number;
}

/**
 * Fetches four top-level KPIs in parallel.
 * Integration health % = healthy / total active integrations × 100.
 * Open escalations = is_escalated=true AND action_status != 'done'.
 */
export function usePortfolioKPIs() {
  return useQuery<PortfolioKPIs>({
    queryKey: ['admin', 'portfolio-kpis'],
    refetchInterval: REFETCH_INTERVAL,
    queryFn: async () => {
      const [
        engagementsResult,
        clientsResult,
        integrationsResult,
        escalationsResult,
      ] = await Promise.all([
        supabase
          .from('engagements')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),

        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),

        supabase
          .from('integration_configs')
          .select('sync_status')
          .eq('is_active', true),

        supabase
          .from('intel_items')
          .select('*', { count: 'exact', head: true })
          .eq('is_escalated', true)
          .or('action_status.neq.done,action_status.is.null'),
      ]);

      const intData = integrationsResult.data ?? [];
      const healthyCount = intData.filter(i => i.sync_status === 'healthy').length;
      const totalCount = intData.length;
      const integrationHealthPct =
        totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100;

      return {
        activeEngagements: engagementsResult.count ?? 0,
        totalClients: clientsResult.count ?? 0,
        integrationHealthPct,
        openEscalations: escalationsResult.count ?? 0,
      };
    },
  });
}

/* ─────────────────────────────────────────────
   2. Engagement Health Board
───────────────────────────────────────────── */

export interface EngagementHealthRow extends Record<string, unknown> {
  id: string;
  title: string;
  client_name: string;
  phase: string;
  status: string;
  /** Computed client-side: intel freshness may override DB health_rag */
  computed_rag: 'red' | 'amber' | 'green';
  lead_advisor: string;
  /** Days since most recent intel item, or null if no intel logged */
  latest_intel_days: number | null;
  start_date: string | null;
}

/**
 * Computes a RAG override based on intel freshness.
 * Intel > 14 days → red
 * Intel 7–14 days → at least amber
 * Falls back to the DB-stored health_rag value.
 */
function computeRag(
  storedRag: string | null,
  latestIntelDays: number | null,
): 'red' | 'amber' | 'green' {
  if (latestIntelDays !== null) {
    if (latestIntelDays > 14) return 'red';
    if (latestIntelDays > 7) {
      // Amber at minimum — don't downgrade a red to amber
      if (storedRag === 'red') return 'red';
      return 'amber';
    }
  }
  if (storedRag === 'red') return 'red';
  if (storedRag === 'amber') return 'amber';
  return 'green';
}

/**
 * Fetches all active and paused engagements with their client name,
 * lead advisor full name, and most-recent intel item date.
 * RAG is computed client-side from stored health_rag + intel freshness.
 */
export function useEngagementHealthBoard() {
  return useQuery<EngagementHealthRow[]>({
    queryKey: ['admin', 'engagement-health-board'],
    refetchInterval: REFETCH_INTERVAL,
    queryFn: async () => {
      // Fetch base engagement data
      const { data: engagements, error: engError } = await supabase
        .from('engagements')
        .select('id, title, client_id, phase, status, health_rag, start_date, lead_advisor_id')
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false });

      if (engError) throw engError;
      if (!engagements || engagements.length === 0) return [];

      // Collect unique IDs for batch lookups
      const clientIds = [...new Set(engagements.map(e => e.client_id).filter(Boolean))];
      const advisorIds = [
        ...new Set(
          engagements
            .map(e => e.lead_advisor_id)
            .filter((id): id is string => !!id),
        ),
      ];
      const engagementIds = engagements.map(e => e.id);

      // Parallel: client names, advisor names, latest intel per engagement
      const [clientsResult, advisorsResult, intelResult] = await Promise.all([
        clientIds.length > 0
          ? supabase.from('clients').select('id, name').in('id', clientIds)
          : Promise.resolve({ data: [], error: null }),

        advisorIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', advisorIds)
          : Promise.resolve({ data: [], error: null }),

        supabase
          .from('intel_items')
          .select('engagement_id, date_logged')
          .in('engagement_id', engagementIds)
          .order('date_logged', { ascending: false }),
      ]);

      // Build lookup maps
      const clientMap = new Map(
        (clientsResult.data ?? []).map(c => [c.id, c.name]),
      );
      const advisorMap = new Map(
        (advisorsResult.data ?? []).map(p => [p.id, p.full_name]),
      );

      // Latest intel per engagement (already ordered desc, so first hit wins)
      const latestIntelMap = new Map<string, string>();
      for (const item of intelResult.data ?? []) {
        if (!latestIntelMap.has(item.engagement_id)) {
          latestIntelMap.set(item.engagement_id, item.date_logged);
        }
      }

      const now = Date.now();

      return engagements.map(eng => {
        const latestDate = latestIntelMap.get(eng.id);
        const latestIntelDays = latestDate
          ? Math.floor((now - new Date(latestDate).getTime()) / 86_400_000)
          : null;

        return {
          id: eng.id,
          title: eng.title,
          client_name: clientMap.get(eng.client_id) ?? '—',
          phase: `Phase ${eng.phase}`,
          status: eng.status,
          computed_rag: computeRag(eng.health_rag, latestIntelDays),
          lead_advisor: advisorMap.get(eng.lead_advisor_id ?? '') ?? '—',
          latest_intel_days: latestIntelDays,
          start_date: eng.start_date,
        };
      });
    },
  });
}

/* ─────────────────────────────────────────────
   3. Team Activity Feed
───────────────────────────────────────────── */

export interface ActivityItem extends Record<string, unknown> {
  id: string;
  action: string;
  table_name: string;
  user_name: string;
  created_at: string;
  record_id: string | null;
}

/**
 * Returns the last 20 non-auth audit log events (excludes login/logout).
 * Resolves user_id → full_name via a batch profile lookup.
 */
export function useTeamActivityFeed() {
  return useQuery<ActivityItem[]>({
    queryKey: ['admin', 'activity-feed'],
    refetchInterval: REFETCH_INTERVAL,
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('id, action, table_name, user_id, created_at, record_id')
        .not('action', 'in', '("login","logout")')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      const userIds = [...new Set(logs.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(
        (profiles ?? []).map(p => [p.id, p.full_name]),
      );

      return logs.map(log => ({
        id: log.id,
        action: log.action,
        table_name: log.table_name,
        user_name: profileMap.get(log.user_id) ?? 'Unknown',
        created_at: log.created_at,
        record_id: log.record_id,
      }));
    },
  });
}

/* ─────────────────────────────────────────────
   4. Integration Health
───────────────────────────────────────────── */

export interface IntegrationRow extends Record<string, unknown> {
  id: string;
  platform_name: string;
  sync_status: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  error_log: string | null;
}

/** Returns all integration_configs rows ordered by platform name. */
export function useIntegrationHealth() {
  return useQuery<IntegrationRow[]>({
    queryKey: ['admin', 'integration-health'],
    refetchInterval: REFETCH_INTERVAL,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('id, platform_name, sync_status, is_active, last_sync_at, error_log')
        .order('platform_name');

      if (error) throw error;
      return (data ?? []) as IntegrationRow[];
    },
  });
}

/* ─────────────────────────────────────────────
   5. User Management Summary
───────────────────────────────────────────── */

export interface UserSummaryRow extends Record<string, unknown> {
  id: string;
  full_name: string;
  email: string;
  role: string;
  mfa_enabled: boolean;
  is_active: boolean;
  last_login: string | null;
}

/**
 * Returns all profiles with their role name resolved via role_id → roles.
 * Resolves both via the FK join and a fallback to user_roles table.
 */
export function useUserManagementSummary() {
  return useQuery<UserSummaryRow[]>({
    queryKey: ['admin', 'user-summary'],
    refetchInterval: REFETCH_INTERVAL,
    queryFn: async () => {
      // Query profiles; resolve role via user_roles (most reliable source)
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, email, mfa_enabled, is_active, last_login')
        .order('full_name');

      if (profError) throw profError;
      if (!profiles || profiles.length === 0) return [];

      // Fetch user_roles for all profile ids
      const profileIds = profiles.map(p => p.id);
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', profileIds);

      // Build map: user_id → role (first match wins)
      const roleMap = new Map<string, string>();
      for (const ur of userRoles ?? []) {
        if (!roleMap.has(ur.user_id)) {
          roleMap.set(ur.user_id, ur.role);
        }
      }

      return profiles.map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: roleMap.get(p.id) ?? 'unknown',
        mfa_enabled: p.mfa_enabled,
        is_active: p.is_active,
        last_login: p.last_login,
      }));
    },
  });
}

/* ─────────────────────────────────────────────
   6. Security Event Log
───────────────────────────────────────────── */

export interface SecurityEventRow extends Record<string, unknown> {
  id: string;
  action: string;
  user_name: string;
  ip_address: string | null;
  table_name: string;
  created_at: string;
}

/**
 * Returns the last 10 high-sensitivity audit events:
 * login, logout, export, and delete actions.
 * Resolves user_id → full_name via a batch profile lookup.
 */
export function useSecurityEventLog() {
  return useQuery<SecurityEventRow[]>({
    queryKey: ['admin', 'security-events'],
    refetchInterval: REFETCH_INTERVAL,
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('id, action, user_id, ip_address, table_name, created_at')
        .in('action', ['login', 'logout', 'export', 'delete'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      const userIds = [...new Set(logs.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(
        (profiles ?? []).map(p => [p.id, p.full_name]),
      );

      return logs.map(log => ({
        id: log.id,
        action: log.action,
        user_name: profileMap.get(log.user_id) ?? 'Unknown',
        ip_address: log.ip_address != null ? String(log.ip_address) : null,
        table_name: log.table_name,
        created_at: log.created_at,
      }));
    },
  });
}
