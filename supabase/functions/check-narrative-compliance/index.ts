/**
 * check-narrative-compliance Edge Function
 *
 * AI-powered narrative compliance checker. Sends content + prohibited phrases
 * + narrative platform context to AI for deep compliance analysis.
 *
 * Request body:
 *   { content: string; prohibited_phrases: string[];
 *     narrative_context?: string }
 *
 * Response:
 *   { compliance_score: number; flagged_phrases: FlaggedPhrase[];
 *     risk_assessment: string; suggested_edits: string }
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

  let body: {
    content?: string;
    prohibited_phrases?: string[];
    narrative_context?: string;
  };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (!body.content?.trim()) return json({ error: "content is required" }, 400);
  if (!body.prohibited_phrases?.length) return json({ error: "prohibited_phrases array is required" }, 400);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "AI service not configured" }, 503);

  const startMs = Date.now();

  const systemPrompt = `You are a political communications compliance analyst. Your job is to check draft content against a list of prohibited phrases and messaging guidelines.

You must catch:
1. Exact matches of prohibited phrases
2. Paraphrased versions of prohibited messages
3. Implied meanings that violate the messaging discipline
4. Tone violations against the narrative platform

Be thorough but fair. Score from 0 (completely non-compliant) to 100 (fully compliant).

${body.narrative_context ? `Narrative Platform Context:\n${body.narrative_context}` : ''}

Prohibited Phrases:\n${body.prohibited_phrases.map((p, i) => `${i + 1}. "${p}"`).join("\n")}`;

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
          { role: "user", content: `Check this content for compliance:\n\n${body.content.slice(0, 6000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "compliance_result",
              description: "Return the compliance analysis results.",
              parameters: {
                type: "object",
                properties: {
                  compliance_score: {
                    type: "number",
                    description: "Compliance score from 0 to 100. 100 = fully compliant.",
                  },
                  flagged_phrases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        phrase: { type: "string", description: "The problematic phrase found in the content." },
                        reason: { type: "string", description: "Why this phrase is flagged." },
                        severity: { type: "string", description: "high, medium, or low severity." },
                      },
                      required: ["phrase", "reason", "severity"],
                    },
                    description: "List of flagged phrases with reasons.",
                  },
                  risk_assessment: {
                    type: "string",
                    description: "Overall risk assessment and narrative health analysis.",
                  },
                  suggested_edits: {
                    type: "string",
                    description: "Specific edit suggestions to improve compliance.",
                  },
                },
                required: ["compliance_score", "flagged_phrases", "risk_assessment", "suggested_edits"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "compliance_result" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "AI rate limit exceeded. Please try again later." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted. Please add funds." }, 402);

    const aiRespBody = await aiResp.text();
    if (!aiResp.ok) {
      console.error("[check-narrative-compliance] AI Gateway error:", aiResp.status, aiRespBody);
      return json({ error: "AI gateway error" }, 502);
    }

    const aiData = JSON.parse(aiRespBody);
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return json({ error: "AI did not return structured output" }, 502);

    const result = JSON.parse(toolCall.function.arguments);
    const durationMs = Date.now() - startMs;
    const tokensUsed = aiData.usage?.total_tokens ?? 0;

    // Audit log
    supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "read",
      table_name: "check_narrative_compliance",
      new_values: {
        tokens_used: tokensUsed,
        model: "google/gemini-3-flash-preview",
        duration_ms: durationMs,
        compliance_score: result.compliance_score,
        flagged_count: result.flagged_phrases?.length ?? 0,
        function_name: "check-narrative-compliance",
      },
    }).then(() => {}).catch(() => {});

    return json(result);
  } catch (err) {
    console.error("[check-narrative-compliance] Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
