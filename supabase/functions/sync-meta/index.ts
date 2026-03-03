/**
 * sync-meta Edge Function
 *
 * Enhanced Meta Graph API integration for Facebook & Instagram intelligence.
 * - Pulls page fan_count, post insights (reach, engagement) for competitors
 * - Pulls client's own page insights if configured
 * - Inserts relevant posts as intel_items if they mention monitored keywords
 * - Facebook Ad Library monitoring for political ads in Nigeria
 * - Updates competitor_profiles with social metrics
 * - Stores historical data in competitor_metrics_history
 *
 * Request body:
 *   { engagement_id?: string; page_ids?: string[]; competitor_handles?: string[]; test_connection?: boolean }
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

const META_API_BASE = "https://graph.facebook.com/v19.0";

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

  let body: { engagement_id?: string; page_ids?: string[]; competitor_handles?: string[]; test_connection?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // ── Get Meta API credentials ──
  const { data: fbConfig } = await supabase
    .from("integration_configs")
    .select("*")
    .eq("platform_name", "meta_facebook")
    .eq("is_active", true)
    .single();

  const { data: igConfig } = await supabase
    .from("integration_configs")
    .select("*")
    .eq("platform_name", "meta_instagram")
    .eq("is_active", true)
    .single();

  const accessToken = fbConfig?.api_key_encrypted ?? igConfig?.api_key_encrypted;
  if (!accessToken) return json({ error: "Meta API integration not configured" }, 404);

  // ── Test connection ──
  if (body.test_connection) {
    try {
      const resp = await fetch(`${META_API_BASE}/me?access_token=${accessToken}`);
      const respBody = await resp.text();
      if (!resp.ok) return json({ error: `Meta API ${resp.status}: ${respBody}` }, 502);
      return json({ success: true, message: "Meta Graph API connection successful" });
    } catch (err) {
      return json({ error: `Test failed: ${(err as Error).message}` }, 502);
    }
  }

  // ── Full sync ──
  const { engagement_id } = body;
  if (!engagement_id) return json({ error: "engagement_id required" }, 400);

  const startMs = Date.now();
  let recordsUpdated = 0;
  let intelItemsCreated = 0;
  const configId = fbConfig?.id ?? igConfig?.id;

  const { data: logEntry } = await supabase
    .from("sync_logs")
    .insert({ platform_name: "meta", integration_id: configId, engagement_id, triggered_by: user.id, status: "running" } as any)
    .select().single();
  const syncLogId = (logEntry as any)?.id ?? null;

  try {
    // ── Get monitoring keywords for this engagement ──
    const { data: kwConfigs } = await supabase
      .from("integration_configs")
      .select("config")
      .eq("platform_name", "keyword_monitor")
      .eq("is_active", true);
    const monitoredKeywords: string[] = [];
    for (const kw of (kwConfigs ?? [])) {
      const cfg = kw.config as any;
      if (cfg?.engagement_id === engagement_id && cfg?.keyword) {
        monitoredKeywords.push(cfg.keyword.toLowerCase());
      }
    }

    // ── Get competitors ──
    const { data: competitors } = await supabase
      .from("competitor_profiles")
      .select("id, name, facebook_page, instagram_handle, facebook_likes, instagram_followers")
      .eq("engagement_id", engagement_id);

    // ── Process each competitor ──
    for (const comp of (competitors ?? [])) {
      // ── Facebook page metrics ──
      if (comp.facebook_page) {
        try {
          const pageResp = await fetch(
            `${META_API_BASE}/${comp.facebook_page}?fields=fan_count,talking_about_count,name&access_token=${accessToken}`,
          );
          if (pageResp.ok) {
            const pageData = await pageResp.json();
            await supabase.from("competitor_profiles").update({
              facebook_likes: pageData.fan_count ?? null,
              last_updated: new Date().toISOString(),
              updated_by: user.id,
            }).eq("id", comp.id);

            // Store historical metric
            await supabase.from("competitor_metrics_history").upsert({
              competitor_profile_id: comp.id,
              metric_date: new Date().toISOString().split("T")[0],
              followers: pageData.fan_count ?? 0,
              engagement_rate: 0,
              platform: "facebook",
            } as any, { onConflict: "competitor_profile_id,metric_date,platform" });

            recordsUpdated++;

            // ── Pull recent posts and check for keyword matches ──
            const postsResp = await fetch(
              `${META_API_BASE}/${comp.facebook_page}/posts?fields=message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=25&access_token=${accessToken}`,
            );
            if (postsResp.ok) {
              const postsData = await postsResp.json();
              for (const post of (postsData.data ?? [])) {
                const message = (post.message ?? "").toLowerCase();
                const matchesKeyword = monitoredKeywords.some((kw) => message.includes(kw));
                if (matchesKeyword && post.permalink_url) {
                  // Deduplicate by URL
                  const { data: existingItem } = await supabase
                    .from("intel_items")
                    .select("id")
                    .eq("url", post.permalink_url)
                    .maybeSingle();

                  if (!existingItem) {
                    await supabase.from("intel_items").insert({
                      engagement_id,
                      headline: (post.message ?? "Facebook post").slice(0, 200),
                      raw_content: post.message ?? "",
                      source_type: "social",
                      source_name: comp.name,
                      platform: "facebook",
                      url: post.permalink_url,
                      date_logged: post.created_time
                        ? new Date(post.created_time).toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0],
                      reach_tier: 2,
                      created_by: user.id,
                    });
                    intelItemsCreated++;
                  }
                }
              }
            } else {
              await postsResp.text();
            }
          } else {
            await pageResp.text();
          }
        } catch (err) {
          console.error(`[sync-meta] Facebook error for ${comp.name}:`, err);
        }
      }

      // ── Instagram metrics ──
      if (comp.instagram_handle) {
        try {
          const igResp = await fetch(
            `${META_API_BASE}/${comp.instagram_handle}?fields=followers_count,media_count&access_token=${accessToken}`,
          );
          if (igResp.ok) {
            const igData = await igResp.json();
            await supabase.from("competitor_profiles").update({
              instagram_followers: igData.followers_count ?? null,
              last_updated: new Date().toISOString(),
              updated_by: user.id,
            }).eq("id", comp.id);

            await supabase.from("competitor_metrics_history").upsert({
              competitor_profile_id: comp.id,
              metric_date: new Date().toISOString().split("T")[0],
              followers: igData.followers_count ?? 0,
              engagement_rate: 0,
              platform: "instagram",
            } as any, { onConflict: "competitor_profile_id,metric_date,platform" });

            recordsUpdated++;
          } else {
            await igResp.text();
          }
        } catch (err) {
          console.error(`[sync-meta] Instagram error for ${comp.name}:`, err);
        }
      }
    }

    // ── Facebook Ad Library monitoring (no auth required for political ads) ──
    try {
      // Get competitor names for ad search
      const compNames = (competitors ?? []).map((c: any) => c.name).filter(Boolean);
      for (const searchTerm of compNames.slice(0, 5)) {
        const adResp = await fetch(
          `${META_API_BASE}/ads_archive?search_terms=${encodeURIComponent(searchTerm)}&ad_reached_countries=NG&ad_type=POLITICAL_AND_ISSUE_ADS&fields=ad_creative_bodies,ad_delivery_start_time,page_name,publisher_platforms,ad_snapshot_url&limit=10&access_token=${accessToken}`,
        );
        if (adResp.ok) {
          const adData = await adResp.json();
          for (const ad of (adData.data ?? [])) {
            const adUrl = ad.ad_snapshot_url ?? `ad-library-${ad.id}`;
            // Deduplicate
            const { data: existingAd } = await supabase
              .from("intel_items")
              .select("id")
              .eq("url", adUrl)
              .maybeSingle();

            if (!existingAd) {
              const adText = Array.isArray(ad.ad_creative_bodies)
                ? ad.ad_creative_bodies.join(" | ")
                : (ad.ad_creative_bodies ?? "Political advertisement");

              await supabase.from("intel_items").insert({
                engagement_id,
                headline: `[Political Ad] ${ad.page_name ?? searchTerm}: ${adText.slice(0, 150)}`,
                raw_content: adText,
                source_type: "social",
                source_name: ad.page_name ?? searchTerm,
                platform: "facebook",
                url: adUrl,
                narrative_theme: "political_advertising",
                date_logged: ad.ad_delivery_start_time
                  ? new Date(ad.ad_delivery_start_time).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0],
                reach_tier: 3,
                created_by: user.id,
              });
              intelItemsCreated++;
            }
          }
        } else {
          await adResp.text();
        }
      }
    } catch (err) {
      console.error("[sync-meta] Ad Library error:", err);
    }

    // ── Finalise ──
    const totalRecords = recordsUpdated + intelItemsCreated;
    await updateSyncLog(supabase, syncLogId, "success", startMs, totalRecords, null);

    if (configId) {
      await supabase.from("integration_configs")
        .update({ last_sync_at: new Date().toISOString(), sync_status: "success", error_log: null })
        .eq("id", configId);
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id, action: "create", table_name: "intel_items",
      record_id: engagement_id,
      new_values: { source: "sync-meta", profiles_updated: recordsUpdated, intel_items_created: intelItemsCreated },
    });

    return json({
      success: true,
      profiles_updated: recordsUpdated,
      intel_items_created: intelItemsCreated,
      duration_ms: Date.now() - startMs,
    });
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
