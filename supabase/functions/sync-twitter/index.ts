/**
 * sync-twitter Edge Function
 *
 * Enhanced social intelligence pipeline for Twitter/X.
 * - Searches keywords from engagement's monitoring config
 * - Searches competitor twitter_handles (@mentions and tweets)
 * - Calculates reach_tier based on author follower count
 * - Auto-calls sentiment-score for each tweet
 * - Deduplicates against existing intel_items by URL (partial unique index)
 * - Inserts qualifying tweets as intel_items with platform='twitter'
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

const TWITTER_API_BASE = "https://api.x.com/2";

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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Auth ──
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
  let body: { engagement_id?: string; keywords?: string[]; test_connection?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  // ── Get Twitter API credentials ──
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
  if (!bearerToken) return json({ error: "Twitter API key not found" }, 400);

  // ── Test connection mode ──
  if (body.test_connection) {
    try {
      const resp = await fetch(`${TWITTER_API_BASE}/tweets/search/recent?query=test&max_results=10`, {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
      const respBody = await resp.text();
      if (!resp.ok) return json({ error: `Twitter API ${resp.status}: ${respBody}` }, 502);
      return json({ success: true, message: "Twitter API connection successful" });
    } catch (err) {
      return json({ error: `Connection test failed: ${(err as Error).message}` }, 502);
    }
  }

  // ── Full sync mode ──
  const { engagement_id } = body;
  if (!engagement_id) return json({ error: "engagement_id is required" }, 400);

  const startMs = Date.now();
  let recordsIngested = 0;

  // Create sync log
  const { data: logEntry } = await supabase
    .from("sync_logs")
    .insert({
      platform_name: "twitter",
      integration_id: configRow.id,
      engagement_id,
      triggered_by: user.id,
      status: "running",
    } as any)
    .select().single();
  const syncLogId = (logEntry as any)?.id ?? null;

  try {
    // ── Gather search queries ──
    // 1. Keywords from body or from monitoring config
    let keywords = body.keywords ?? [];
    if (keywords.length === 0) {
      const { data: kwConfigs } = await supabase
        .from("integration_configs")
        .select("config")
        .eq("platform_name", "keyword_monitor")
        .eq("is_active", true);
      for (const kw of (kwConfigs ?? [])) {
        const cfg = kw.config as any;
        if (cfg?.engagement_id === engagement_id && cfg?.keyword) {
          keywords.push(cfg.keyword);
        }
      }
    }

    // 2. Competitor twitter handles
    const { data: competitors } = await supabase
      .from("competitor_profiles")
      .select("id, name, twitter_handle, twitter_followers")
      .eq("engagement_id", engagement_id)
      .not("twitter_handle", "is", null);

    const competitorHandles = (competitors ?? [])
      .map((c: any) => c.twitter_handle)
      .filter(Boolean)
      .map((h: string) => h.startsWith("@") ? h : `@${h}`);

    // Build search queries - split into keyword query and competitor query
    const searchQueries: string[] = [];
    if (keywords.length > 0) {
      searchQueries.push(keywords.map((k) => `"${k}"`).join(" OR "));
    }
    if (competitorHandles.length > 0) {
      // Search for @mentions and from: tweets for each handle
      const handleQueries = competitorHandles.map((h: string) => {
        const handle = h.replace("@", "");
        return `(from:${handle} OR @${handle})`;
      });
      searchQueries.push(handleQueries.join(" OR "));
    }

    if (searchQueries.length === 0) {
      await updateSyncLog(supabase, syncLogId, "success", startMs, 0, null);
      return json({ success: true, records_ingested: 0, message: "No keywords or competitor handles configured" });
    }

    // ── Execute Twitter searches ──
    const allTweets: any[] = [];
    const allUsers = new Map<string, any>();

    for (const query of searchQueries) {
      const searchUrl = new URL(`${TWITTER_API_BASE}/tweets/search/recent`);
      searchUrl.searchParams.set("query", query.slice(0, 512)); // Twitter max query length
      searchUrl.searchParams.set("max_results", "50");
      searchUrl.searchParams.set("tweet.fields", "created_at,author_id,public_metrics,lang");
      searchUrl.searchParams.set("expansions", "author_id");
      searchUrl.searchParams.set("user.fields", "username,name,public_metrics");

      const resp = await fetch(searchUrl.toString(), {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });

      // Handle rate limiting with retry-after
      if (resp.status === 429) {
        const retryAfter = resp.headers.get("retry-after") ?? "60";
        await resp.text();
        console.warn(`[sync-twitter] Rate limited on query. Retry after ${retryAfter}s`);
        continue; // Skip this query, try next
      }

      const respBody = await resp.text();
      if (!resp.ok) {
        console.error(`[sync-twitter] API error ${resp.status}: ${respBody}`);
        continue;
      }

      const twitterData = JSON.parse(respBody);
      const tweets = twitterData.data ?? [];
      const users = twitterData.includes?.users ?? [];

      // Index users by id for reach tier calculation
      for (const u of users) {
        allUsers.set(u.id, u);
      }
      allTweets.push(...tweets);
    }

    if (allTweets.length === 0) {
      await updateSyncLog(supabase, syncLogId, "success", startMs, 0, null);
      return json({ success: true, records_ingested: 0 });
    }

    // ── Deduplicate against existing URLs ──
    const tweetUrls = allTweets.map((t: any) => `https://x.com/i/web/status/${t.id}`);
    const { data: existing } = await supabase
      .from("intel_items")
      .select("url")
      .in("url", tweetUrls);
    const existingUrls = new Set((existing ?? []).map((e: any) => e.url));

    const newTweets = allTweets.filter((t: any) =>
      !existingUrls.has(`https://x.com/i/web/status/${t.id}`)
    );

    // ── Process new tweets: sentiment scoring + normalisation ──
    const intelItems: any[] = [];
    for (const tweet of newTweets) {
      const author = allUsers.get(tweet.author_id);
      const authorFollowers = author?.public_metrics?.followers_count ?? 0;
      const authorUsername = author?.username ?? tweet.author_id;

      // Calculate reach_tier based on author follower count
      const reachTier = authorFollowers > 100000 ? 3
        : authorFollowers > 10000 ? 2
        : 1;

      // Auto-call sentiment-score edge function
      let sentimentScore: number | null = null;
      let narrativeTheme: string | null = null;
      try {
        const sentResp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/sentiment-score`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: tweet.text ?? "",
              language: tweet.lang ?? "en",
            }),
          },
        );
        if (sentResp.ok) {
          const sentData = await sentResp.json();
          sentimentScore = sentData.score ?? null;
          narrativeTheme = sentData.theme ?? null;
        } else {
          await sentResp.text(); // consume body
        }
      } catch {
        // Sentiment scoring is best-effort; continue without it
      }

      const metrics = tweet.public_metrics ?? {};
      const totalEngagement = (metrics.retweet_count ?? 0) + (metrics.like_count ?? 0) + (metrics.reply_count ?? 0);

      intelItems.push({
        engagement_id,
        headline: (tweet.text ?? "No content").slice(0, 200),
        raw_content: tweet.text ?? "",
        summary: `Retweets: ${metrics.retweet_count ?? 0} | Likes: ${metrics.like_count ?? 0} | Replies: ${metrics.reply_count ?? 0} | Est. impressions: ${metrics.impression_count ?? "N/A"}`,
        source_type: "social",
        source_name: `@${authorUsername}`,
        platform: "twitter",
        url: `https://x.com/i/web/status/${tweet.id}`,
        date_logged: tweet.created_at
          ? new Date(tweet.created_at).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        reach_tier: reachTier,
        sentiment_score: sentimentScore,
        narrative_theme: narrativeTheme,
        is_urgent: sentimentScore !== null && sentimentScore <= -1.5,
        action_required: totalEngagement > 1000,
        created_by: user.id,
      });
    }

    // ── Batch insert ──
    if (intelItems.length > 0) {
      const { error: insertErr } = await supabase.from("intel_items").insert(intelItems);
      if (insertErr) {
        console.error("[sync-twitter] Insert error:", insertErr);
      } else {
        recordsIngested = intelItems.length;
      }
    }

    // ── Update sync log & integration config ──
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
      new_values: { source: "sync-twitter", records_ingested: recordsIngested, queries: searchQueries.length },
    });

    return json({ success: true, records_ingested: recordsIngested, duration_ms: Date.now() - startMs });
  } catch (err) {
    const errMsg = (err as Error).message;
    await updateSyncLog(supabase, syncLogId, "error", startMs, 0, errMsg);
    await supabase.from("integration_configs")
      .update({ sync_status: "error", error_log: errMsg })
      .eq("id", configRow.id);
    return json({ error: errMsg }, 500);
  }
});

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
