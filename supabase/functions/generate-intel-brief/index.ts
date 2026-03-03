/**
 * generate-intel-brief Edge Function
 *
 * Generates an AI-powered intelligence briefing from intel_items
 * within a date range for a given engagement.
 *
 * Request body:
 *   { engagement_id: string; date_from: string; date_to: string }
 *
 * Response:
 *   { headline_intel: string; sentiment_assessment: string;
 *     key_threats: string; recommended_actions: string;
 *     brief_id?: string }
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
  let body: { engagement_id?: string; date_from?: string; date_to?: string; save?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { engagement_id, date_from, date_to, save = false } = body;
  if (!engagement_id) return json({ error: "engagement_id is required" }, 400);
  if (!date_from || !date_to) return json({ error: "date_from and date_to are required" }, 400);

  // ── Fetch intel items ──
  const { data: items, error: fetchErr } = await supabase
    .from("intel_items")
    .select("headline, summary, sentiment_score, narrative_theme, source_type, platform, reach_tier, date_logged, is_urgent, is_escalated")
    .eq("engagement_id", engagement_id)
    .gte("date_logged", date_from)
    .lte("date_logged", date_to)
    .order("date_logged", { ascending: false })
    .limit(200);

  if (fetchErr) return json({ error: "Failed to fetch intel items" }, 500);
  if (!items || items.length === 0) return json({ error: "No intel items found for this date range" }, 404);

  // ── AI Gateway call ──
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "AI service not configured" }, 503);

  const startMs = Date.now();

  // Summarise items for the prompt
  const itemsSummary = items.map((i, idx) =>
    `${idx + 1}. [${i.date_logged}] ${i.headline} | Sentiment: ${i.sentiment_score ?? 'N/A'} | Theme: ${i.narrative_theme ?? 'unclassified'} | Source: ${i.source_type ?? 'unknown'}/${i.platform ?? ''} | Tier: ${i.reach_tier ?? '?'} | Urgent: ${i.is_urgent} | Escalated: ${i.is_escalated}${i.summary ? ' | Summary: ' + i.summary : ''}`
  ).join("\n");

  const systemPrompt = `You are a senior political intelligence analyst at Lead by Darth, a confidential strategic advisory firm operating in Nigeria. Based on the following media intelligence data, write a concise, professional intelligence briefing in 4 sections:
1) Headline Intelligence (top 3 developments)
2) Sentiment Assessment (overall narrative health)
3) Key Threats (items requiring attention)
4) Recommended Actions

Write in formal advisory style. Be specific and reference the data.`;

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
          { role: "user", content: `Intelligence data (${items.length} items, ${date_from} to ${date_to}):\n\n${itemsSummary}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "write_intel_brief",
              description: "Return the 4-section intelligence briefing.",
              parameters: {
                type: "object",
                properties: {
                  headline_intel: { type: "string", description: "Top 3 headline intelligence developments." },
                  sentiment_assessment: { type: "string", description: "Overall narrative health and sentiment analysis." },
                  key_threats: { type: "string", description: "Items requiring immediate attention and risk assessment." },
                  recommended_actions: { type: "string", description: "Strategic recommendations and next steps." },
                },
                required: ["headline_intel", "sentiment_assessment", "key_threats", "recommended_actions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "write_intel_brief" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "AI rate limit exceeded. Please try again later." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted. Please add funds." }, 402);

    const aiRespBody = await aiResp.text();
    if (!aiResp.ok) {
      console.error("[generate-intel-brief] AI Gateway error:", aiResp.status, aiRespBody);
      return json({ error: "AI gateway error" }, 502);
    }

    const aiData = JSON.parse(aiRespBody);
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return json({ error: "AI did not return structured output" }, 502);

    const result = JSON.parse(toolCall.function.arguments);
    const durationMs = Date.now() - startMs;
    const tokensUsed = aiData.usage?.total_tokens ?? 0;

    // Save brief if requested
    let briefId: string | undefined;
    if (save) {
      const { data: briefData } = await supabase
        .from("briefs")
        .insert({
          engagement_id,
          type: "intel",
          content: result,
          generated_by: user.id,
          date_from,
          date_to,
        })
        .select("id")
        .single();
      briefId = briefData?.id;
    }

    // Audit log (fire-and-forget)
    supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "read",
      table_name: "generate_intel_brief",
      new_values: {
        engagement_id,
        date_from,
        date_to,
        items_count: items.length,
        tokens_used: tokensUsed,
        model: "google/gemini-3-flash-preview",
        duration_ms: durationMs,
        function_name: "generate-intel-brief",
      },
    }).then(() => {}).catch(() => {});

    return json({ ...result, brief_id: briefId });
  } catch (err) {
    console.error("[generate-intel-brief] Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
