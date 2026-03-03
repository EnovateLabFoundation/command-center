/**
 * sentiment-score Edge Function
 *
 * Accepts text and language, uses Lovable AI Gateway to score sentiment
 * on a -2 to +2 scale and extract a narrative theme.
 * Called for every new intel item before insertion.
 *
 * Request body:
 *   { text: string; language?: string }
 *
 * Response:
 *   { score: number; theme: string; confidence: number }
 *
 * Security:
 *   - JWT verification required
 *   - Uses LOVABLE_API_KEY (auto-provisioned) for AI Gateway
 *   - No external API keys required
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
  let body: { text?: string; language?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { text, language = "en" } = body;
  if (!text?.trim()) return json({ error: "text is required" }, 400);

  // ── AI Gateway call via tool calling for structured output ──
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "AI service not configured" }, 503);

  const systemPrompt = [
    "You are a political intelligence sentiment analyst.",
    `Analyse the following text (language: ${language}).`,
    "Determine the sentiment score and the dominant narrative theme.",
  ].join(" ");

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
          { role: "user", content: text.slice(0, 4000) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_sentiment",
              description: "Return sentiment score, narrative theme, and confidence level.",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "Sentiment score from -2 (very negative) to +2 (very positive). Use 0 for neutral.",
                  },
                  theme: {
                    type: "string",
                    description: "The dominant narrative theme (e.g. 'governance reform', 'economic policy', 'security concerns').",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level 0.0 to 1.0 in the assessment.",
                  },
                },
                required: ["score", "theme", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "score_sentiment" } },
      }),
    });

    if (aiResp.status === 429) {
      return json({ error: "AI rate limit exceeded. Please try again later." }, 429);
    }
    if (aiResp.status === 402) {
      return json({ error: "AI credits exhausted. Please add funds." }, 402);
    }

    const aiRespBody = await aiResp.text();
    if (!aiResp.ok) {
      console.error("[sentiment-score] AI Gateway error:", aiResp.status, aiRespBody);
      return json({ error: "AI gateway error" }, 502);
    }

    const aiData = JSON.parse(aiRespBody);
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return json({ error: "AI did not return structured output" }, 502);
    }

    const result = JSON.parse(toolCall.function.arguments);

    return json({
      score: Math.max(-2, Math.min(2, Number(result.score) || 0)),
      theme: result.theme ?? "unclassified",
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.5)),
    });
  } catch (err) {
    console.error("[sentiment-score] Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
