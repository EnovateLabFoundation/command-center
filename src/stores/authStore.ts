import { create } from 'zustand';

export type AppRole = 'admin' | 'moderator' | 'analyst' | 'client' | 'viewer';

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface AuthState {
  user: AuthUser | null;
  role: AppRole | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setUser: (user: AuthUser | null) => void;
  setRole: (role: AppRole | null) => void;
  setPermissions: (permissions: Permission[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  permissions: [],
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
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
      error: null,
    }),
}));
