/**
 * useNotifications
 *
 * Manages the notifications table with Supabase Realtime subscriptions.
 * Provides unread count, list, mark-read, and mark-all-read.
 *
 * Realtime: subscribes to INSERT events on the notifications table
 * filtered by user_id so the bell badge updates instantly.
 */

import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type NotificationType =
  | 'escalation'
  | 'crisis'
  | 'overdue'
  | 'quality_gate'
  | 'portal_access'
  | 'system'
  | 'sentiment'
  | 'scenario'
  | 'content'
  | 'report';

export interface AppNotification {
  id:            string;
  user_id:       string;
  type:          NotificationType;
  title:         string;
  body:          string | null;
  link_to:       string | null;
  is_read:       boolean;
  engagement_id: string | null;
  created_at:    string;
  created_by:    string | null;
}

/* ─── Query keys ─────────────────────────────────────────────────────────── */

export const notifKeys = {
  all:   (userId: string) => ['notifications', userId] as QueryKey,
  unread:(userId: string) => ['notifications', userId, 'unread'] as QueryKey,
};

/* ─── Helper: create a notification ─────────────────────────────────────── */

export interface CreateNotificationPayload {
  user_id:       string;
  type:          NotificationType;
  title:         string;
  body?:         string;
  link_to?:      string;
  engagement_id?: string;
  created_by?:   string;
}

/**
 * Inserts a notification record directly via Supabase.
 * Use this from server-side or mutation callbacks.
 * For client-side call sites, prefer `useCreateNotification()`.
 */
export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id:       payload.user_id,
    type:          payload.type,
    title:         payload.title,
    body:          payload.body ?? null,
    link_to:       payload.link_to ?? null,
    engagement_id: payload.engagement_id ?? null,
    created_by:    payload.created_by ?? null,
  });
  if (error) console.error('[createNotification] error:', error.message);
}

/* ─── Hook: list notifications ───────────────────────────────────────────── */

export function useNotifications() {
  const { user } = useAuthStore();
  const userId = user?.id ?? '';
  const qc = useQueryClient();

  /* ── Fetch all notifications ── */
  const query = useQuery<AppNotification[]>({
    queryKey: notifKeys.all(userId),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('id,user_id,type,title,body,link_to,is_read,engagement_id,created_at,created_by')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    enabled: !!userId,
    staleTime: 0, // always fresh — Realtime keeps it current
  });

  /* ── Realtime subscription ── */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate to refetch with the new notification
          qc.invalidateQueries({ queryKey: notifKeys.all(userId) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: notifKeys.all(userId) });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, isLoading: query.isLoading };
}

/* ─── Hook: mark single notification as read ─────────────────────────────── */

export function useMarkAsRead() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (notifId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all(userId) });
    },
  });
}

/* ─── Hook: mark all notifications as read ───────────────────────────────── */

export function useMarkAllAsRead() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all(userId) });
    },
  });
}

/* ─── Hook: create a notification (client-side) ──────────────────────────── */

export function useCreateNotification() {
  return useMutation({
    mutationFn: (payload: CreateNotificationPayload) => createNotification(payload),
  });
}
