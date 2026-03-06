/**
 * useReports
 *
 * Data hook for the Reports & Export module. Fetches reports, briefs,
 * and engagement data needed to generate reports. Provides mutation
 * functions for publishing reports to storage + database.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { reportToBlob } from '@/lib/reportEngine';
import { createNotification } from '@/hooks/useNotifications';
import type jsPDF from 'jspdf';

/* ─────────────────────────────────────────────
   Fetch published reports
───────────────────────────────────────────── */

export function usePublishedReports(engagementId: string | undefined) {
  return useQuery({
    queryKey: ['reports', engagementId],
    enabled: !!engagementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ─────────────────────────────────────────────
   Fetch intel items for report generation
───────────────────────────────────────────── */

export function useReportIntel(
  engagementId: string | undefined,
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery({
    queryKey: ['report-intel', engagementId, dateFrom, dateTo],
    enabled: !!engagementId,
    queryFn: async () => {
      let q = supabase
        .from('intel_items')
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('date_logged', { ascending: false });

      if (dateFrom) q = q.gte('date_logged', dateFrom);
      if (dateTo) q = q.lte('date_logged', dateTo);

      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ─────────────────────────────────────────────
   Fetch engagement + client for report headers
───────────────────────────────────────────── */

export function useReportEngagement(engagementId: string | undefined) {
  return useQuery({
    queryKey: ['report-engagement', engagementId],
    enabled: !!engagementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagements')
        .select('id, title, phase, status, client_id, clients(name)')
        .eq('id', engagementId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/* ─────────────────────────────────────────────
   Publish report mutation
───────────────────────────────────────────── */

interface PublishParams {
  engagementId: string;
  title: string;
  type: string;
  doc: jsPDF;
  isPublic: boolean;
}

export function usePublishReport() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ engagementId, title, type, doc, isPublic }: PublishParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1. Upload PDF to storage
      const blob = reportToBlob(doc);
      const date = new Date().toISOString().split('T')[0];
      const filePath = `${engagementId}/${type}_${date}_${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, blob, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      // 2. Create report record
      const { data, error } = await supabase
        .from('reports')
        .insert({
          engagement_id: engagementId,
          title,
          type,
          file_path: filePath,
          published_by: user.id,
          is_public: isPublic,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['reports', vars.engagementId] });

      // Notify all portal users (client_principals) with access to this engagement
      try {
        const { data: portalRows } = await supabase
          .from('client_portal_access')
          .select('user_id')
          .eq('engagement_id', vars.engagementId)
          .eq('is_active', true);

        for (const row of (portalRows ?? [])) {
          await createNotification({
            user_id: row.user_id,
            type: 'report',
            title: `New Report Published: ${vars.title}`,
            body: `A new ${vars.type} report is now available in your portal.`,
            link_to: '/portal',
            engagement_id: vars.engagementId,
          });
        }
      } catch (err) {
        console.error('[usePublishReport] notification error:', err);
      }
    },
  });
}
