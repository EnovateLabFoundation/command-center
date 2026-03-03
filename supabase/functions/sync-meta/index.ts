/**
 * sync-meta Edge Function
 *
 * Pulls page/profile metrics from Meta Graph API (Facebook & Instagram).
 * Updates competitor_profiles with follower counts and engagement data.
 * Credentials read from integration_configs — never from the client.
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

  // ── Get Meta API credentials (try facebook first, then instagram) ──
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
  if (!accessToken) {
    return json({ error: "Meta API integration is not configured" }, 404);
  }

  // ── Test connection ──
  if (body.test_connection) {
    try {
      const resp = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`);
      const respBody = await resp.text();
      if (!resp.ok) return json({ error: `Meta API responded ${resp.status}: ${respBody}` }, 502);
      return json({ success: true, message: "Meta Graph API connection successful" });
    } catch (err) {
      return json({ error: `Connection test failed: ${(err as Error).message}` }, 502);
    }
  }

  // ── Full sync ──
  const { engagement_id, page_ids = [] } = body;
  if (!engagement_id) return json({ error: "engagement_id required" }, 400);

  const startMs = Date.now();
  let recordsUpdated = 0;
  const configId = fbConfig?.id ?? igConfig?.id;

  const { data: logEntry } = await supabase
    .from("sync_logs")
    .insert({ platform_name: "meta", integration_id: configId, engagement_id, triggered_by: user.id, status: "running" } as any)
    .select().single();
  const syncLogId = (logEntry as any)?.id ?? null;

  try {
    // Fetch competitor profiles for this engagement that have facebook pages
    const { data: competitors } = await supabase
      .from("competitor_profiles")
      .select("id, name, facebook_page, instagram_handle")
      .eq("engagement_id", engagement_id);

    for (const comp of (competitors ?? [])) {
      // Facebook page metrics
      if (comp.facebook_page) {
        try {
          const pageResp = await fetch(
            `https://graph.facebook.com/v19.0/${comp.facebook_page}?fields=fan_count,talking_about_count&access_token=${accessToken}`
          );
          if (pageResp.ok) {
            const pageData = await pageResp.json();
            await supabase.from("competitor_profiles").update({
              facebook_likes: pageData.fan_count ?? null,
              last_updated: new Date().toISOString(),
              updated_by: user.id,
            }).eq("id", comp.id);
            recordsUpdated++;
          } else {
            await pageResp.text(); // consume body
          }
        } catch { /* skip individual failures */ }
      }

      // Instagram metrics (if business account linked)
      if (comp.instagram_handle) {
        try {
          const igResp = await fetch(
            `https://graph.facebook.com/v19.0/${comp.instagram_handle}?fields=followers_count,media_count&access_token=${accessToken}`
          );
          if (igResp.ok) {
            const igData = await igResp.json();
            await supabase.from("competitor_profiles").update({
              instagram_followers: igData.followers_count ?? null,
              last_updated: new Date().toISOString(),
              updated_by: user.id,
            }).eq("id", comp.id);
            recordsUpdated++;
          } else {
            await igResp.text(); // consume body
          }
        } catch { /* skip individual failures */ }
      }
    }

    await updateSyncLog(supabase, syncLogId, "success", startMs, recordsUpdated, null);

    if (configId) {
      await supabase.from("integration_configs")
        .update({ last_sync_at: new Date().toISOString(), sync_status: "success", error_log: null })
        .eq("id", configId);
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id, action: "update", table_name: "competitor_profiles",
      record_id: engagement_id, new_values: { source: "sync-meta", records_updated: recordsUpdated },
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
