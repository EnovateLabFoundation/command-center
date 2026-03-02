// Central Supabase export — import from here throughout the app
export { supabase } from '@/integrations/supabase/client';
export type { Database } from '@/integrations/supabase/types';

// Role → dashboard route mapping
export const ROLE_DASHBOARDS = {
  super_admin:        '/admin/dashboard',
  lead_advisor:       '/advisor/dashboard',
  senior_advisor:     '/senior/dashboard',
  comms_director:     '/comms/dashboard',
  intel_analyst:      '/intel/dashboard',
  digital_strategist: '/digital/dashboard',
  client_principal:   '/portal/dashboard',
} as const;

// Internal roles that MUST complete MFA before accessing the platform
export const MFA_REQUIRED_ROLES = [
  'super_admin',
  'lead_advisor',
  'senior_advisor',
  'comms_director',
  'intel_analyst',
  'digital_strategist',
] as const;

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
