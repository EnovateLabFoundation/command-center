import { useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { MFA_REQUIRED_ROLES, ROLE_DASHBOARDS } from '@/lib/supabase';
import type { AppRole } from '@/stores/authStore';

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
  store.setMfaRequired(
    MFA_REQUIRED_ROLES.includes(role as (typeof MFA_REQUIRED_ROLES)[number]),
  );

  return role;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore();
  const navigate = useNavigate();

  // ── Bootstrap: restore session on page load ────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      store.setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          await loadProfile(session.user.id);
          store.initSession();

          // Check MFA level
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          store.setMfaVerified(aal?.currentLevel === 'aal2');
        }
      } finally {
        if (mounted) store.setLoading(false);
      }
    };

    init();

    // ── Auth state changes (sign-in, sign-out, token refresh) ─────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        store.logout();
        navigate('/login', { replace: true });
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await loadProfile(session.user.id);
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        store.setMfaVerified(aal?.currentLevel === 'aal2');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Activity monitoring ────────────────────────────────────────────────────
  useEffect(() => {
    if (!store.isAuthenticated) return;
    const update = () => store.updateActivity();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach(e => window.addEventListener(e, update, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, update));
  }, [store.isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session timeout monitor ────────────────────────────────────────────────
  useEffect(() => {
    if (!store.isAuthenticated) return;

    const tick = setInterval(() => {
      const s = useAuthStore.getState();
      if (!s.isAuthenticated) return;

      if (!s.isActivityValid()) {
        supabase.auth.signOut();
        s.logout();
        navigate('/login?reason=inactivity', { replace: true });
        return;
      }
      if (!s.isSessionValid()) {
        supabase.auth.signOut();
        s.logout();
        navigate('/login?reason=expired', { replace: true });
      }
    }, 60_000); // check every minute

    return () => clearInterval(tick);
  }, [store.isAuthenticated, navigate]);

  return <>{children}</>;
}
