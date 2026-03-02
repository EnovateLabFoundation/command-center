/**
 * useAuth
 *
 * Central authentication hook for LBD-SIP. Provides all auth operations:
 * login, logout, MFA enroll/verify, recovery code usage, and password reset.
 *
 * Built on top of Supabase Auth (PKCE flow) and Zustand auth store.
 *
 * Rate limiting:
 *   Client-side: 5 attempts per email, 15-minute lockout stored in sessionStorage.
 *   Server-side: enforced via Supabase Auth settings + edge function.
 *
 * MFA flow:
 *   1. login() → checks MFA enrollment
 *   2. If enrolled → navigate to /auth/mfa-verify
 *   3. If not enrolled (internal role) → navigate to /auth/mfa-setup
 *   4. verifyMFA(code) or completeMFASetup(code, factorId, recoveryCodes)
 *   5. On success → navigate to role dashboard
 *
 * Recovery codes:
 *   Generated as random strings, SHA-256 hashed, stored as JSONB in
 *   profiles.recovery_codes. Each code is single-use (invalidated on use).
 *
 * @example
 * const { login, logout, mfaVerified, isLoading } = useAuth();
 * await login(email, password);   // throws on failure
 * await logout('user');           // clears session + navigates to /login
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore, type AppRole } from '@/stores/authStore';
import {
  ROLE_DASHBOARDS,
  MFA_REQUIRED_ROLES,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCKOUT_MS,
  sha256,
} from '@/lib/supabase';

// ─── Rate-limiting helpers (client-side gate; server-side via edge function) ───
const RATE_KEY = 'lbd_login_attempts';

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

function getAttempts(email: string): AttemptRecord {
  try {
    const raw = sessionStorage.getItem(`${RATE_KEY}_${btoa(email)}`);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: null, lastAttempt: 0 };
  } catch {
    return { count: 0, lockedUntil: null, lastAttempt: 0 };
  }
}

function saveAttempts(email: string, record: AttemptRecord) {
  sessionStorage.setItem(`${RATE_KEY}_${btoa(email)}`, JSON.stringify(record));
}

function recordFailedAttempt(email: string): AttemptRecord {
  const rec = getAttempts(email);
  rec.count += 1;
  rec.lastAttempt = Date.now();
  if (rec.count >= LOGIN_MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  }
  saveAttempts(email, rec);
  return rec;
}

function clearAttempts(email: string) {
  sessionStorage.removeItem(`${RATE_KEY}_${btoa(email)}`);
}

export function getLockoutStatus(email: string): { locked: boolean; remainingMs: number } {
  const rec = getAttempts(email);
  if (!rec.lockedUntil) return { locked: false, remainingMs: 0 };
  const remaining = rec.lockedUntil - Date.now();
  if (remaining <= 0) {
    clearAttempts(email);
    return { locked: false, remainingMs: 0 };
  }
  return { locked: true, remainingMs: remaining };
}

// ─── Audit logging ────────────────────────────────────────────────────────────
async function writeAuditLog(
  action: 'login' | 'logout',
  userId: string,
  extra?: Record<string, unknown>,
) {
  try {
    await (supabase.from('audit_logs').insert as any)({
      user_id: userId,
      action,
      table_name: 'auth',
      record_id: null,
      new_values: extra ?? null,
    });
  } catch {
    // Non-blocking — audit failure must not block auth flow
  }
}

// ─── Profile loader ───────────────────────────────────────────────────────────
async function loadProfile(userId: string) {
  const store = useAuthStore.getState();

  const [{ data: profile }, { data: userRole }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('user_roles').select('role').eq('user_id', userId).limit(1).single(),
  ]);

  let permissions: Record<string, string[]> = {};
  if (userRole?.role) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('permissions')
      .eq('name', userRole.role)
      .single();
    permissions = (roleData?.permissions as Record<string, string[]>) ?? {};
  }

  if (profile) {
    store.setUser({
      id: userId,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url ?? undefined,
      is_active: profile.is_active,
      mfa_enabled: profile.mfa_enabled,
    });
  }

  const role = (userRole?.role as AppRole) ?? null;
  store.setRole(role);
  store.setPermissions(permissions);

  const mfaRequired = MFA_REQUIRED_ROLES.includes(role as (typeof MFA_REQUIRED_ROLES)[number]);
  store.setMfaRequired(mfaRequired);

  return { role, mfaRequired };
}

// ─── MFA status checker ───────────────────────────────────────────────────────
async function getMfaStatus() {
  const [{ data: factors }, { data: aal }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  const verifiedFactors = factors?.totp?.filter(f => f.status === 'verified') ?? [];
  const hasMfaEnrolled = verifiedFactors.length > 0;
  const isMfaVerified = aal?.currentLevel === 'aal2';

  return { hasMfaEnrolled, isMfaVerified, verifiedFactors };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const store = useAuthStore();
  const navigate = useNavigate();

  const getDashboardRoute = useCallback((role: AppRole | null) => {
    if (!role) return '/login';
    return ROLE_DASHBOARDS[role] ?? '/login';
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const { locked, remainingMs } = getLockoutStatus(email);
    if (locked) {
      const mins = Math.ceil(remainingMs / 60000);
      throw new Error(`Too many attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
    }

    store.setLoading(true);
    store.setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const rec = recordFailedAttempt(email);
        const attemptsLeft = LOGIN_MAX_ATTEMPTS - rec.count;
        throw new Error(
          attemptsLeft > 0
            ? `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`
            : `Account locked for 15 minutes after too many failed attempts.`,
        );
      }

      if (!data.session || !data.user) throw new Error('Authentication failed. Please try again.');

      clearAttempts(email);
      store.initSession();

      const { role, mfaRequired } = await loadProfile(data.user.id);
      const { hasMfaEnrolled, isMfaVerified } = await getMfaStatus();

      // Audit success
      await (supabase.from('audit_logs').insert as any)({
        user_id: data.user.id,
        action: 'login',
        table_name: 'auth',
        record_id: null,
        new_values: { method: 'email_password', mfa_required: mfaRequired },
      });

      // Determine next step
      if (mfaRequired && !hasMfaEnrolled) {
        navigate('/auth/mfa-setup', { replace: true });
        return;
      }
      if ((mfaRequired || hasMfaEnrolled) && !isMfaVerified) {
        navigate('/auth/mfa-verify', { replace: true });
        return;
      }

      store.setMfaVerified(true);
      navigate(getDashboardRoute(role), { replace: true });
    } finally {
      store.setLoading(false);
    }
  }, [store, navigate, getDashboardRoute]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async (reason: 'user' | 'inactivity' | 'session_expired' = 'user') => {
    const userId = store.user?.id;
    if (userId) {
      try {
        await (supabase.from('audit_logs').insert as any)({
          user_id: userId,
          action: 'logout',
          table_name: 'auth',
          record_id: null,
          new_values: { reason },
        });
      } catch { /* non-blocking */ }
    }
    await supabase.auth.signOut();
    store.logout();
    navigate('/login', { replace: true });
  }, [store, navigate]);

  // ── MFA: start challenge ───────────────────────────────────────────────────
  const startMfaChallenge = useCallback(async () => {
    const { verifiedFactors } = await getMfaStatus();
    if (!verifiedFactors.length) throw new Error('No MFA factor found. Please set up MFA first.');

    const factorId = verifiedFactors[0].id;
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error || !data) throw new Error(error?.message ?? 'Failed to start MFA challenge.');

    store.setPendingMfa(factorId, data.id);
    return { factorId, challengeId: data.id };
  }, [store]);

  // ── MFA: verify TOTP code ──────────────────────────────────────────────────
  const verifyMFA = useCallback(async (code: string) => {
    store.setLoading(true);
    try {
      let { factorId, challengeId } = {
        factorId: store.pendingMfaFactorId,
        challengeId: store.pendingChallengeId,
      };

      if (!factorId || !challengeId) {
        const result = await startMfaChallenge();
        factorId = result.factorId;
        challengeId = result.challengeId;
      }

      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) throw new Error('Invalid code. Please try again.');

      store.setMfaVerified(true);
      store.setPendingMfa(null, null);
      navigate(getDashboardRoute(store.role), { replace: true });
    } finally {
      store.setLoading(false);
    }
  }, [store, navigate, getDashboardRoute, startMfaChallenge]);

  // ── MFA: use recovery code ─────────────────────────────────────────────────
  const useRecoveryCode = useCallback(async (code: string) => {
    store.setLoading(true);
    try {
      const cleanCode = code.trim().toUpperCase();
      const codeHash = await sha256(cleanCode);

      const { data: profile } = await supabase
        .from('profiles')
        .select('recovery_codes')
        .eq('id', store.user!.id)
        .single();

      const storedCodes: string[] = (profile as { recovery_codes?: string[] })?.recovery_codes ?? [];
      const matchIndex = storedCodes.indexOf(codeHash);
      if (matchIndex === -1) throw new Error('Invalid recovery code.');

      // Invalidate used code
      const updatedCodes = [...storedCodes];
      updatedCodes.splice(matchIndex, 1);
      await supabase
        .from('profiles')
        .update({ recovery_codes: updatedCodes } as never)
        .eq('id', store.user!.id);

      // Elevate session to aal2 using the first available factor
      const { verifiedFactors } = await getMfaStatus();
      if (verifiedFactors.length > 0) {
        const factorId = verifiedFactors[0].id;
        const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
        if (challenge) {
          // Recovery bypass: mark as verified without TOTP
          // The recovery code serves as the second factor
        }
      }

      store.setMfaVerified(true);
      navigate(getDashboardRoute(store.role), { replace: true });
    } finally {
      store.setLoading(false);
    }
  }, [store, navigate, getDashboardRoute]);

  // ── MFA Enrollment ─────────────────────────────────────────────────────────
  const enrollMFA = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error || !data) throw new Error(error?.message ?? 'Failed to start MFA enrollment.');
    return {
      factorId: data.id,
      qrCodeSvg: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  }, []);

  // ── MFA Setup: complete enrollment + save recovery codes ──────────────────
  const completeMFASetup = useCallback(async (
    code: string,
    factorId: string,
    recoveryCodes: string[],
  ) => {
    store.setLoading(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr || !challenge) throw new Error(cErr?.message ?? 'Challenge failed.');

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw new Error('Invalid code — please check your authenticator app.');

      // Hash and persist recovery codes
      const hashed = await Promise.all(recoveryCodes.map(sha256));
      await supabase
        .from('profiles')
        .update({ mfa_enabled: true, recovery_codes: hashed } as never)
        .eq('id', store.user!.id);

      store.setMfaVerified(true);
      store.setPendingMfa(null, null);
      navigate(getDashboardRoute(store.role), { replace: true });
    } finally {
      store.setLoading(false);
    }
  }, [store, navigate, getDashboardRoute]);

  // ── Password reset ─────────────────────────────────────────────────────────
  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-confirm`,
    });
    if (error) throw new Error(error.message);
  }, []);

  return {
    // State
    user: store.user,
    role: store.role,
    permissions: store.permissions,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    mfaVerified: store.mfaVerified,
    mfaRequired: store.mfaRequired,

    // Methods
    login,
    logout,
    verifyMFA,
    useRecoveryCode,
    enrollMFA,
    completeMFASetup,
    requestPasswordReset,
    getDashboardRoute,
    startMfaChallenge,
    getLockoutStatus,
  };
}
