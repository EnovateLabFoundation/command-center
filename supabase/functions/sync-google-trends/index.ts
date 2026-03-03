/**
 * sync-google-trends Edge Function
 *
 * Uses SerpAPI to pull Google Trends data for engagement keywords,
 * client name, and competitor names.
 *
 * Stores interest-over-time (last 90 days) and interest-by-region
 * (Nigerian state-level) in the google_trends_data table.
 *
 * Request body:
 *   { engagement_id: string; keywords?: string[]; test_connection?: boolean }
 *
 * Security:
 *   - JWT verification required
 *   - API key from integration_configs (platform_name='serpapi')
 *   - All operations logged to audit_logs and sync_logs
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

  // ── Get SerpAPI credentials ──
  const { data: configRow } = await supabase
    .from("integration_configs")
    .select("*")
    .eq("platform_name", "serpapi")
    .eq("is_active", true)
    .single();

  if (!configRow?.api_key_encrypted) {
    return json({ error: "SerpAPI (Google Trends) integration is not configured" }, 404);
  }
  const apiKey = configRow.api_key_encrypted;

  // ── Test connection ──
  if (body.test_connection) {
    try {
      const resp = await fetch(
        `https://serpapi.com/search.json?engine=google_trends&q=test&api_key=${apiKey}&data_type=TIMESERIES`
      );
      if (!resp.ok) {
        const errText = await resp.text();
        return json({ error: `SerpAPI responded ${resp.status}: ${errText}` }, 502);
      }
      return json({ success: true, message: "SerpAPI connection successful" });
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
    .insert({
      platform_name: "google_trends", integration_id: configRow.id,
      engagement_id, triggered_by: user.id, status: "running",
    } as any)
    .select().single();
  const syncLogId = (logEntry as any)?.id ?? null;

  try {
    if (keywords.length === 0) {
      await updateSyncLog(supabase, syncLogId, "success", startMs, 0, "No keywords provided");
      return json({ success: true, records_ingested: 0, message: "No keywords to track" });
    }

    // SerpAPI supports up to 5 keywords per request for comparison
    const batches: string[][] = [];
    for (let i = 0; i < keywords.length; i += 5) {
      batches.push(keywords.slice(i, i + 5));
    }

    const trendRows: any[] = [];

    for (const batch of batches) {
      const q = batch.join(",");

      // 1. Interest over time (last 90 days, Nigeria)
      const timeUrl = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(q)}&data_type=TIMESERIES&date=today+3-m&geo=NG&api_key=${apiKey}`;
      const timeResp = await fetch(timeUrl);

      if (timeResp.ok) {
        const timeData = await timeResp.json();
        const timelineData = timeData.interest_over_time?.timeline_data ?? [];

        for (const point of timelineData) {
          const dateStr = point.date ? point.date.split(" ")[0] : null;
          // Each point has values array with one entry per keyword
          const values = point.values ?? [];
          for (const val of values) {
            const keyword = val.query ?? batch[0];
            trendRows.push({
              engagement_id,
              keyword,
              date: dateStr ?? new Date().toISOString().split("T")[0],
              interest_score: parseInt(val.extracted_value ?? "0", 10),
              region: null, // national-level time series
            });
          }
        }
      }

      // 2. Interest by region (Nigerian states)
      const regionUrl = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(q)}&data_type=GEO_MAP&geo=NG&api_key=${apiKey}`;
      const regionResp = await fetch(regionUrl);

      if (regionResp.ok) {
        const regionData = await regionResp.json();
        const regions = regionData.interest_by_region ?? [];

        for (const reg of regions) {
          trendRows.push({
            engagement_id,
            keyword: batch[0], // Primary keyword for region data
            date: new Date().toISOString().split("T")[0],
            interest_score: parseInt(reg.extracted_value ?? reg.value ?? "0", 10),
            region: reg.location ?? reg.geo ?? null,
          });
        }
      }

      // Respect rate limits — brief pause between batches
      if (batches.length > 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Bulk insert trend data
    if (trendRows.length > 0) {
      // Insert in chunks of 500
      for (let i = 0; i < trendRows.length; i += 500) {
        const chunk = trendRows.slice(i, i + 500);
        const { error: insertErr } = await supabase
          .from("google_trends_data" as any)
          .insert(chunk);
        if (!insertErr) recordsIngested += chunk.length;
      }
    }

    await updateSyncLog(supabase, syncLogId, "success", startMs, recordsIngested, null);
    await supabase.from("integration_configs")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "success", error_log: null })
      .eq("id", configRow.id);

    await supabase.from("audit_logs").insert({
      user_id: user.id, action: "create", table_name: "google_trends_data",
      record_id: engagement_id,
      new_values: { source: "sync-google-trends", records_ingested: recordsIngested },
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
