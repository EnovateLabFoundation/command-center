import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_ATTEMPTS  = 5;
const WINDOW_MS     = 15 * 60 * 1000;   // 15-minute lockout window
const CORS_HEADERS  = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: { email?: string; action?: "check" | "record_failure" | "clear" };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { email, action = "check" } = body;
  if (!email || typeof email !== "string") {
    return json({ error: "email is required" }, 400);
  }

  const emailKey = email.toLowerCase().trim();
  const now      = Date.now();
  const windowStart = new Date(now - WINDOW_MS).toISOString();

  // ── Check: count recent failed attempts ───────────────────────────────────
  if (action === "check") {
    const { count } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "login")
      .eq("table_name", "auth_failed")
      .contains("new_values", { email: emailKey })
      .gte("created_at", windowStart);

    const attempts     = count ?? 0;
    const locked       = attempts >= MAX_ATTEMPTS;
    const remainingMs  = locked ? WINDOW_MS : 0;

    return json({ locked, attempts, remainingMs, max: MAX_ATTEMPTS });
  }

  // ── Record failure ────────────────────────────────────────────────────────
  if (action === "record_failure") {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    await supabase.from("audit_logs").insert({
      user_id:    "00000000-0000-0000-0000-000000000000",
      action:     "login",
      table_name: "auth_failed",
      record_id:  null,
      new_values: { email: emailKey, ip, ts: now },
    });

    // Re-check count to return accurate state
    const { count } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "login")
      .eq("table_name", "auth_failed")
      .contains("new_values", { email: emailKey })
      .gte("created_at", windowStart);

    const attempts    = count ?? 0;
    const locked      = attempts >= MAX_ATTEMPTS;
    const remainingMs = locked ? WINDOW_MS : 0;

    return json({ locked, attempts, remainingMs, max: MAX_ATTEMPTS });
  }

  // ── Clear (on successful login) ───────────────────────────────────────────
  if (action === "clear") {
    // Soft-clear by marking old failed attempts (audit log is immutable, so
    // we just return success — client clears its local counter)
    return json({ cleared: true });
  }

  return json({ error: "Unknown action" }, 400);
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
