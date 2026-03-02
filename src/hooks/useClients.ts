/**
 * useClients
 * React Query hooks for the Client Management & Qualification Engine.
 *
 * Exports:
 *  useClientList        — paginated list with per-client engagement counts
 *  useConflictCheck     — automated name/email conflict detection
 *  useCreateClient      — create client record + NDA upload + audit log
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Shared types
───────────────────────────────────────────── */

export type ClientType = 'legislator' | 'governor' | 'ministry' | 'civic' | 'party';

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  legislator: 'Aspiring Legislator',
  governor:   'Aspiring Governor',
  ministry:   'Government Ministry / Agency',
  civic:      'Civic / Development Institution',
  party:      'Political Party',
};

export interface ClientRow extends Record<string, unknown> {
  id: string;
  name: string;
  type: ClientType;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  brief_description: string | null;
  nda_signed: boolean;
  nda_document_url: string | null;
  conflict_check_passed: boolean;
  qualification_status: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // computed
  active_engagements: number;
  total_engagements: number;
}

/* ─────────────────────────────────────────────
   1. Client List
───────────────────────────────────────────── */

export function useClientList() {
  return useQuery<ClientRow[]>({
    queryKey: ['clients'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [clientsRes, engsRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('engagements').select('client_id, status'),
      ]);
      if (clientsRes.error) throw clientsRes.error;

      // Count engagements per client
      const engMap: Record<string, { total: number; active: number }> = {};
      for (const eng of engsRes.data ?? []) {
        if (!engMap[eng.client_id]) engMap[eng.client_id] = { total: 0, active: 0 };
        engMap[eng.client_id].total++;
        if (eng.status === 'active') engMap[eng.client_id].active++;
      }

      return (clientsRes.data ?? []).map(c => ({
        ...c,
        active_engagements: engMap[c.id]?.active ?? 0,
        total_engagements:  engMap[c.id]?.total ?? 0,
      })) as ClientRow[];
    },
  });
}

/* ─────────────────────────────────────────────
   2. Conflict Check
───────────────────────────────────────────── */

export interface ConflictMatch {
  type: 'name' | 'email';
  description: string;
  existing_id: string;
  existing_name: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  matches: ConflictMatch[];
}

/**
 * Runs automatically when `enabled` is true.
 * Checks for name similarity (ilike on first significant word)
 * and exact email match against existing clients.
 */
export function useConflictCheck(
  name: string,
  email: string,
  enabled = true,
) {
  return useQuery<ConflictResult>({
    queryKey: ['conflict-check', name.trim(), email.trim()],
    enabled: enabled && (name.trim().length > 1 || email.trim().length > 0),
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Extract first significant word (>2 chars) for fuzzy name matching
      const significantWord = name
        .trim()
        .split(/\s+/)
        .find(w => w.length > 2) ?? name.trim();

      const [nameRes, emailRes] = await Promise.all([
        significantWord.length > 2
          ? supabase
              .from('clients')
              .select('id, name, contact_email')
              .ilike('name', `%${significantWord}%`)
              .limit(10)
          : { data: [] as { id: string; name: string; contact_email: string | null }[], error: null },
        email.trim()
          ? supabase
              .from('clients')
              .select('id, name, contact_email')
              .eq('contact_email', email.trim())
              .limit(10)
          : { data: [] as { id: string; name: string; contact_email: string | null }[], error: null },
      ]);

      const seen = new Set<string>();
      const matches: ConflictMatch[] = [];

      for (const c of nameRes.data ?? []) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        matches.push({
          type: 'name',
          description: `Name similarity detected`,
          existing_id: c.id,
          existing_name: c.name,
        });
      }

      for (const c of emailRes.data ?? []) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        matches.push({
          type: 'email',
          description: `Contact email already exists`,
          existing_id: c.id,
          existing_name: c.name,
        });
      }

      return { hasConflict: matches.length > 0, matches };
    },
  });
}

/* ─────────────────────────────────────────────
   3. Create Client
───────────────────────────────────────────── */

export interface CreateClientPayload {
  // Client table fields
  name: string;
  type: ClientType;
  contact_name: string;
  contact_email: string;
  phone?: string | null;
  brief_description?: string | null;
  nda_signed: boolean;
  conflict_check_passed: boolean;
  qualification_status: string;
  // NDA file (uploaded to Storage)
  ndaFile: File | null;
  // Qualification checklist — stored in audit log
  qualificationChecklist: Record<string, unknown>;
}

export function useCreateClient() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const {
        ndaFile,
        qualificationChecklist,
        name, type, contact_name, contact_email,
        phone, brief_description, nda_signed, conflict_check_passed, qualification_status,
      } = payload;

      // ── 1. Upload NDA document (non-blocking if storage not configured) ──
      let nda_document_url: string | null = null;
      if (ndaFile) {
        try {
          const safeName = ndaFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
          const path = `${Date.now()}-${safeName}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('nda-documents')
            .upload(path, ndaFile, { upsert: false });

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('nda-documents')
              .getPublicUrl(uploadData.path);
            nda_document_url = publicUrl;
          }
        } catch {
          // Storage may not be configured — proceed without URL
          console.warn('[useCreateClient] NDA upload skipped (storage not configured)');
        }
      }

      // ── 2. Insert client record ──
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name,
          type,
          contact_name,
          contact_email,
          phone:                phone || null,
          brief_description:    brief_description || null,
          nda_signed,
          nda_document_url,
          conflict_check_passed,
          qualification_status,
          is_active:            true,
          created_by:           user!.id,
          updated_by:           user!.id,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // ── 3. Write audit log ──
      await supabase.from('audit_logs').insert({
        action:     'create',
        table_name: 'clients',
        record_id:  newClient.id,
        user_id:    user!.id,
        new_values: {
          name, type, contact_name, contact_email,
          conflict_check_passed,
          qualification_status,
          qualification_checklist: qualificationChecklist,
        },
      });

      return newClient;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

/* ─────────────────────────────────────────────
   4. Log conflict check result to audit_logs
───────────────────────────────────────────── */

export async function logConflictCheck(
  userId: string,
  clientName: string,
  result: ConflictResult,
  override: boolean,
  overrideNotes: string | null,
) {
  await supabase.from('audit_logs').insert({
    action:     'create',
    table_name: 'clients',
    record_id:  null,
    user_id:    userId,
    new_values: {
      event:          'conflict_check',
      client_name:    clientName,
      conflict_found: result.hasConflict,
      matches:        result.matches,
      override,
      override_notes: overrideNotes,
    },
  });
}
