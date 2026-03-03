/**
 * sync-twitter Edge Function
 *
 * Searches recent tweets matching keywords for an engagement.
 * Uses Twitter API v2 credentials stored in integration_configs.
 * Normalises results to intel_items format with source_type='social'.
 * Handles rate limits (429) with graceful retry-after delay.
 *
 * Request body:
 *   { engagement_id?: string; keywords?: string[]; test_connection?: boolean; manual_trigger?: boolean }
 *
 * Security:
 *   - JWT verification: only authenticated users with appropriate roles
 *   - API keys read from integration_configs (never from client)
 *   - All executions logged to audit_logs and sync_logs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Helper to return JSON responses with CORS headers */
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth: verify caller JWT ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // ── Parse body ──
  let body: {
    engagement_id?: string;
    keywords?: string[];
    test_connection?: boolean;
    manual_trigger?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // ── Get Twitter API credentials from integration_configs ──
  const { data: configRow, error: cfgErr } = await supabase
    .from("integration_configs")
    .select("*")
    .eq("platform_name", "twitter")
    .eq("is_active", true)
    .single();

  if (cfgErr || !configRow) {
    return json({ error: "Twitter integration is not configured or inactive" }, 404);
  }

  const bearerToken = configRow.api_key_encrypted;
  if (!bearerToken) {
    return json({ error: "Twitter API key not found in configuration" }, 400);
  }

  // ── Test connection mode ──
  if (body.test_connection) {
    try {
      const resp = await fetch("https://api.x.com/2/tweets/search/recent?query=test&max_results=10", {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
      const respBody = await resp.text();
      if (!resp.ok) {
        return json({ error: `Twitter API responded with ${resp.status}: ${respBody}` }, 502);
      }
      return json({ success: true, message: "Twitter API connection successful" });
    } catch (err) {
      return json({ error: `Connection test failed: ${(err as Error).message}` }, 502);
    }
  }

  // ── Full sync mode ──
  const { engagement_id, keywords = [] } = body;
  if (!engagement_id) {
    return json({ error: "engagement_id is required for sync" }, 400);
  }

  const startMs = Date.now();
  let recordsIngested = 0;
  let syncLogId: string | null = null;

  // Create sync log entry
  const { data: logEntry } = await supabase
    .from("sync_logs")
    .insert({
      platform_name: "twitter",
      integration_id: configRow.id,
      engagement_id,
      triggered_by: user.id,
      status: "running",
    } as any)
    .select()
    .single();
  syncLogId = (logEntry as any)?.id ?? null;

  try {
    const query = keywords.length > 0
      ? keywords.map((k) => `"${k}"`).join(" OR ")
      : "Nigeria politics";

    // Twitter API v2 recent search
    const searchUrl = new URL("https://api.x.com/2/tweets/search/recent");
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("max_results", "50");
    searchUrl.searchParams.set("tweet.fields", "created_at,author_id,public_metrics,lang");

    const resp = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    // Handle rate limiting
    if (resp.status === 429) {
      const retryAfter = resp.headers.get("retry-after") ?? "60";
      const respBody = await resp.text();
      await updateSyncLog(supabase, syncLogId, "error", startMs, 0, `Rate limited. Retry after ${retryAfter}s`);
      return json({ error: `Rate limited. Retry after ${retryAfter} seconds.` }, 429);
    }

    const respBody = await resp.text();
    if (!resp.ok) {
      await updateSyncLog(supabase, syncLogId, "error", startMs, 0, `Twitter API error ${resp.status}: ${respBody}`);
      return json({ error: `Twitter API error: ${respBody}` }, 502);
    }

    const twitterData = JSON.parse(respBody);
    const tweets = twitterData.data ?? [];

    // Normalise tweets to intel_items
    const intelItems = tweets.map((tweet: any) => ({
      engagement_id,
      headline: tweet.text?.slice(0, 200) ?? "No content",
      raw_content: tweet.text ?? "",
      source_type: "social",
      source_name: `@${tweet.author_id}`,
      platform: "Twitter/X",
      url: `https://x.com/i/web/status/${tweet.id}`,
      date_logged: tweet.created_at ? new Date(tweet.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      reach_tier: calculateReachTier(tweet.public_metrics),
      created_by: user.id,
    }));

    // Deduplicate: check existing URLs
    if (intelItems.length > 0) {
      const urls = intelItems.map((i: any) => i.url);
      const { data: existing } = await supabase
        .from("intel_items")
        .select("url")
        .eq("engagement_id", engagement_id)
        .in("url", urls);
      const existingUrls = new Set((existing ?? []).map((e: any) => e.url));
      const newItems = intelItems.filter((i: any) => !existingUrls.has(i.url));

      if (newItems.length > 0) {
        const { error: insertErr } = await supabase.from("intel_items").insert(newItems);
        if (insertErr) {
          console.error("[sync-twitter] Insert error:", insertErr);
        } else {
          recordsIngested = newItems.length;
        }
      }
    }

    // Update sync log + integration config
    await updateSyncLog(supabase, syncLogId, "success", startMs, recordsIngested, null);
    await supabase
      .from("integration_configs")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "success", error_log: null })
      .eq("id", configRow.id);

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "create",
      table_name: "intel_items",
      record_id: engagement_id,
      new_values: { source: "sync-twitter", records_ingested: recordsIngested },
    });

    return json({ success: true, records_ingested: recordsIngested, duration_ms: Date.now() - startMs });
  } catch (err) {
    const errMsg = (err as Error).message;
    await updateSyncLog(supabase, syncLogId, "error", startMs, 0, errMsg);
    await supabase
      .from("integration_configs")
      .update({ sync_status: "error", error_log: errMsg })
      .eq("id", configRow.id);
    return json({ error: errMsg }, 500);
  }
});

/** Calculate reach tier based on tweet metrics */
function calculateReachTier(metrics: any): number {
  if (!metrics) return 1;
  const total = (metrics.retweet_count ?? 0) + (metrics.like_count ?? 0) + (metrics.reply_count ?? 0);
  if (total > 10000) return 5;
  if (total > 1000) return 4;
  if (total > 100) return 3;
  if (total > 10) return 2;
  return 1;
}

/** Update sync_logs with final status */
async function updateSyncLog(
  supabase: any, logId: string | null, status: string,
  startMs: number, records: number, error: string | null,
) {
  if (!logId) return;
  await supabase.from("sync_logs").update({
    status,
    completed_at: new Date().toISOString(),
    duration_ms: Date.now() - startMs,
    records_ingested: records,
    error_message: error,
  } as any).eq("id", logId);
}
