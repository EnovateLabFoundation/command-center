// Central Supabase export — import from here throughout the app
export { supabase } from '@/integrations/supabase/client';
export type { Database } from '@/integrations/supabase/types';

/**
 * Role → dashboard route mapping.
 *
 * All internal staff land on the unified /dashboard route which renders
 * role-appropriate content via DashboardRouter. Clients land on /portal.
 *
 * Legacy role-prefixed routes (/admin/*, /advisor/*, etc.) are kept as
 * redirect aliases in App.tsx for backwards-compat with any bookmarks.
 */
export const ROLE_DASHBOARDS = {
  super_admin:        '/dashboard',
  lead_advisor:       '/dashboard',
  senior_advisor:     '/dashboard',
  comms_director:     '/dashboard',
  intel_analyst:      '/dashboard',
  digital_strategist: '/dashboard',
  client_principal:   '/portal',
} as const;

// Internal roles that MUST complete MFA before accessing the platform
// MFA disabled for development/testing — no roles require MFA
export const MFA_REQUIRED_ROLES = [] as const;

export const SESSION_DURATION_MS    = 8 * 60 * 60 * 1000;   // 8 hours
export const INACTIVITY_TIMEOUT_MS  = 30 * 60 * 1000;        // 30 minutes
export const LOGIN_MAX_ATTEMPTS     = 5;
export const LOGIN_LOCKOUT_MS       = 15 * 60 * 1000;         // 15 minutes

/** SHA-256 hash via Web Crypto API — used for recovery code storage */
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate N random recovery codes in format XXXX-XXXX-XXXX */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const hex = () => crypto.getRandomValues(new Uint8Array(3))
      .reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '').toUpperCase().slice(0, 4);
    return `${hex()}-${hex()}-${hex()}`;
  });
}
