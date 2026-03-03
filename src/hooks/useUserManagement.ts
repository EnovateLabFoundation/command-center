/**
 * useUserManagement
 *
 * Hooks for the User Management admin page. Provides:
 *   - useUsers()           — fetches all user profiles with roles
 *   - useCreateUser()      — creates a new user via admin-users edge function
 *   - useDeactivateUser()  — deactivates a user
 *   - useActivateUser()    — reactivates a user
 *   - useChangeRole()      — changes user role assignment
 *   - useResetMFA()        — clears MFA for a user
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const USERS_KEY = ['admin', 'users'];

/** Extended user row for the management table */
export interface UserRow extends Record<string, unknown> {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login: string | null;
  created_at: string;
  avatar_url: string | null;
}

/**
 * Fetches all profiles with resolved role from user_roles table.
 * Used in the User Management LBDDataTable.
 */
export function useUsers() {
  return useQuery<UserRow[]>({
    queryKey: USERS_KEY,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active, mfa_enabled, last_login, created_at, avatar_url')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!profiles?.length) return [];

      const ids = profiles.map((p) => p.id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', ids);

      const roleMap = new Map<string, string>();
      for (const r of roles ?? []) {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
      }

      return profiles.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: roleMap.get(p.id) ?? 'unassigned',
        is_active: p.is_active,
        mfa_enabled: p.mfa_enabled,
        last_login: p.last_login,
        created_at: p.created_at,
        avatar_url: p.avatar_url,
      }));
    },
  });
}

/** Helper to invoke the admin-users edge function */
async function callAdminUsers(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: payload,
  });
  if (error) throw new Error(error.message ?? 'Admin operation failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { email: string; full_name: string; role: string; password?: string }) =>
      callAdminUsers({ action: 'create', ...params }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user_id: string) => callAdminUsers({ action: 'deactivate', user_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user_id: string) => callAdminUsers({ action: 'activate', user_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useChangeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { user_id: string; new_role: string; old_role: string }) =>
      callAdminUsers({ action: 'change_role', ...params }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useResetMFA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user_id: string) => callAdminUsers({ action: 'reset_mfa', user_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}
