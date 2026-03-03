/**
 * detect-scenario-triggers Edge Function
 *
 * Scans last 24hrs of intel_items against active scenario trigger_events.
 * Creates scenario_alerts for matches. Called by cron-scheduler.
 *
 * Request body:
 *   { engagement_id?: string } — if omitted, checks all engagements
 *
 * Security:
 *   - JWT verification required (service role for cron)
 *   - Logs to audit_logs
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Auth — allow service-role calls (from cron) or user JWT
  const authHeader = req.headers.get("Authorization");
  let userId = "system";
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) userId = user.id;
  }

  let body: { engagement_id?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  // ── Fetch active scenarios ──
  let scenarioQuery = supabase
    .from("scenarios")
    .select("id, engagement_id, name, trigger_events, status")
    .in("status", ["active", "watching"]);

  if (body.engagement_id) {
    scenarioQuery = scenarioQuery.eq("engagement_id", body.engagement_id);
  }

  const { data: scenarios, error: scenErr } = await scenarioQuery;
  if (scenErr || !scenarios?.length) {
    return json({ alerts_created: 0, message: "No active scenarios found" });
  }

  // ── Fetch last 24hrs intel items ──
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);

  const engagementIds = [...new Set(scenarios.map(s => s.engagement_id))];

  const { data: items } = await supabase
    .from("intel_items")
    .select("id, engagement_id, headline, raw_content")
    .in("engagement_id", engagementIds)
    .gte("date_logged", yesterdayISO);

  if (!items?.length) return json({ alerts_created: 0, message: "No recent intel items" });

  // ── Check for existing alerts to avoid duplicates ──
  const { data: existingAlerts } = await supabase
    .from("scenario_alerts")
    .select("scenario_id, intel_item_id")
    .in("scenario_id", scenarios.map(s => s.id))
    .gte("created_at", yesterday.toISOString());

  const existingSet = new Set(
    (existingAlerts ?? []).map(a => `${a.scenario_id}:${a.intel_item_id}`)
  );

  // ── Match triggers ──
  const alertsToInsert: Array<{
    engagement_id: string;
    scenario_id: string;
    intel_item_id: string;
    matched_keyword: string;
  }> = [];

  for (const scenario of scenarios) {
    const triggers: string[] = Array.isArray(scenario.trigger_events)
      ? scenario.trigger_events
      : [];
    if (triggers.length === 0) continue;

    const engItems = items.filter(i => i.engagement_id === scenario.engagement_id);

    for (const item of engItems) {
      const text = `${item.headline ?? ''} ${item.raw_content ?? ''}`.toLowerCase();

      for (const keyword of triggers) {
        if (typeof keyword !== 'string') continue;
        if (text.includes(keyword.toLowerCase())) {
          const key = `${scenario.id}:${item.id}`;
          if (!existingSet.has(key)) {
            existingSet.add(key);
            alertsToInsert.push({
              engagement_id: scenario.engagement_id,
              scenario_id: scenario.id,
              intel_item_id: item.id,
              matched_keyword: keyword,
            });
          }
        }
      }
    }
  }

  // ── Insert alerts ──
  if (alertsToInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from("scenario_alerts")
      .insert(alertsToInsert);

    if (insertErr) {
      console.error("[detect-scenario-triggers] Insert error:", insertErr);
    }
  }

  // Audit log
  supabase.from("audit_logs").insert({
    user_id: userId,
    action: "read",
    table_name: "detect_scenario_triggers",
    new_values: {
      scenarios_checked: scenarios.length,
      items_scanned: items.length,
      alerts_created: alertsToInsert.length,
      function_name: "detect-scenario-triggers",
    },
  }).then(() => {}).catch(() => {});

  return json({
    alerts_created: alertsToInsert.length,
    scenarios_checked: scenarios.length,
    items_scanned: items.length,
  });
});
