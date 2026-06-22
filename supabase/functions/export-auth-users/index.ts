import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Use postgres connection via SUPABASE_DB_URL to read auth.users with password hashes
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: "SUPABASE_DB_URL not set" }), { status: 500, headers: corsHeaders });
  }

  try {
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(dbUrl);
    await client.connect();
    const result = await client.queryObject<any>(`
      SELECT id, email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at,
             confirmation_token, recovery_token, raw_app_meta_data, raw_user_meta_data,
             created_at, updated_at, last_sign_in_at, is_super_admin, role,
             aud, instance_id, banned_until, is_sso_user
      FROM auth.users
      ORDER BY created_at;
    `);
    await client.end();

    return new Response(
      JSON.stringify({ count: result.rows.length, users: result.rows }, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
