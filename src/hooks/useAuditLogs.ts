/**
 * useAuditLogs
 *
 * Hook for the Audit Log Viewer admin page. Supports filtering by
 * user, action, table, and date range. Results are paginated via
 * the LBDDataTable component.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  table_name: string;
  record_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  old_values: unknown;
  new_values: unknown;
  created_at: string;
}

interface AuditFilters {
  userId?: string;
  action?: string;
  tableName?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Fetches audit logs with optional filters. Resolves user_id → full_name.
 * Limited to 500 rows for performance (LBDDataTable handles client pagination).
 */
export function useAuditLogs(filters: AuditFilters = {}) {
  return useQuery<AuditLogRow[]>({
    queryKey: ['admin', 'audit-logs', filters],
    refetchInterval: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.action) query = query.eq('action', filters.action as any);
      if (filters.tableName) query = query.eq('table_name', filters.tableName);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

      const { data: logs, error } = await query;
      if (error) throw error;
      if (!logs?.length) return [];

      // Resolve user names
      const userIds = [...new Set(logs.map((l) => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      return logs.map((l) => ({
        id: l.id,
        user_id: l.user_id,
        user_name: nameMap.get(l.user_id) ?? 'System',
        action: l.action,
        table_name: l.table_name,
        record_id: l.record_id,
        ip_address: l.ip_address != null ? String(l.ip_address) : null,
        user_agent: l.user_agent,
        old_values: l.old_values,
        new_values: l.new_values,
        created_at: l.created_at,
      }));
    },
  });
}
