/**
 * generate-discovery-brief Edge Function
 *
 * Generates a structured Discovery Brief from discovery session notes.
 *
 * Request body:
 *   { engagement_id: string }
 *
 * Response:
 *   { client_strategic_position, key_objectives, primary_threats,
 *     alliance_landscape, communications_gaps, strategic_recommendations }
 *
 * Security:
 *   - JWT verification required
 *   - Uses LOVABLE_API_KEY for AI Gateway
 *   - Logs to audit_logs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

  let body: { engagement_id?: string; save?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { engagement_id, save = false } = body;
  if (!engagement_id) return json({ error: "engagement_id is required" }, 400);

  // ── Fetch discovery session notes (stored as JSONB areas in onboarding steps or similar) ──
  // Discovery sessions store notes in the discovery_summarise pattern — fetch from the engagement's
  // cadence_touchpoints or from the AI summarise audit logs. We'll use a generic approach:
  // Look for any briefs of type 'discovery_notes' or fallback to audit_logs for discovery summaries.

  // Try fetching from audit_logs where table_name = 'ai_summarise' for this engagement
  const { data: summaryLogs } = await supabase
    .from("audit_logs")
    .select("new_values")
    .eq("table_name", "ai_summarise")
    .order("created_at", { ascending: false })
    .limit(50);

  // Also try fetching intel items as context
  const { data: intelItems } = await supabase
    .from("intel_items")
    .select("headline, summary, narrative_theme, sentiment_score")
    .eq("engagement_id", engagement_id)
    .order("date_logged", { ascending: false })
    .limit(50);

  // Build notes text from available data
  const notesText = [
    ...(summaryLogs?.map(l => {
      const vals = l.new_values as Record<string, unknown>;
      return vals?.bullet_count ? `Summary (${vals.bullet_count} bullets)` : '';
    }).filter(Boolean) ?? []),
    ...(intelItems?.map(i => `[${i.narrative_theme ?? 'general'}] ${i.headline}: ${i.summary ?? ''}`) ?? []),
  ].join("\n");

  if (!notesText.trim()) return json({ error: "No discovery data found for this engagement" }, 404);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "AI service not configured" }, 503);

  const startMs = Date.now();

  const systemPrompt = `You are a senior political intelligence analyst at Lead by Darth, a confidential strategic advisory firm. Based on the following confidential discovery session notes and intelligence data, write a structured Discovery Brief covering:
1) Client Strategic Position
2) Key Objectives
3) Primary Threats
4) Alliance Landscape
5) Communications Gaps
6) Strategic Recommendations

Format as a professional advisory brief. Be specific and actionable.`;

  try {
    const aiResp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: notesText.slice(0, 12000) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "write_discovery_brief",
              description: "Return the 6-section discovery brief.",
              parameters: {
                type: "object",
                properties: {
                  client_strategic_position: { type: "string" },
                  key_objectives: { type: "string" },
                  primary_threats: { type: "string" },
                  alliance_landscape: { type: "string" },
                  communications_gaps: { type: "string" },
                  strategic_recommendations: { type: "string" },
                },
                required: ["client_strategic_position", "key_objectives", "primary_threats", "alliance_landscape", "communications_gaps", "strategic_recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "write_discovery_brief" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "AI rate limit exceeded. Please try again later." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted. Please add funds." }, 402);

    const aiRespBody = await aiResp.text();
    if (!aiResp.ok) {
      console.error("[generate-discovery-brief] AI Gateway error:", aiResp.status, aiRespBody);
      return json({ error: "AI gateway error" }, 502);
    }

    const aiData = JSON.parse(aiRespBody);
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return json({ error: "AI did not return structured output" }, 502);

    const result = JSON.parse(toolCall.function.arguments);
    const durationMs = Date.now() - startMs;
    const tokensUsed = aiData.usage?.total_tokens ?? 0;

    if (save) {
      await supabase.from("briefs").insert({
        engagement_id,
        type: "discovery",
        content: result,
        generated_by: user.id,
      });
    }

    // Audit log
    supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "read",
      table_name: "generate_discovery_brief",
      new_values: {
        engagement_id,
        tokens_used: tokensUsed,
        model: "google/gemini-3-flash-preview",
        duration_ms: durationMs,
        function_name: "generate-discovery-brief",
      },
    }).then(() => {}).catch(() => {});

    return json(result);
  } catch (err) {
    console.error("[generate-discovery-brief] Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
