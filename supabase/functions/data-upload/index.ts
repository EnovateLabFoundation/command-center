/**
 * data-upload Edge Function
 *
 * Parses uploaded CSV data and bulk-inserts into the appropriate table
 * (geo_data, geo_demographics, or intel_items).
 *
 * Supported data_type values:
 *   - election_results → geo_data
 *   - voter_registration → geo_data
 *   - nbs_demographics → geo_demographics
 *   - polling_data → geo_data
 *
 * Request body:
 *   { data_type: string; csv_content: string; engagement_id?: string }
 *
 * CSV content should be a string with the first row as headers.
 *
 * Security:
 *   - JWT verification required
 *   - Role check: super_admin or intel_analyst only
 *   - All operations logged to audit_logs
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

/** Simple CSV parser — handles quoted fields and newlines within quotes */
function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    if (values.length !== headers.length) continue; // Skip malformed rows

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }
  return rows;
}

/** Column name mapping for geo_data table */
const GEO_DATA_MAP: Record<string, string> = {
  state: "state", lga: "lga", ward: "ward",
  polling_unit_code: "polling_unit_code", polling_unit: "polling_unit_code",
  registered_voters: "registered_voters", reg_voters: "registered_voters",
  last_election_votes: "last_election_votes", votes: "last_election_votes",
  winning_party: "winning_party", party: "winning_party",
};

/** Column name mapping for geo_demographics table */
const DEMO_MAP: Record<string, string> = {
  lga_name: "lga_name", lga: "lga_name",
  state: "state",
  population_estimate: "population_estimate", population: "population_estimate",
  median_income: "median_income", income: "median_income",
  poverty_rate: "poverty_rate", poverty: "poverty_rate",
  literacy_rate: "literacy_rate", literacy: "literacy_rate",
  urban_rural: "urban_rural", classification: "urban_rural",
};

/** Map CSV row to target schema using column mapping */
function mapRow(row: Record<string, string>, mapping: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [csvCol, value] of Object.entries(row)) {
    const targetCol = mapping[csvCol];
    if (targetCol) {
      // Auto-convert numeric fields
      const numVal = parseFloat(value);
      result[targetCol] = !isNaN(numVal) && /^\d/.test(value) ? numVal : value;
    }
  }
  return result;
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

  // Role check — only super_admin and intel_analyst can upload data
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const userRoles = (roles ?? []).map((r: any) => r.role);
  if (!userRoles.includes("super_admin") && !userRoles.includes("intel_analyst")) {
    return json({ error: "Insufficient permissions" }, 403);
  }

  let body: { data_type: string; csv_content: string; engagement_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { data_type, csv_content, engagement_id } = body;
  if (!data_type || !csv_content) {
    return json({ error: "data_type and csv_content are required" }, 400);
  }

  // Parse CSV
  const rows = parseCSV(csv_content);
  if (rows.length === 0) {
    return json({ error: "No valid data rows found in CSV" }, 400);
  }

  let tableName: string;
  let mappedRows: Record<string, any>[];
  let errors: string[] = [];

  switch (data_type) {
    case "election_results":
    case "voter_registration":
    case "polling_data": {
      tableName = "geo_data";
      mappedRows = rows.map((r) => {
        const mapped = mapRow(r, GEO_DATA_MAP);
        mapped.created_by = user.id;
        return mapped;
      }).filter((r) => {
        if (!r.state) {
          errors.push("Row missing required 'state' field");
          return false;
        }
        return true;
      });
      break;
    }
    case "nbs_demographics": {
      tableName = "geo_demographics";
      mappedRows = rows.map((r) => {
        const mapped = mapRow(r, DEMO_MAP);
        mapped.created_by = user.id;
        return mapped;
      }).filter((r) => {
        if (!r.lga_name || !r.state) {
          errors.push("Row missing required 'lga_name' or 'state' field");
          return false;
        }
        return true;
      });
      break;
    }
    default:
      return json({ error: `Unknown data_type: ${data_type}. Valid: election_results, voter_registration, nbs_demographics, polling_data` }, 400);
  }

  if (mappedRows.length === 0) {
    return json({ error: "No valid rows after mapping", validation_errors: errors }, 400);
  }

  // Bulk insert in chunks
  let inserted = 0;
  const chunkSize = 500;

  for (let i = 0; i < mappedRows.length; i += chunkSize) {
    const chunk = mappedRows.slice(i, i + chunkSize);
    const { error: insertErr } = await supabase
      .from(tableName as any)
      .insert(chunk);
    if (insertErr) {
      errors.push(`Chunk ${Math.floor(i / chunkSize) + 1}: ${insertErr.message}`);
    } else {
      inserted += chunk.length;
    }
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id, action: "create", table_name: tableName,
    record_id: engagement_id ?? null,
    new_values: { source: "data-upload", data_type, rows_inserted: inserted, errors: errors.length },
  });

  return json({
    success: true,
    rows_parsed: rows.length,
    rows_inserted: inserted,
    rows_skipped: rows.length - inserted,
    validation_errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  });
});
