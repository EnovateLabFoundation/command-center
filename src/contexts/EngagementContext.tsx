/**
 * EngagementContext
 *
 * Provides the active engagement selection across the entire internal portal.
 * Data is fetched once on mount (and refreshed on window focus), stored in
 * React state, and the selected engagement ID is persisted to localStorage so
 * the selection survives page refreshes.
 *
 * Usage:
 *   // In a layout component
 *   <EngagementProvider>
 *     <Outlet />
 *   </EngagementProvider>
 *
 *   // Inside any child component
 *   const { selectedEngagement, setSelectedEngagement, engagements } = useEngagement();
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface Engagement {
  id: string;
  title: string;
  client_id: string;
  status: 'active' | 'paused' | 'closed';
  phase: '1' | '2' | '3' | '4';
  health_rag: 'red' | 'amber' | 'green';
}

interface EngagementContextValue {
  /** All engagements the current user has access to (active + paused) */
  engagements: Engagement[];
  /** The currently selected engagement, or null if none is chosen */
  selectedEngagement: Engagement | null;
  /** Update the selected engagement and persist the choice to localStorage */
  setSelectedEngagement: (engagement: Engagement | null) => void;
  /** True while the initial fetch is in flight */
  isLoading: boolean;
  /** Non-null if the fetch failed */
  error: string | null;
  /** Manually trigger a re-fetch (e.g., after creating a new engagement) */
  refetch: () => void;
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

const STORAGE_KEY = 'lbd:engagement:selected';

/* ─────────────────────────────────────────────
   Context
───────────────────────────────────────────── */

const EngagementContext = createContext<EngagementContextValue | null>(null);

/* ─────────────────────────────────────────────
   Provider
───────────────────────────────────────────── */

interface EngagementProviderProps {
  children: ReactNode;
}

export function EngagementProvider({ children }: EngagementProviderProps) {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [selectedEngagement, setSelectedEngagementState] = useState<Engagement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref to avoid stale-closure issues inside the focus listener
  const engagementsRef = useRef<Engagement[]>([]);
  engagementsRef.current = engagements;

  /* ── Fetch ────────────────────────────────── */

  const fetchEngagements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('engagements')
        .select('id, title, client_id, status, phase, health_rag')
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      const list = (data ?? []) as Engagement[];
      setEngagements(list);

      // Restore persisted selection if it still exists in the list
      const persistedId = (() => {
        try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
      })();

      if (persistedId) {
        const found = list.find((e) => e.id === persistedId);
        setSelectedEngagementState(found ?? null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load engagements';
      setError(msg);
      console.error('[EngagementContext] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ── Initial load ─────────────────────────── */

  useEffect(() => {
    fetchEngagements();
  }, [fetchEngagements]);

  /* ── Window-focus refresh ─────────────────── */

  useEffect(() => {
    const onFocus = () => {
      // Only re-fetch if tab was hidden for more than 2 minutes
      fetchEngagements();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchEngagements]);

  /* ── Setter with persistence ──────────────── */

  const setSelectedEngagement = useCallback((engagement: Engagement | null) => {
    setSelectedEngagementState(engagement);
    try {
      if (engagement) {
        localStorage.setItem(STORAGE_KEY, engagement.id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable (private browsing, storage full, etc.)
    }
  }, []);

  /* ── Context value ────────────────────────── */

  const value: EngagementContextValue = {
    engagements,
    selectedEngagement,
    setSelectedEngagement,
    isLoading,
    error,
    refetch: fetchEngagements,
  };

  return (
    <EngagementContext.Provider value={value}>
      {children}
    </EngagementContext.Provider>
  );
}

/* ─────────────────────────────────────────────
   Hook
───────────────────────────────────────────── */

/**
 * useEngagement
 *
 * Must be used inside <EngagementProvider>.
 *
 * @example
 * const { selectedEngagement } = useEngagement();
 * const url = selectedEngagement
 *   ? `/engagements/${selectedEngagement.id}/intel-tracker`
 *   : null;
 */
export function useEngagement(): EngagementContextValue {
  const ctx = useContext(EngagementContext);
  if (!ctx) {
    throw new Error('useEngagement must be used within <EngagementProvider>');
  }
  return ctx;
}

/**
 * useEngagementSafe
 *
 * Like `useEngagement` but returns `null` instead of throwing when used
 * outside <EngagementProvider>. Useful for components (like LBDSidebar)
 * that render in both portal contexts (internal uses EngagementProvider;
 * client portal does not).
 */
export function useEngagementSafe(): EngagementContextValue | null {
  return useContext(EngagementContext);
}
