/**
 * ai-summarise Edge Function
 *
 * General-purpose AI summarisation via Lovable AI Gateway.
 * Accepts notes text and returns 3–5 bullet-point insights.
 * Used by the Discovery Framework and other modules.
 *
 * Request body:
 *   { notes_text: string; context?: string }
 *
 * Response:
 *   { summary: string; bullets: string[]; duration_ms: number }
 *
 * Security:
 *   - JWT verification required
 *   - Uses LOVABLE_API_KEY (auto-provisioned) — no external API keys needed
 *   - All calls logged to audit_logs
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

  let body: { notes_text?: string; context?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (!body.notes_text?.trim()) return json({ error: "notes_text is required" }, 400);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "AI service not configured" }, 503);

  const startMs = Date.now();

  const systemPrompt = [
    "You are a senior political intelligence analyst at a confidential strategic advisory firm.",
    body.context ? `Context: ${body.context}.` : "",
    "Produce exactly 3 to 5 concise, insight-rich bullet points.",
    "Each bullet must be specific, actionable, and directly useful for political strategy.",
    "Do not include preamble, headers, or explanation — output ONLY the bullets.",
    "Start each bullet with '•' followed by a space. Each bullet on its own line.",
  ].filter(Boolean).join(" ");

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
          { role: "user", content: body.notes_text.slice(0, 8000) },
        ],
        max_tokens: 500,
        temperature: 0.25,
      }),
    });

    if (aiResp.status === 429) return json({ error: "AI rate limit exceeded. Try again later." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted. Please add funds." }, 402);

    const aiRespBody = await aiResp.text();
    if (!aiResp.ok) {
      console.error("[ai-summarise] Gateway error:", aiResp.status, aiRespBody);
      return json({ error: "AI gateway error" }, 502);
    }

    const aiData = JSON.parse(aiRespBody);
    const rawSummary: string = aiData.choices?.[0]?.message?.content ?? "";
    const durationMs = Date.now() - startMs;

    const bullets = rawSummary
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.startsWith("•") || l.startsWith("-"));

    // Audit log (fire-and-forget)
    supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "read",
      table_name: "ai_summarise",
      new_values: { duration_ms: durationMs, bullet_count: bullets.length },
    }).then(() => {}).catch(() => {});

    return json({ summary: rawSummary, bullets, duration_ms: durationMs });
  } catch (err) {
    console.error("[ai-summarise] Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
