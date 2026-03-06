/**
 * useContentCalendar
 *
 * Data layer for the Content Calendar & Asset Manager module.
 * Handles CRUD operations on content_items, storage asset management,
 * and engagement metrics tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/hooks/useNotifications';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type ContentItem = Tables<'content_items'>;
type ContentInsert = TablesInsert<'content_items'>;
type ContentUpdate = TablesUpdate<'content_items'>;

/** Stored asset metadata for the asset library */
export interface StorageAsset {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
}

/** Platform character limits (advisory) */
export const PLATFORM_LIMITS: Record<string, number | null> = {
  'Twitter/X': 280,
  Facebook: null,
  Instagram: 2200,
  LinkedIn: 3000,
  WhatsApp: 65536,
  TikTok: 2200,
  YouTube: 5000,
};

export function useContentCalendar(engagementId: string | undefined) {
  const { toast } = useToast();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [assets, setAssets] = useState<StorageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);

  /* ── Fetch content items ── */
  const fetchItems = useCallback(async () => {
    if (!engagementId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      setItems(data ?? []);
    } catch (err: unknown) {
      console.error('[useContentCalendar] fetch error:', err);
      toast({ title: 'Error loading content items', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [engagementId, toast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  /* ── Create content item ── */
  const createItem = async (item: Omit<ContentInsert, 'engagement_id' | 'created_by'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !engagementId) return null;

    const { data, error } = await supabase
      .from('content_items')
      .insert({ ...item, engagement_id: engagementId, created_by: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: 'Failed to create content item', description: error.message, variant: 'destructive' });
      return null;
    }
    await fetchItems();
    toast({ title: 'Content item created' });
    return data;
  };

  /* ── Update content item ── */
  const updateItem = async (id: string, updates: ContentUpdate) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('content_items')
      .update({ ...updates, updated_by: user?.id ?? null })
      .eq('id', id);

    if (error) {
      toast({ title: 'Failed to update content item', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchItems();
    toast({ title: 'Content item updated' });

    // Notify when content is approved
    if (updates.status === 'approved' && engagementId) {
      try {
        const { data: eng } = await supabase
          .from('engagements')
          .select('lead_advisor_id')
          .eq('id', engagementId)
          .maybeSingle();
        if (eng?.lead_advisor_id) {
          await createNotification({
            user_id: eng.lead_advisor_id,
            type: 'content',
            title: 'Content Item Approved',
            body: 'A content item has been approved and is ready for publishing.',
            link_to: `/engagements/${engagementId}/content-calendar`,
            engagement_id: engagementId,
          });
        }
      } catch (err) {
        console.error('[useContentCalendar] approval notification error:', err);
      }
    }

    return true;
  };

  /* ── Delete content item ── */
  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Failed to delete content item', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchItems();
    toast({ title: 'Content item deleted' });
    return true;
  };

  /* ── Fetch storage assets ── */
  const fetchAssets = useCallback(async () => {
    if (!engagementId) return;
    setIsAssetsLoading(true);
    try {
      const folderPath = `engagements/${engagementId}/assets`;
      const { data, error } = await supabase.storage
        .from('content-assets')
        .list(folderPath, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;

      const mapped: StorageAsset[] = (data ?? [])
        .filter((f) => f.name !== '.emptyFolderPlaceholder')
        .map((f) => {
          const { data: urlData } = supabase.storage
            .from('content-assets')
            .getPublicUrl(`${folderPath}/${f.name}`);
          return {
            id: f.id ?? f.name,
            name: f.name,
            size: f.metadata?.size ?? 0,
            mimeType: f.metadata?.mimetype ?? 'application/octet-stream',
            url: urlData.publicUrl,
            uploadedBy: f.metadata?.owner ?? '',
            createdAt: f.created_at ?? '',
          };
        });
      setAssets(mapped);
    } catch (err) {
      console.error('[useContentCalendar] asset fetch error:', err);
    } finally {
      setIsAssetsLoading(false);
    }
  }, [engagementId]);

  /* ── Upload asset ── */
  const uploadAsset = async (file: File) => {
    if (!engagementId) return null;
    const folderPath = `engagements/${engagementId}/assets`;
    const filePath = `${folderPath}/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from('content-assets')
      .upload(filePath, file, { upsert: false });

    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'File uploaded' });
    await fetchAssets();
    return filePath;
  };

  /* ── Delete asset ── */
  const deleteAsset = async (name: string) => {
    if (!engagementId) return false;
    const filePath = `engagements/${engagementId}/assets/${name}`;
    const { error } = await supabase.storage
      .from('content-assets')
      .remove([filePath]);

    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchAssets();
    toast({ title: 'Asset deleted' });
    return true;
  };

  return {
    items,
    isLoading,
    assets,
    isAssetsLoading,
    fetchItems,
    fetchAssets,
    createItem,
    updateItem,
    deleteItem,
    uploadAsset,
    deleteAsset,
  };
}
