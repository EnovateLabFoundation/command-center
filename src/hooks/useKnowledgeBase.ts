/**
 * useKnowledgeBase
 *
 * Data hook for the firm-level Knowledge Base. Provides full-text search
 * across lessons learned, templates, frameworks, and SOPs. Supports
 * CRUD operations for lead_advisor and super_admin roles.
 *
 * Note: Uses (supabase as any) for knowledge_base table which may not
 * yet be in the auto-generated types file.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

/** Knowledge base entry category types */
export type KBCategory = 'lesson' | 'template' | 'framework' | 'sop';

export interface KBEntry {
  id: string;
  category: string;
  title: string;
  content: string | null;
  tags: string[];
  client_type: string | null;
  engagement_type: string | null;
  engagement_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
}

/* ─────────────────────────────────────────────
   Search / list entries
───────────────────────────────────────────── */

export function useKnowledgeBaseEntries(filters?: {
  category?: KBCategory;
  searchQuery?: string;
  clientType?: string;
}) {
  return useQuery({
    queryKey: ['knowledge-base', filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.category) {
        q = q.eq('category', filters.category);
      }

      if (filters?.clientType) {
        q = q.eq('client_type', filters.clientType);
      }

      // Full-text search using the tsvector column
      if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
        const terms = filters.searchQuery.trim().split(/\s+/).join(' & ');
        q = q.textSearch('search_vector', terms);
      }

      const { data, error } = await q.limit(200);
      if (error) throw error;
      return (data ?? []) as KBEntry[];
    },
  });
}

/* ─────────────────────────────────────────────
   Create entry
───────────────────────────────────────────── */

export function useCreateKBEntry() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (entry: {
      category: KBCategory;
      title: string;
      content?: string;
      tags?: string[];
      client_type?: string;
      engagement_type?: string;
      engagement_id?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('knowledge_base')
        .insert({
          ...entry,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as KBEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
  });
}

/* ─────────────────────────────────────────────
   Update entry
───────────────────────────────────────────── */

export function useUpdateKBEntry() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<KBEntry> & { id: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('knowledge_base')
        .update({ ...updates, updated_by: user.id })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as KBEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
  });
}

/* ─────────────────────────────────────────────
   Delete entry
───────────────────────────────────────────── */

export function useDeleteKBEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('knowledge_base')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
  });
}
