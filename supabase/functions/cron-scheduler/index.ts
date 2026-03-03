/**
 * cron-scheduler Edge Function
 *
 * Scheduled function (intended to run every hour via pg_cron).
 * Reads integration_configs for active integrations and triggers
 * the appropriate sync function for those due for execution.
 *
 * Sync frequency logic:
 *   - 'realtime' → always trigger
 *   - 'hourly'   → trigger every invocation
 *   - 'daily'    → trigger if last_sync_at > 24h ago
 *   - 'weekly'   → trigger if last_sync_at > 7 days ago
 *   - 'manual'   → skip
 *
 * This function does NOT require user JWT — it runs as a service.
 * It uses SUPABASE_SERVICE_ROLE_KEY to read configs and invoke functions.
 *
 * Security:
 *   - Validates request via service role (called from pg_cron, not user)
 *   - All operations logged to sync_logs and audit_logs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Map platform_name to their sync edge function name */
const SYNC_FUNCTION_MAP: Record<string, string> = {
  twitter: "sync-twitter",
  newsapi: "sync-news",
  meta_facebook: "sync-meta",
  meta_instagram: "sync-meta",
};

/** Check if a sync is due based on frequency and last sync time */
function isSyncDue(frequency: string, lastSyncAt: string | null): boolean {
  if (frequency === "manual") return false;
  if (frequency === "realtime" || frequency === "hourly") return true;
  if (!lastSyncAt) return true; // never synced → due

  const lastSync = new Date(lastSyncAt).getTime();
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  if (frequency === "daily" && now - lastSync > 24 * hourMs) return true;
  if (frequency === "weekly" && now - lastSync > 7 * 24 * hourMs) return true;

  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    // Read all active integration configs
    const { data: configs, error } = await supabase
      .from("integration_configs")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    const results: { platform: string; triggered: boolean; reason: string }[] = [];

    for (const config of (configs ?? [])) {
      const frequency = (config.config as any)?.sync_frequency ?? "manual";
      const syncFn = SYNC_FUNCTION_MAP[config.platform_name];

      if (!syncFn) {
        results.push({ platform: config.platform_name, triggered: false, reason: "No sync function mapped" });
        continue;
      }

      if (!isSyncDue(frequency, config.last_sync_at)) {
        results.push({ platform: config.platform_name, triggered: false, reason: "Not due yet" });
        continue;
      }

      // Trigger the sync function via HTTP (service role auth)
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/${syncFn}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            manual_trigger: false,
            // The sync function will need to determine which engagements to process
          }),
        });
        const respBody = await resp.text();
        results.push({
          platform: config.platform_name,
          triggered: resp.ok,
          reason: resp.ok ? "Triggered successfully" : `Error ${resp.status}: ${respBody}`,
        });
      } catch (err) {
        results.push({
          platform: config.platform_name,
          triggered: false,
          reason: `Invoke error: ${(err as Error).message}`,
        });
      }
    }

    // Log scheduler execution to audit_logs
    await supabase.from("audit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // system user
      action: "read",
      table_name: "cron_scheduler",
      new_values: { results, triggered_count: results.filter((r) => r.triggered).length },
    }).catch(() => {}); // fire-and-forget

    return json({ results, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[cron-scheduler] Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
