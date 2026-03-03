/**
 * useStakeholderEngagement
 *
 * Data layer for the Stakeholder Engagement Tracker.
 * CRUD for stakeholder_interactions and relationship health calculations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';
import type { StakeholderRow } from '@/hooks/usePowerMap';

/** Interaction record from stakeholder_interactions table */
export interface StakeholderInteraction {
  id: string;
  stakeholder_id: string;
  engagement_id: string;
  interaction_date: string;
  interaction_type: string;
  led_by_id: string | null;
  notes: string | null;
  outcome: string | null;
  follow_up_required: boolean;
  follow_up_status: string | null;
  follow_up_due_date: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
}

/** Relationship health assessment per stakeholder */
export interface RelationshipHealth {
  stakeholderId: string;
  contactStatus: 'green' | 'amber' | 'red';
  daysSinceContact: number | null;
  targetFrequencyDays: number;
  openFollowUps: number;
  overallHealth: 'green' | 'amber' | 'red';
}

export const INTERACTION_TYPES = ['Meeting', 'Call', 'Event', 'Message', 'Email', 'Site Visit'] as const;

/** Parse contact_frequency string into days */
function parseFrequencyDays(freq: string | null): number {
  if (!freq) return 30;
  const lower = freq.toLowerCase();
  if (lower.includes('week')) return 7;
  if (lower.includes('fortni') || lower.includes('bi-week')) return 14;
  if (lower.includes('month')) return 30;
  if (lower.includes('quarter')) return 90;
  return 30;
}

export function useStakeholderEngagement(engagementId: string | undefined) {
  const { toast } = useToast();
  const [interactions, setInteractions] = useState<StakeholderInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Fetch all interactions for this engagement ── */
  const fetchInteractions = useCallback(async () => {
    if (!engagementId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stakeholder_interactions')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('interaction_date', { ascending: false });
      if (error) throw error;
      setInteractions((data ?? []) as StakeholderInteraction[]);
    } catch (err) {
      console.error('[useStakeholderEngagement] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [engagementId]);

  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);

  /* ── Log interaction ── */
  const logInteraction = async (data: {
    stakeholder_id: string;
    interaction_date: string;
    interaction_type: string;
    notes?: string;
    outcome?: string;
    follow_up_required?: boolean;
    follow_up_due_date?: string | null;
    led_by_id?: string | null;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !engagementId) return null;

    const { data: result, error } = await supabase
      .from('stakeholder_interactions')
      .insert({
        ...data,
        engagement_id: engagementId,
        created_by: user.id,
        follow_up_status: data.follow_up_required ? 'pending' : null,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Failed to log interaction', description: error.message, variant: 'destructive' });
      return null;
    }

    // Update stakeholder's last_contact_date
    await supabase
      .from('stakeholders')
      .update({ last_contact_date: data.interaction_date, updated_by: user.id })
      .eq('id', data.stakeholder_id);

    await fetchInteractions();
    toast({ title: 'Interaction logged' });
    return result;
  };

  /* ── Update follow-up status ── */
  const updateFollowUp = async (interactionId: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('stakeholder_interactions')
      .update({ follow_up_status: status, updated_by: user?.id } as any)
      .eq('id', interactionId);

    if (error) {
      toast({ title: 'Failed to update follow-up', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchInteractions();
    return true;
  };

  /* ── Get interactions for a specific stakeholder ── */
  const getStakeholderInteractions = useCallback(
    (stakeholderId: string) =>
      interactions.filter((i) => i.stakeholder_id === stakeholderId),
    [interactions],
  );

  /* ── Calculate relationship health for all stakeholders ── */
  const calculateHealth = useCallback(
    (stakeholders: StakeholderRow[]): Map<string, RelationshipHealth> => {
      const map = new Map<string, RelationshipHealth>();
      const now = new Date();

      for (const sh of stakeholders) {
        const targetDays = parseFrequencyDays(sh.contact_frequency);
        const daysSince = sh.last_contact_date
          ? differenceInDays(now, new Date(sh.last_contact_date))
          : null;

        let contactStatus: 'green' | 'amber' | 'red' = 'green';
        if (daysSince === null) {
          contactStatus = 'red';
        } else if (daysSince > targetDays * 1.5) {
          contactStatus = 'red';
        } else if (daysSince > targetDays) {
          contactStatus = 'amber';
        }

        const openFollowUps = interactions.filter(
          (i) => i.stakeholder_id === sh.id && i.follow_up_required && i.follow_up_status === 'pending',
        ).length;

        // Overall health: worst of contact status and follow-up count
        let overallHealth: 'green' | 'amber' | 'red' = contactStatus;
        if (openFollowUps >= 3) overallHealth = 'red';
        else if (openFollowUps >= 1 && overallHealth === 'green') overallHealth = 'amber';

        map.set(sh.id, { stakeholderId: sh.id, contactStatus, daysSinceContact: daysSince, targetFrequencyDays: targetDays, openFollowUps, overallHealth });
      }
      return map;
    },
    [interactions],
  );

  return {
    interactions, isLoading, fetchInteractions,
    logInteraction, updateFollowUp, getStakeholderInteractions, calculateHealth,
  };
}
