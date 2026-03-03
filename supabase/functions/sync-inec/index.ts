/**
 * sync-inec Edge Function
 *
 * Scrapes publicly available voter registration statistics from
 * the INEC (Independent National Electoral Commission) website.
 * Stores state/LGA-level data in the geo_data table, powering
 * the Geospatial Engine's data layer.
 *
 * Request body:
 *   { test_connection?: boolean }
 *
 * Security:
 *   - JWT verification required
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

/** Nigerian states for scraping — used when structured data isn't available */
const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

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

  let body: { test_connection?: boolean };
  try { body = await req.json(); } catch { body = {}; }

  // ── Get INEC config (optional — scraper doesn't require API key) ──
  const { data: configRow } = await supabase
    .from("integration_configs")
    .select("*")
    .eq("platform_name", "inec")
    .single();

  const baseUrl = (configRow?.config as any)?.scrape_url ?? "https://www.inecnigeria.org";

  // ── Test connection ──
  if (body.test_connection) {
    try {
      const resp = await fetch(baseUrl, { method: "HEAD" });
      if (!resp.ok) return json({ error: `INEC site returned ${resp.status}` }, 502);
      return json({ success: true, message: "INEC website is reachable" });
    } catch (err) {
      return json({ error: `Connection test failed: ${(err as Error).message}` }, 502);
    }
  }

  // ── Scrape ──
  const startMs = Date.now();
  let recordsIngested = 0;

  const { data: logEntry } = await supabase
    .from("sync_logs")
    .insert({
      platform_name: "inec", integration_id: configRow?.id ?? null,
      triggered_by: user.id, status: "running",
    } as any)
    .select().single();
  const syncLogId = (logEntry as any)?.id ?? null;

  try {
    // Attempt to fetch voter registration page
    const scrapeUrl = `${baseUrl}/voter-registration`;
    const resp = await fetch(scrapeUrl, {
      headers: { "User-Agent": "LBD-IntelPlatform/1.0" },
    });

    if (!resp.ok) {
      // Site may not expose structured data — log and suggest manual upload
      await updateSyncLog(supabase, syncLogId, "error", startMs, 0,
        `INEC page returned ${resp.status}. Data may need manual CSV upload.`);
      return json({
        success: false,
        error: `INEC website returned ${resp.status}. Consider using manual data upload for INEC/NBS data.`,
        suggestion: "Use the 'Upload Data File' feature in the Integration Console to import CSV/XLSX files.",
      }, 502);
    }

    const html = await resp.text();

    // Attempt basic HTML table parsing for voter registration data
    // INEC's data format varies — this handles common table structures
    const geoRows: any[] = [];
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);

    if (tableMatch) {
      for (const tableHtml of tableMatch) {
        const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
        if (!rowMatches) continue;

        for (const row of rowMatches) {
          const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
          if (!cells || cells.length < 2) continue;

          const cleanCell = (c: string) => c.replace(/<[^>]+>/g, "").trim();
          const cellValues = cells.map(cleanCell);

          // Try to match state-level data
          const stateName = cellValues[0];
          const isState = NIGERIAN_STATES.some(
            (s) => s.toLowerCase() === stateName.toLowerCase()
          );

          if (isState) {
            const registeredVoters = parseInt(cellValues[1]?.replace(/,/g, "") ?? "0", 10);
            geoRows.push({
              state: stateName,
              lga: null,
              ward: null,
              polling_unit_code: null,
              registered_voters: isNaN(registeredVoters) ? null : registeredVoters,
              last_election_votes: cellValues[2] ? parseInt(cellValues[2].replace(/,/g, ""), 10) || null : null,
              winning_party: cellValues[3] || null,
              created_by: user.id,
            });
          }
        }
      }
    }

    // Insert scraped data
    if (geoRows.length > 0) {
      const { error: insertErr } = await supabase
        .from("geo_data" as any)
        .insert(geoRows);
      if (!insertErr) recordsIngested = geoRows.length;
    }

    const message = geoRows.length > 0
      ? `Scraped ${geoRows.length} state-level records`
      : "No structured voter data found. Use manual CSV upload for detailed data.";

    await updateSyncLog(supabase, syncLogId, "success", startMs, recordsIngested, null);

    if (configRow) {
      await supabase.from("integration_configs")
        .update({ last_sync_at: new Date().toISOString(), sync_status: "success", error_log: null })
        .eq("id", configRow.id);
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id, action: "create", table_name: "geo_data",
      new_values: { source: "sync-inec", records_ingested: recordsIngested },
    });

    return json({ success: true, records_ingested: recordsIngested, message, duration_ms: Date.now() - startMs });
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
