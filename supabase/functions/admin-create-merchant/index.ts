import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!roleRow) return json({ error: "Only admins can create merchants" }, 403);

    const body = await req.json();
    const {
      fullName, email, businessName, businessType,
      phone, password, plan,
    } = body;

    if (!fullName || !email || !businessName || !phone || !password) {
      return json({ error: "Missing required fields" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (authErr || !authData.user) return json({ error: authErr?.message || "Failed to create user" }, 400);

    const newUserId = authData.user.id;

    const { data: merchant, error: mErr } = await admin.from("merchants").insert({
      owner_user_id: newUserId,
      business_name: businessName,
      owner_name: fullName,
      owner_email: normalizedEmail,
      phone,
      business_type: businessType || "retail",
      subscription_plan: plan || "basic",
      subscription_tier: plan || "basic",
      approval_status: "approved",
      is_active: true,
    }).select("id").single();

    if (mErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: mErr.message }, 400);
    }

    // Replace any default role row created by handle_new_user trigger
    await admin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: rErr } = await admin.from("user_roles").insert({
      user_id: newUserId,
      role: "owner",
      merchant_id: merchant.id,
      is_active: true,
    });
    if (rErr) {
      await admin.from("merchants").delete().eq("id", merchant.id);
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: rErr.message }, 400);
    }

    return json({ success: true, merchant_id: merchant.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
