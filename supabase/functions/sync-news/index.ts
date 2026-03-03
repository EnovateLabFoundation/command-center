/**
 * sync-news Edge Function
 *
 * Fetches recent news articles from NewsAPI matching engagement keywords.
 * Credentials are read from integration_configs (never from client).
 * Deduplicates against existing intel_items by URL.
 * Normalises results to intel_items with source_type='digital' or 'print'.
 *
 * Nigerian news source tier assignments are hardcoded for reach_tier:
 *   Tier 3: Punch, Vanguard, ThisDay, The Nation, Premium Times, Guardian, Channels TV, NTA
 *   Tier 2: Daily Post, Sahara Reporters, Leadership, BusinessDay
 *   Tier 1: All others
 *
 * Request body:
 *   { engagement_id?: string; keywords?: string[]; test_connection?: boolean }
 *
 * Security:
 *   - JWT verification required
 *   - API keys from integration_configs only
 *   - All operations logged to audit_logs and sync_logs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Nigerian news source tier mapping — lowercase source name → tier */
const NIGERIAN_SOURCE_TIERS: Record<string, number> = {
  // Tier 3: Major national outlets
  "punch": 3, "punch newspapers": 3, "the punch": 3,
  "vanguard": 3, "vanguard news": 3,
  "thisday": 3, "thisday live": 3, "this day": 3,
  "the nation": 3, "the nation online": 3, "nation": 3,
  "premium times": 3, "premiumtimesng": 3,
  "the guardian": 3, "guardian nigeria": 3, "guardian ng": 3,
  "channels tv": 3, "channels television": 3, "channelstv": 3,
  "nta": 3, "nta news": 3, "nigerian television authority": 3,
  // Tier 2: Major digital/secondary outlets
  "daily post": 2, "dailypost": 2, "daily post nigeria": 2,
  "sahara reporters": 2, "saharareporters": 2,
  "leadership": 2, "leadership newspaper": 2,
  "businessday": 2, "business day": 2, "businessday ng": 2,
};

/**
 * Determine source_type based on source name heuristics.
 * Nigerian print newspapers → 'print'; digital-only → 'digital'.
 */
const PRINT_SOURCES = new Set([
  "punch", "vanguard", "thisday", "the nation", "premium times",
  "the guardian", "leadership", "businessday",
]);

function getSourceType(sourceName: string): "print" | "digital" {
  const lower = sourceName.toLowerCase();
  for (const ps of PRINT_SOURCES) {
    if (lower.includes(ps)) return "print";
  }
  return "digital";
}

/** Get reach tier for a source. Falls back to Tier 1 for unknown sources. */
function getReachTier(sourceName: string, configTiers?: Record<string, number>): number {
  const lower = sourceName.toLowerCase();
  // Check config-level custom tiers first
  if (configTiers) {
    for (const [key, tier] of Object.entries(configTiers)) {
      if (lower.includes(key.toLowerCase())) return tier;
    }
  }
  // Check hardcoded Nigerian tiers
  for (const [key, tier] of Object.entries(NIGERIAN_SOURCE_TIERS)) {
    if (lower.includes(key)) return tier;
  }
  return 1;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

  let body: { engagement_id?: string; keywords?: string[]; test_connection?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // ── Get NewsAPI credentials ──
  const { data: configRow } = await supabase
    .from("integration_configs")
    .select("*")
    .eq("platform_name", "newsapi")
    .eq("is_active", true)
    .single();

  if (!configRow?.api_key_encrypted) {
    return json({ error: "News API integration is not configured" }, 404);
  }
  const apiKey = configRow.api_key_encrypted;
  const config = (configRow.config ?? {}) as Record<string, any>;

  // ── Test connection ──
  if (body.test_connection) {
    try {
      const resp = await fetch(`https://newsapi.org/v2/top-headlines?country=ng&pageSize=1&apiKey=${apiKey}`);
      const respBody = await resp.text();
      if (!resp.ok) return json({ error: `NewsAPI responded ${resp.status}: ${respBody}` }, 502);
      return json({ success: true, message: "News API connection successful" });
    } catch (err) {
      return json({ error: `Connection test failed: ${(err as Error).message}` }, 502);
    }
  }

  // ── Full sync ──
  const { engagement_id, keywords = [] } = body;
  if (!engagement_id) return json({ error: "engagement_id required" }, 400);

  const startMs = Date.now();
  let recordsIngested = 0;

  const { data: logEntry } = await supabase
    .from("sync_logs")
    .insert({ platform_name: "newsapi", integration_id: configRow.id, engagement_id, triggered_by: user.id, status: "running" } as any)
    .select().single();
  const syncLogId = (logEntry as any)?.id ?? null;

  try {
    const query = keywords.length > 0 ? keywords.join(" OR ") : "Nigeria politics";
    const lang = config.language ?? "en";
    const country = config.country ?? "ng";

    // Build domains list from config
    const domains = config.domains
      ? (config.domains as string)
      : "premiumtimesng.com,thisdaylive.com,vanguardngr.com,dailypost.ng,punchng.com,guardian.ng,channelstv.com";

    // Fetch last 24h of articles
    const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${fromDate}&language=${lang}&domains=${encodeURIComponent(domains)}&sortBy=publishedAt&pageSize=100&apiKey=${apiKey}`;

    const resp = await fetch(url);
    if (resp.status === 429) {
      await updateSyncLog(supabase, syncLogId, "error", startMs, 0, "NewsAPI rate limited");
      return json({ error: "NewsAPI rate limited" }, 429);
    }
    const respBody = await resp.text();
    if (!resp.ok) {
      await updateSyncLog(supabase, syncLogId, "error", startMs, 0, `NewsAPI ${resp.status}: ${respBody}`);
      return json({ error: `NewsAPI error: ${respBody}` }, 502);
    }

    const newsData = JSON.parse(respBody);
    const articles = newsData.articles ?? [];

    // Custom tier overrides from config
    const customTiers = config.source_tiers as Record<string, number> | undefined;

    // Normalise to intel_items
    const intelItems = articles
      .filter((a: any) => a.url)
      .map((a: any) => {
        const sourceName = a.source?.name ?? "Unknown";
        return {
          engagement_id,
          headline: (a.title ?? "Untitled").slice(0, 500),
          summary: a.description ?? null,
          raw_content: a.content ?? a.description ?? "",
          source_type: getSourceType(sourceName),
          source_name: sourceName,
          platform: "News",
          url: a.url,
          reach_tier: getReachTier(sourceName, customTiers),
          date_logged: a.publishedAt ? new Date(a.publishedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          created_by: user.id,
        };
      });

    // Deduplicate by URL
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
        // Run sentiment scoring for each item (batch — fire-and-forget for performance)
        const sentimentUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sentiment-score`;
        const sentimentPromises = newItems.map(async (item: any) => {
          try {
            const sr = await fetch(sentimentUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader,
              },
              body: JSON.stringify({ text: `${item.headline}. ${item.summary ?? ""}`, language: lang }),
            });
            if (sr.ok) {
              const sd = await sr.json();
              item.sentiment_score = sd.score ?? null;
              item.narrative_theme = sd.theme ?? null;
            }
          } catch { /* sentiment failure should not block ingestion */ }
        });
        await Promise.allSettled(sentimentPromises);

        const { error: insertErr } = await supabase.from("intel_items").insert(newItems);
        if (!insertErr) recordsIngested = newItems.length;
      }
    }

    await updateSyncLog(supabase, syncLogId, "success", startMs, recordsIngested, null);
    await supabase.from("integration_configs")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "success", error_log: null })
      .eq("id", configRow.id);

    await supabase.from("audit_logs").insert({
      user_id: user.id, action: "create", table_name: "intel_items",
      record_id: engagement_id, new_values: { source: "sync-news", records_ingested: recordsIngested },
    });

    return json({ success: true, records_ingested: recordsIngested, duration_ms: Date.now() - startMs });
  } catch (err) {
    const errMsg = (err as Error).message;
    await updateSyncLog(supabase, syncLogId, "error", startMs, 0, errMsg);
    return json({ error: errMsg }, 500);
  }
});

/** Update sync log entry with final status */
async function updateSyncLog(sb: any, id: string | null, status: string, startMs: number, records: number, error: string | null) {
  if (!id) return;
  await sb.from("sync_logs").update({
    status, completed_at: new Date().toISOString(),
    duration_ms: Date.now() - startMs, records_ingested: records, error_message: error,
  } as any).eq("id", id);
}
