/**
 * seed-test-users
 *
 * Creates test user accounts for every LBD-SIP role with known credentials.
 * Only callable with the service role key (admin-level).
 *
 * POST /seed-test-users
 * Returns: { created: [...], skipped: [...] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const TEST_USERS = [
  { email: "admin@lbd-sip.test",      password: "Test@Admin2026!",    full_name: "Admin User",      role: "super_admin" },
  { email: "lead@lbd-sip.test",       password: "Test@Lead2026!",     full_name: "Lead Advisor",    role: "lead_advisor" },
  { email: "senior@lbd-sip.test",     password: "Test@Senior2026!",   full_name: "Senior Advisor",  role: "senior_advisor" },
  { email: "comms@lbd-sip.test",      password: "Test@Comms2026!",    full_name: "Comms Director",  role: "comms_director" },
  { email: "intel@lbd-sip.test",      password: "Test@Intel2026!",    full_name: "Intel Analyst",   role: "intel_analyst" },
  { email: "digital@lbd-sip.test",    password: "Test@Digital2026!",  full_name: "Digital Strategist", role: "digital_strategist" },
  { email: "client@lbd-sip.test",     password: "Test@Client2026!",   full_name: "Client Principal", role: "client_principal" },
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const created: string[] = [];
    const skipped: string[] = [];

    for (const user of TEST_USERS) {
      // Check if user already exists by listing with email filter
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const exists = existingUsers?.users?.find((u) => u.email === user.email);

      if (exists) {
        // Ensure role assignment exists
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", exists.id)
          .eq("role", user.role)
          .maybeSingle();

        if (!existingRole) {
          await supabaseAdmin.from("user_roles").insert({
            user_id: exists.id,
            role: user.role,
          });
        }
        skipped.push(user.email);
        continue;
      }

      // Create the auth user (auto-confirmed)
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name },
      });

      if (createErr || !newUser.user) {
        console.error(`Failed to create ${user.email}:`, createErr);
        skipped.push(user.email);
        continue;
      }

      // Assign role
      await supabaseAdmin.from("user_roles").insert({
        user_id: newUser.user.id,
        role: user.role,
      });

      created.push(user.email);
    }

    return new Response(JSON.stringify({ created, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
