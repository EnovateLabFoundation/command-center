import { create } from 'zustand';

export type AppRole = 
  | 'super_admin' 
  | 'lead_advisor' 
  | 'senior_advisor' 
  | 'comms_director' 
  | 'intel_analyst' 
  | 'digital_strategist' 
  | 'client_principal';

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role_id?: string;
  is_active: boolean;
  mfa_enabled: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  role: AppRole | null;
  permissions: Record<string, string[]>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setUser: (user: AuthUser | null) => void;
  setRole: (role: AppRole | null) => void;
  setPermissions: (permissions: Record<string, string[]>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  hasPermission: (resource: string, action: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  permissions: {},
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, error: null }),

  setRole: (role) => set({ role }),

  setPermissions: (permissions) => set({ permissions }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  logout: () =>
    set({
      user: null,
      role: null,
      permissions: {},
      isAuthenticated: false,
      isLoading: false,
      error: null,
    }),

  hasPermission: (resource: string, action: string) => {
    const { permissions, role } = get();
    if (role === 'super_admin') return true;
    const resourcePerms = permissions[resource];
    return resourcePerms ? resourcePerms.includes(action) : false;
  },
}));
