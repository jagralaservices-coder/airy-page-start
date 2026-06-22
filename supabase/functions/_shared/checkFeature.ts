// Shared helper for edge functions to verify a user's feature access.
// Uses the get_merchant_features SQL function as the single source of truth.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function getUserFromRequest(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { user: null, error: "missing-token" as const };
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { user: null, error: "invalid-token" as const };
  return { user: data.user, error: null };
}

export async function getUserFeatures(userId: string): Promise<string[]> {
  const sb = admin();
  const { data, error } = await sb.rpc("get_merchant_features", { _user_id: userId });
  if (error) {
    console.error("[checkFeature] rpc failed", error);
    return [];
  }
  return (data as string[]) ?? [];
}

export async function hasFeature(userId: string, key: string): Promise<boolean> {
  const features = await getUserFeatures(userId);
  if (features.includes("*")) return true;
  return features.includes(key);
}

/**
 * Helper to gate an edge function on a feature key.
 * Returns null when allowed, or an error Response when not.
 * Service-role calls (cron, internal recursion) bypass the check.
 */
export async function requireFeature(req: Request, featureKey: string): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  // Bypass for service-role / internal cron invocations
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (token && serviceRoleKey && token === serviceRoleKey) return null;

  const { user, error } = await getUserFromRequest(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", reason: error }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const ok = await hasFeature(user.id, featureKey);
  if (!ok) {
    return new Response(
      JSON.stringify({
        error: "Feature not available on your current plan",
        feature: featureKey,
        code: "FEATURE_LOCKED",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return null;
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const sb = admin();
  const { data } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("role", ["admin", "super_admin"]);
  return !!data && data.length > 0;
}

/**
 * Gate a public endpoint (no merchant JWT) on a feature via store_code.
 * Looks up the merchant owner for the store and checks their plan features.
 */
export async function requireStoreFeature(
  req: Request,
  storeCode: string | null | undefined,
  featureKey: string,
): Promise<Response | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return null;
  if (!storeCode) {
    return new Response(
      JSON.stringify({ error: "store_code required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const sb = admin();
  const { data: store } = await sb
    .from("stores")
    .select("id, customer_id")
    .eq("store_code", storeCode)
    .eq("is_active", true)
    .maybeSingle();
  if (!store?.customer_id) {
    return new Response(
      JSON.stringify({ error: "Store not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const { data: owner } = await sb
    .from("user_roles")
    .select("user_id")
    .eq("customer_id", store.customer_id)
    .eq("role", "owner")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!owner?.user_id) {
    return new Response(
      JSON.stringify({ error: "Merchant not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const ok = await hasFeature(owner.user_id, featureKey);
  if (!ok) {
    return new Response(
      JSON.stringify({
        error: "Feature not available on merchant's current plan",
        feature: featureKey,
        code: "FEATURE_LOCKED",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return null;
}
