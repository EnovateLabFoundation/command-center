/**
 * useDiscoverySession
 *
 * React Query hook for the discovery_sessions table.
 * Provides per-area note/summary management, auto-save, AI summarisation,
 * and session locking.
 *
 * Architecture:
 *  - All area data stored in a single JSONB column `areas`
 *    { "1": { notes: "", summary: "" }, ... "7": { ... } }
 *  - Optimistic local state mirrors DB; save flushes to Supabase
 *  - AI summarise calls the `discovery-summarise` Edge Function
 *  - Lock sets is_locked=true and calls the onboarding updateStep(2, 'complete')
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface AreaData {
  notes:   string;
  summary: string; // AI bullet text, newline-separated
}

export type AreasRecord = Record<string, AreaData>;

export interface DiscoverySession {
  id:            string;
  engagement_id: string;
  areas:         AreasRecord;
  is_locked:     boolean;
  locked_at:     string | null;
  locked_by:     string | null;
  created_at:    string;
  updated_at:    string;
  created_by:    string | null;
  updated_by:    string | null;
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function emptyAreas(): AreasRecord {
  const rec: AreasRecord = {};
  for (let i = 1; i <= 7; i++) {
    rec[String(i)] = { notes: '', summary: '' };
  }
  return rec;
}

function mergeAreas(base: AreasRecord, override: Partial<AreasRecord>): AreasRecord {
  const merged = { ...emptyAreas(), ...base };
  for (const [k, v] of Object.entries(override)) {
    merged[k] = { ...merged[k], ...v };
  }
  return merged;
}

/* ─────────────────────────────────────────────
   Hook
───────────────────────────────────────────── */

export function useDiscoverySession(engagementId: string | undefined) {
  const { user }   = useAuthStore();
  const qc         = useQueryClient();
  const queryKey   = ['discovery-session', engagementId];

  /* ── Fetch / create session ─────────────────────────────────────────────── */
  const { data: session, isLoading, error } = useQuery({
    queryKey,
    enabled: !!engagementId,
    staleTime: 10_000,
    queryFn: async () => {
      // Try to fetch existing session
      // discovery_sessions table may not exist yet in typed schema — cast to bypass
      const { data: existing, error: fetchErr } = await (supabase as any)
        .from('discovery_sessions')
        .select('*')
        .eq('engagement_id', engagementId!)
        .maybeSingle();

      if (fetchErr) throw new Error(fetchErr.message);

      // If none exists, create a new one
      if (!existing) {
        const { data: created, error: insertErr } = await (supabase as any)
          .from('discovery_sessions')
          .insert({
            engagement_id: engagementId!,
            areas:         emptyAreas(),
            created_by:    user?.id,
            updated_by:    user?.id,
          })
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);
        return created as DiscoverySession;
      }

      return existing as DiscoverySession;
    },
  });

  /* ── Local state (optimistic) ───────────────────────────────────────────── */
  const [localAreas, setLocalAreas] = useState<AreasRecord>(emptyAreas);
  const [isDirty, setIsDirty]       = useState(false);
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  // Sync from DB on load
  useEffect(() => {
    if (session?.areas) {
      setLocalAreas(mergeAreas(session.areas, {}));
      setIsDirty(false);
    }
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Mutators ───────────────────────────────────────────────────────────── */

  function updateAreaNotes(areaIndex: number, notes: string) {
    setLocalAreas((prev) => ({
      ...prev,
      [String(areaIndex)]: { ...prev[String(areaIndex)], notes },
    }));
    setIsDirty(true);
  }

  function updateAreaSummary(areaIndex: number, summary: string) {
    setLocalAreas((prev) => ({
      ...prev,
      [String(areaIndex)]: { ...prev[String(areaIndex)], summary },
    }));
    setIsDirty(true);
  }

  /* ── Save mutation ──────────────────────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async (areas: AreasRecord) => {
      if (!engagementId || !session) return;
      const { error: saveErr } = await (supabase as any)
        .from('discovery_sessions')
        .update({
          areas,
          updated_by: user?.id,
        })
        .eq('id', session.id);

      if (saveErr) throw new Error(saveErr.message);
    },
    onSuccess: () => {
      setIsDirty(false);
      qc.invalidateQueries({ queryKey });
    },
  });

  const save = useCallback(async () => {
    await saveMutation.mutateAsync(localAreas);
  }, [localAreas, saveMutation]);

  /* ── Auto-save every 30 seconds when dirty ──────────────────────────────── */
  useEffect(() => {
    if (!session || session.is_locked) return;

    const interval = setInterval(() => {
      if (dirtyRef.current) {
        saveMutation.mutate(localAreas);
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [session?.id, session?.is_locked]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Summarise (AI) mutation ────────────────────────────────────────────── */
  const [summarising, setSummarising] = useState<Record<number, boolean>>({});

  const summarise = useCallback(
    async (areaIndex: number, areaTitle: string) => {
      const notes = localAreas[String(areaIndex)]?.notes ?? '';
      if (!notes.trim()) {
        throw new Error('Please add notes before generating an AI summary.');
      }

      setSummarising((prev) => ({ ...prev, [areaIndex]: true }));
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          'discovery-summarise',
          {
            body: {
              area_title:    areaTitle,
              notes_text:    notes,
              area_index:    areaIndex,
              engagement_id: engagementId,
            },
          },
        );

        if (fnErr) throw new Error(fnErr.message);

        const summary: string =
          (data as { summary?: string; bullets?: string[] })?.summary ?? '';

        updateAreaSummary(areaIndex, summary);
        // Auto-save after AI summarise
        await saveMutation.mutateAsync({
          ...localAreas,
          [String(areaIndex)]: {
            notes:   localAreas[String(areaIndex)]?.notes ?? '',
            summary,
          },
        });
      } finally {
        setSummarising((prev) => ({ ...prev, [areaIndex]: false }));
      }
    },
    [localAreas, engagementId, saveMutation], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── Lock session mutation ──────────────────────────────────────────────── */
  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!engagementId || !session) return;
      // Save current areas first
      await (supabase as any)
        .from('discovery_sessions')
        .update({
          areas:     localAreas,
          is_locked: true,
          locked_at: new Date().toISOString(),
          locked_by: user?.id,
          updated_by: user?.id,
        })
        .eq('id', session.id);

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id:    user?.id,
        action:     'update',
        table_name: 'discovery_sessions',
        record_id:  session.id,
        new_values: {
          is_locked:    true,
          locked_at:    new Date().toISOString(),
          engagement_id: engagementId,
        },
      });
    },
    onSuccess: () => {
      setIsDirty(false);
      qc.invalidateQueries({ queryKey });
    },
  });

  /* ── Derived ────────────────────────────────────────────────────────────── */
  const completedCount = Object.values(localAreas).filter(
    (a) => a.notes.trim().length > 0,
  ).length;

  const isFullyComplete = completedCount === 7;

  return {
    session,
    isLoading,
    error:           error?.message ?? null,
    localAreas,
    updateAreaNotes,
    updateAreaSummary,
    save,
    isSaving:        saveMutation.isPending,
    summarise,
    isSummarising:   summarising,
    lock:            () => lockMutation.mutateAsync(),
    isLocking:       lockMutation.isPending,
    isDirty,
    completedCount,
    isFullyComplete,
    isLocked:        session?.is_locked ?? false,
  };
}
