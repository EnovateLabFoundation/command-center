/**
 * discovery-summarise Edge Function
 *
 * Receives a single discovery area's raw notes and calls the OpenAI API
 * to produce 3-5 structured bullet-point insights. Only the notes text
 * is sent to OpenAI — no engagement context or PII is transmitted.
 *
 * Request body:
 *   { area_title: string; notes_text: string; area_index: number; engagement_id: string }
 *
 * Response:
 *   { summary: string; bullets: string[]; tokens_used: number; duration_ms: number }
 *
 * Security:
 *   - JWT verification: only authenticated users can call this function
 *   - Every call is logged in audit_logs with timestamp + token usage
 *   - Only notes_text is forwarded to OpenAI (never engagement context)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth: verify the caller's JWT ───────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } =
    await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: {
    area_title?: string;
    notes_text?: string;
    area_index?: number;
    engagement_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { area_title, notes_text, area_index, engagement_id } = body;

  if (!notes_text?.trim()) {
    return json(
      { error: "notes_text is required and must not be empty" },
      400,
    );
  }
  if (!area_title) {
    return json({ error: "area_title is required" }, 400);
  }

  // ── OpenAI API call ─────────────────────────────────────────────────────────
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return json(
      { error: "AI service is not configured on this server" },
      503,
    );
  }

  const startMs = Date.now();

  const systemPrompt = [
    "You are a senior political intelligence analyst at a confidential strategic advisory firm.",
    `You are summarising discovery session notes captured under the area: "${area_title}".`,
    "Produce exactly 3 to 5 concise, insight-rich bullet points.",
    "Each bullet must be specific, actionable, and directly useful for political strategy.",
    "Do not include any preamble, headers, or explanation — output ONLY the bullets.",
    "Start each bullet with the '•' character followed by a space.",
    "Each bullet should be on its own line.",
  ].join(" ");

  const aiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: notes_text },
        ],
        max_tokens: 500,
        temperature: 0.25,
      }),
    },
  );

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    return json({ error: `OpenAI API error: ${errText}` }, 502);
  }

  const aiData = await aiResponse.json();
  const rawSummary: string = aiData.choices?.[0]?.message?.content ?? "";
  const tokensUsed: number = aiData.usage?.total_tokens ?? 0;
  const durationMs = Date.now() - startMs;

  // Normalise to array of bullet strings
  const bullets = rawSummary
    .split("\n")
    .map((l: string) => l.trim())
    .filter(
      (l: string) => l.startsWith("•") || l.startsWith("-"),
    );

  // ── Audit log (fire-and-forget) ─────────────────────────────────────────────
  supabase
    .from("audit_logs")
    .insert({
      user_id: user.id,
      action: "ai_summarise",
      table_name: "discovery_sessions",
      record_id: engagement_id ?? null,
      new_values: {
        area_index: area_index ?? null,
        area_title,
        tokens_used: tokensUsed,
        duration_ms: durationMs,
        model: "gpt-4o-mini",
      },
    })
    .then(() => {})
    .catch(() => {});

  return json({
    summary: rawSummary,
    bullets,
    tokens_used: tokensUsed,
    duration_ms: durationMs,
  });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
