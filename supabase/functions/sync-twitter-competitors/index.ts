/**
 * sync-twitter-competitors Edge Function
 *
 * Pulls current follower counts and engagement metrics for competitors
 * with twitter_handles. Calculates 30-day follower growth rate and
 * 7-day average engagement rate. Updates competitor_profiles and stores
 * historical data in competitor_metrics_history.
 *
 * Request body:
 *   { engagement_id: string; test_connection?: boolean }
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

  let body: { engagement_id?: string; test_connection?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // ── Get Twitter API credentials ──
  const { data: configRow } = await supabase
    .from("integration_configs")
    .select("*")
    .eq("platform_name", "twitter")
    .eq("is_active", true)
    .single();

  if (!configRow?.api_key_encrypted) {
    return json({ error: "Twitter integration not configured" }, 404);
  }
  const bearerToken = configRow.api_key_encrypted;

  if (body.test_connection) {
    try {
      const resp = await fetch(`${TWITTER_API_BASE}/tweets/search/recent?query=test&max_results=10`, {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
      const respBody = await resp.text();
      if (!resp.ok) return json({ error: `Twitter API ${resp.status}: ${respBody}` }, 502);
      return json({ success: true, message: "Connection OK" });
    } catch (err) {
      return json({ error: `Test failed: ${(err as Error).message}` }, 502);
    }
  }

  const { engagement_id } = body;
  if (!engagement_id) return json({ error: "engagement_id required" }, 400);

  const startMs = Date.now();
  let recordsUpdated = 0;

  const { data: logEntry } = await supabase
    .from("sync_logs")
    .insert({
      platform_name: "twitter_competitors",
      integration_id: configRow.id,
      engagement_id,
      triggered_by: user.id,
      status: "running",
    } as any)
    .select().single();
  const syncLogId = (logEntry as any)?.id ?? null;

  try {
    // Get competitors with twitter handles
    const { data: competitors } = await supabase
      .from("competitor_profiles")
      .select("id, name, twitter_handle, twitter_followers")
      .eq("engagement_id", engagement_id)
      .not("twitter_handle", "is", null);

    for (const comp of (competitors ?? [])) {
      const handle = (comp.twitter_handle as string).replace("@", "");
      if (!handle) continue;

      try {
        // ── Lookup user by username ──
        const userResp = await fetch(
          `${TWITTER_API_BASE}/users/by/username/${handle}?user.fields=public_metrics,created_at`,
          { headers: { Authorization: `Bearer ${bearerToken}` } },
        );

        if (userResp.status === 429) {
          await userResp.text();
          console.warn(`[sync-twitter-competitors] Rate limited for @${handle}`);
          continue;
        }

        const userBody = await userResp.text();
        if (!userResp.ok) {
          console.error(`[sync-twitter-competitors] User lookup failed for @${handle}: ${userBody}`);
          continue;
        }

        const userData = JSON.parse(userBody);
        const twitterUser = userData.data;
        if (!twitterUser) continue;

        const currentFollowers = twitterUser.public_metrics?.followers_count ?? 0;

        // ── Get 30-day-old historical data for growth rate ──
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: historicalData } = await supabase
          .from("competitor_metrics_history")
          .select("followers")
          .eq("competitor_profile_id", comp.id)
          .eq("platform", "twitter")
          .lte("metric_date", thirtyDaysAgo.toISOString().split("T")[0])
          .order("metric_date", { ascending: false })
          .limit(1);

        const oldFollowers = (historicalData as any)?.[0]?.followers ?? currentFollowers;
        const followerGrowthRate = oldFollowers > 0
          ? ((currentFollowers - oldFollowers) / oldFollowers * 100)
          : 0;

        // ── Get recent tweets for engagement rate calculation ──
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const tweetsResp = await fetch(
          `${TWITTER_API_BASE}/users/${twitterUser.id}/tweets?max_results=20&tweet.fields=public_metrics,created_at&start_time=${sevenDaysAgo.toISOString()}`,
          { headers: { Authorization: `Bearer ${bearerToken}` } },
        );

        let avgEngagementRate = 0;
        if (tweetsResp.ok) {
          const tweetsData = await tweetsResp.json();
          const tweets = tweetsData.data ?? [];
          if (tweets.length > 0 && currentFollowers > 0) {
            const totalEngagement = tweets.reduce((sum: number, t: any) => {
              const m = t.public_metrics ?? {};
              return sum + (m.like_count ?? 0) + (m.retweet_count ?? 0) + (m.reply_count ?? 0);
            }, 0);
            avgEngagementRate = (totalEngagement / tweets.length / currentFollowers) * 100;
          }
        } else {
          await tweetsResp.text(); // consume body
        }

        // ── Update competitor_profiles ──
        await supabase.from("competitor_profiles").update({
          twitter_followers: currentFollowers,
          last_updated: new Date().toISOString(),
          updated_by: user.id,
        }).eq("id", comp.id);

        // ── Store historical metric ──
        await supabase.from("competitor_metrics_history").upsert({
          competitor_profile_id: comp.id,
          metric_date: new Date().toISOString().split("T")[0],
          followers: currentFollowers,
          engagement_rate: Math.round(avgEngagementRate * 1000) / 1000,
          platform: "twitter",
        } as any, { onConflict: "competitor_profile_id,metric_date,platform" });

        recordsUpdated++;
      } catch (err) {
        console.error(`[sync-twitter-competitors] Error for @${handle}:`, err);
      }
    }

    await updateSyncLog(supabase, syncLogId, "success", startMs, recordsUpdated, null);

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "update",
      table_name: "competitor_profiles",
      record_id: engagement_id,
      new_values: { source: "sync-twitter-competitors", records_updated: recordsUpdated },
    });

    return json({ success: true, records_updated: recordsUpdated, duration_ms: Date.now() - startMs });
  } catch (err) {
    const errMsg = (err as Error).message;
    await updateSyncLog(supabase, syncLogId, "error", startMs, 0, errMsg);
    return json({ error: errMsg }, 500);
  }
});

async function updateSyncLog(sb: any, id: string | null, status: string, startMs: number, records: number, error: string | null) {
  if (!id) return;
  await sb.from("sync_logs").update({
    status, completed_at: new Date().toISOString(),
    duration_ms: Date.now() - startMs, records_ingested: records, error_message: error,
  } as any).eq("id", id);
}
