/**
 * admin-users Edge Function
 *
 * Server-side admin operations requiring the service role key:
 *   - POST /admin-users { action: "create", ... }  → Create user via Supabase Admin API
 *   - POST /admin-users { action: "deactivate", user_id }  → Deactivate user + revoke sessions
 *   - POST /admin-users { action: "activate", user_id }    → Reactivate user
 *   - POST /admin-users { action: "change_role", user_id, new_role }  → Update role assignment
 *   - POST /admin-users { action: "reset_mfa", user_id }   → Clear MFA factors
 *
 * All actions require the caller to be a super_admin (validated via JWT).
 * All mutations are logged to audit_logs.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Caller client (uses caller's JWT for RLS checks)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin role
    const { data: roleCheck } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    // ── CREATE USER ──────────────────────────────────────────────────────────
    if (action === "create") {
      const { email, full_name, role, password } = body;
      if (!email || !full_name || !role) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password: password || undefined,
        email_confirm: !!password, // auto-confirm if password provided
        user_metadata: { full_name },
      });

      if (createErr || !newUser.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If no password, send invite email
      if (!password) {
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: { full_name },
        });
      }

      // Assign role
      await adminClient.from("user_roles").insert({
        user_id: newUser.user.id,
        role,
        granted_by: caller.id,
      });

      // Audit log
      await adminClient.from("audit_logs").insert({
        user_id: caller.id,
        action: "create",
        table_name: "profiles",
        record_id: newUser.user.id,
        new_values: { email, full_name, role },
      });

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DEACTIVATE USER ──────────────────────────────────────────────────────
    if (action === "deactivate") {
      const { user_id } = body;

      // Set profile inactive
      await adminClient.from("profiles").update({ is_active: false, updated_by: caller.id }).eq("id", user_id);

      // Ban user in auth (revokes sessions)
      await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "876000h" }); // ~100 years

      // Audit log
      await adminClient.from("audit_logs").insert({
        user_id: caller.id,
        action: "update",
        table_name: "profiles",
        record_id: user_id,
        old_values: { is_active: true },
        new_values: { is_active: false },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTIVATE USER ────────────────────────────────────────────────────────
    if (action === "activate") {
      const { user_id } = body;

      await adminClient.from("profiles").update({ is_active: true, updated_by: caller.id }).eq("id", user_id);
      await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "none" });

      await adminClient.from("audit_logs").insert({
        user_id: caller.id,
        action: "update",
        table_name: "profiles",
        record_id: user_id,
        old_values: { is_active: false },
        new_values: { is_active: true },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CHANGE ROLE ──────────────────────────────────────────────────────────
    if (action === "change_role") {
      const { user_id, new_role, old_role } = body;

      // Remove old role assignment(s)
      await adminClient.from("user_roles").delete().eq("user_id", user_id);

      // Insert new role
      await adminClient.from("user_roles").insert({
        user_id,
        role: new_role,
        granted_by: caller.id,
      });

      // Audit log
      await adminClient.from("audit_logs").insert({
        user_id: caller.id,
        action: "update",
        table_name: "user_roles",
        record_id: user_id,
        old_values: { role: old_role },
        new_values: { role: new_role },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RESET MFA ────────────────────────────────────────────────────────────
    if (action === "reset_mfa") {
      const { user_id } = body;

      // List and unenroll all MFA factors
      const { data: factors } = await adminClient.auth.admin.mfa.listFactors({ userId: user_id });
      if (factors?.factors) {
        for (const factor of factors.factors) {
          await adminClient.auth.admin.mfa.deleteFactor({ userId: user_id, factorId: factor.id });
        }
      }

      // Update profile
      await adminClient.from("profiles").update({ mfa_enabled: false, updated_by: caller.id }).eq("id", user_id);

      // Audit log
      await adminClient.from("audit_logs").insert({
        user_id: caller.id,
        action: "update",
        table_name: "profiles",
        record_id: user_id,
        new_values: { mfa_reset: true },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-users error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
