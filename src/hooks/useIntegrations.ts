/**
 * useIntegrations
 *
 * Data layer for the Integration Management Console.
 * CRUD for integration_configs and sync_logs tables.
 * All third-party API calls are delegated to Edge Functions — 
 * this hook only manages configuration and triggers sync operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

/* ── Types ──────────────────────────────────────────────────────────────────── */

export type IntegrationConfig = Tables<'integration_configs'>;

/** Sync log row from the sync_logs table */
export interface SyncLog {
  id: string;
  platform_name: string;
  integration_id: string | null;
  triggered_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  records_ingested: number | null;
  status: string;
  error_message: string | null;
  engagement_id: string | null;
  triggered_by: string | null;
  created_at: string;
}

/** Platform definition for the UI cards grid */
export interface PlatformDefinition {
  key: string;
  name: string;
  icon: string;
  description: string;
  configFields: ConfigField[];
  syncFunction: string | null;
}

/** Additional config field definition per platform */
export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  placeholder?: string;
  options?: string[];
}

/** All supported platforms with their config schemas */
export const PLATFORMS: PlatformDefinition[] = [
  {
    key: 'twitter',
    name: 'Twitter/X API',
    icon: '𝕏',
    description: 'Monitor tweets, mentions, and hashtags in real-time.',
    syncFunction: 'sync-twitter',
    configFields: [
      { key: 'bearer_token', label: 'Bearer Token', type: 'text', placeholder: 'Enter bearer token' },
    ],
  },
  {
    key: 'meta_facebook',
    name: 'Meta Graph API (Facebook)',
    icon: 'f',
    description: 'Track Facebook page metrics and engagement.',
    syncFunction: 'sync-meta',
    configFields: [
      { key: 'access_token', label: 'Page Access Token', type: 'text' },
      { key: 'page_ids', label: 'Page IDs (comma-separated)', type: 'text' },
    ],
  },
  {
    key: 'meta_instagram',
    name: 'Meta Graph API (Instagram)',
    icon: '📷',
    description: 'Monitor Instagram follower growth and post engagement.',
    syncFunction: 'sync-meta',
    configFields: [
      { key: 'access_token', label: 'Access Token', type: 'text' },
      { key: 'business_account_ids', label: 'Business Account IDs', type: 'text' },
    ],
  },
  {
    key: 'serpapi',
    name: 'Google Search (SerpAPI)',
    icon: '🔍',
    description: 'Monitor Google search results and SERP features.',
    syncFunction: null,
    configFields: [
      { key: 'search_engine', label: 'Search Engine', type: 'select', options: ['google', 'bing', 'yahoo'] },
    ],
  },
  {
    key: 'google_trends',
    name: 'Google Trends',
    icon: '📈',
    description: 'Track trending search topics and interest over time.',
    syncFunction: null,
    configFields: [],
  },
  {
    key: 'newsapi',
    name: 'News API',
    icon: '📰',
    description: 'Aggregate news articles from 80,000+ sources.',
    syncFunction: 'sync-news',
    configFields: [
      { key: 'language', label: 'Language', type: 'select', options: ['en', 'fr', 'de', 'es', 'pt'] },
      { key: 'country', label: 'Country Code', type: 'text', placeholder: 'e.g. ng, us, gb' },
    ],
  },
  {
    key: 'youtube',
    name: 'YouTube Data API',
    icon: '▶️',
    description: 'Track YouTube channel metrics and video performance.',
    syncFunction: null,
    configFields: [
      { key: 'channel_ids', label: 'Channel IDs (comma-separated)', type: 'text' },
    ],
  },
  {
    key: 'openai',
    name: 'OpenAI API',
    icon: '🤖',
    description: 'AI-powered sentiment analysis and content summarisation.',
    syncFunction: null,
    configFields: [
      { key: 'model', label: 'Default Model', type: 'select', options: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'] },
    ],
  },
  {
    key: 'inec',
    name: 'INEC Data (Web Scraper)',
    icon: '🗳️',
    description: 'Scrape electoral data from the INEC website.',
    syncFunction: null,
    configFields: [
      { key: 'scrape_url', label: 'Base URL', type: 'text', placeholder: 'https://www.inecnigeria.org' },
    ],
  },
  {
    key: 'nbs',
    name: 'NBS Data',
    icon: '📊',
    description: 'Access Nigeria Bureau of Statistics datasets.',
    syncFunction: null,
    configFields: [],
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Business API',
    icon: '💬',
    description: 'Send and receive WhatsApp messages via the Business API.',
    syncFunction: null,
    configFields: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text' },
      { key: 'business_account_id', label: 'Business Account ID', type: 'text' },
    ],
  },
  {
    key: 'google_calendar',
    name: 'Google Calendar',
    icon: '📅',
    description: 'Sync engagement cadence with Google Calendar.',
    syncFunction: null,
    configFields: [
      { key: 'calendar_id', label: 'Calendar ID', type: 'text', placeholder: 'primary' },
    ],
  },
];

/** Sync frequency options */
export const SYNC_FREQUENCIES = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'manual', label: 'Manual only' },
] as const;

/* ── Query keys ─────────────────────────────────────────────────────────────── */

const KEYS = {
  configs: ['integration-configs'] as const,
  syncLogs: ['sync-logs'] as const,
};

/* ── Hook ────────────────────────────────────────────────────────────────────── */

export function useIntegrations() {
  const { toast } = useToast();
  const qc = useQueryClient();

  /* ── Fetch all integration configs ── */
  const configsQuery = useQuery({
    queryKey: KEYS.configs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .order('platform_name');
      if (error) throw error;
      return data as IntegrationConfig[];
    },
  });

  /* ── Fetch recent sync logs ── */
  const syncLogsQuery = useQuery({
    queryKey: KEYS.syncLogs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs' as any)
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as SyncLog[];
    },
  });

  /* ── Save / update integration config ── */
  const saveConfigMutation = useMutation({
    mutationFn: async (params: {
      platformName: string;
      apiKey: string;
      config: Record<string, unknown>;
      syncFrequency: string;
      existingId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        platform_name: params.platformName,
        api_key_encrypted: params.apiKey, // Edge function will handle encryption
        config: { ...params.config, sync_frequency: params.syncFrequency },
        is_active: true,
        updated_by: user.id,
      };

      if (params.existingId) {
        const { error } = await supabase
          .from('integration_configs')
          .update(payload)
          .eq('id', params.existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('integration_configs')
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.configs });
      toast({ title: 'Integration saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save integration', description: err.message, variant: 'destructive' });
    },
  });

  /* ── Toggle integration active state ── */
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('integration_configs')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.configs });
    },
  });

  /* ── Test connection via Edge Function ── */
  const testConnection = async (platformName: string) => {
    const platform = PLATFORMS.find((p) => p.key === platformName);
    if (!platform?.syncFunction) {
      toast({ title: 'No sync function configured for this platform' });
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke(platform.syncFunction, {
        body: { test_connection: true },
      });
      if (error) throw error;
      toast({ title: 'Connection successful', description: `${platform.name} is responding.` });
      return true;
    } catch (err: any) {
      toast({ title: 'Connection failed', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  /* ── Trigger sync now via Edge Function ── */
  const triggerSync = async (platformName: string, engagementId?: string) => {
    const platform = PLATFORMS.find((p) => p.key === platformName);
    if (!platform?.syncFunction) {
      toast({ title: 'No sync function available', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(platform.syncFunction, {
        body: { engagement_id: engagementId, manual_trigger: true },
      });
      if (error) throw error;
      toast({ title: 'Sync triggered', description: `${platform.name} sync started.` });
      qc.invalidateQueries({ queryKey: KEYS.syncLogs });
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    }
  };

  /* ── Get config for a specific platform ── */
  const getConfigForPlatform = (platformKey: string): IntegrationConfig | undefined => {
    return configsQuery.data?.find(
      (c) => c.platform_name === platformKey
    );
  };

  /* ── Derive platform status from config ── */
  const getPlatformStatus = (platformKey: string): 'healthy' | 'error' | 'degraded' | 'not_configured' => {
    const config = getConfigForPlatform(platformKey);
    if (!config) return 'not_configured';
    if (!config.is_active) return 'degraded';
    if (config.error_log) return 'error';
    if (config.sync_status === 'error') return 'error';
    return 'healthy';
  };

  return {
    configs: configsQuery.data ?? [],
    isLoadingConfigs: configsQuery.isLoading,
    syncLogs: syncLogsQuery.data ?? [],
    isLoadingSyncLogs: syncLogsQuery.isLoading,
    saveConfig: saveConfigMutation.mutateAsync,
    isSaving: saveConfigMutation.isPending,
    toggleActive: toggleActiveMutation.mutateAsync,
    testConnection,
    triggerSync,
    getConfigForPlatform,
    getPlatformStatus,
    platforms: PLATFORMS,
  };
}
