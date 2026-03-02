import { create } from 'zustand';

export type AppRole =
  | 'super_admin'
  | 'lead_advisor'
  | 'senior_advisor'
  | 'comms_director'
  | 'intel_analyst'
  | 'digital_strategist'
  | 'client_principal';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_active: boolean;
  mfa_enabled: boolean;
}

export interface AuthState {
  // Identity
  user: AuthUser | null;
  role: AppRole | null;
  permissions: Record<string, string[]>;

  // Status
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // MFA
  mfaVerified: boolean;
  mfaRequired: boolean;
  pendingMfaFactorId: string | null;
  pendingChallengeId: string | null;

  // Session timing (all Unix ms)
  sessionStart: number | null;
  sessionExpiry: number | null;
  lastActivity: number | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setRole: (role: AppRole | null) => void;
  setPermissions: (permissions: Record<string, string[]>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMfaVerified: (verified: boolean) => void;
  setMfaRequired: (required: boolean) => void;
  setPendingMfa: (factorId: string | null, challengeId: string | null) => void;
  initSession: () => void;
  updateActivity: () => void;
  logout: () => void;

  // Computed
  hasPermission: (resource: string, action: string) => boolean;
  isSessionValid: () => boolean;
  isActivityValid: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  permissions: {},
  isAuthenticated: false,
  isLoading: true,
  error: null,
  mfaVerified: false,
  mfaRequired: false,
  pendingMfaFactorId: null,
  pendingChallengeId: null,
  sessionStart: null,
  sessionExpiry: null,
  lastActivity: null,

  setUser: (user) => set({ user, isAuthenticated: !!user, error: null }),
  setRole: (role) => set({ role }),
  setPermissions: (permissions) => set({ permissions }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setMfaVerified: (mfaVerified) => set({ mfaVerified }),
  setMfaRequired: (mfaRequired) => set({ mfaRequired }),
  setPendingMfa: (factorId, challengeId) =>
    set({ pendingMfaFactorId: factorId, pendingChallengeId: challengeId }),

  initSession: () => {
    const now = Date.now();
    set({
      sessionStart: now,
      sessionExpiry: now + 8 * 60 * 60 * 1000,   // 8 hours
      lastActivity: now,
    });
  },

  updateActivity: () => set({ lastActivity: Date.now() }),

  logout: () =>
    set({
      user: null,
      role: null,
      permissions: {},
      isAuthenticated: false,
      isLoading: false,
      error: null,
      mfaVerified: false,
      mfaRequired: false,
      pendingMfaFactorId: null,
      pendingChallengeId: null,
      sessionStart: null,
      sessionExpiry: null,
      lastActivity: null,
    }),

  hasPermission: (resource, action) => {
    const { permissions, role } = get();
    if (role === 'super_admin') return true;
    return permissions[resource]?.includes(action) ?? false;
  },

  isSessionValid: () => {
    const { sessionExpiry, isAuthenticated } = get();
    if (!isAuthenticated || !sessionExpiry) return false;
    return Date.now() < sessionExpiry;
  },

  isActivityValid: () => {
    const { lastActivity, isAuthenticated } = get();
    if (!isAuthenticated || !lastActivity) return false;
    return Date.now() - lastActivity < 30 * 60 * 1000;
  },
}));
