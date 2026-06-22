// Admin-only endpoint to modify merchant subscriptions, addons and limits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getUserFromRequest, isAdminUser } from "../_shared/checkFeature.ts";

const PLAN_DEFAULTS: Record<string, { staff_limit: number; outlet_limit: number }> = {
  basic:    { staff_limit: 0,  outlet_limit: 1 },
  gold:     { staff_limit: 10, outlet_limit: 1 },
  platinum: { staff_limit: 25, outlet_limit: 2 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { user } = await getUserFromRequest(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!(await isAdminUser(user.id))) {
    return new Response(JSON.stringify({ error: "Forbidden - admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action, merchant_id } = body ?? {};
  if (!action || !merchant_id) {
    return new Response(JSON.stringify({ error: "action and merchant_id are required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    switch (action) {
      case "assign_plan": {
        const plan = String(body.plan ?? "").toLowerCase();
        if (!PLANS.has(plan)) throw new Error("plan must be basic, gold or platinum");
        const defaults = PLAN_DEFAULTS[plan];
        const days = Number(body.duration_days ?? 365);
        const expiry = new Date(Date.now() + days * 86400_000).toISOString();
        const { error } = await sb.from("merchant_subscription").upsert({
          merchant_id,
          plan_name: plan,
          status: "active",
          staff_limit: defaults.staff_limit,
          outlet_limit: defaults.outlet_limit,
          extra_staff: 0,
          extra_outlets: 0,
          expiry_date: expiry,
          updated_at: new Date().toISOString(),
        }, { onConflict: "merchant_id" });
        if (error) throw error;
        return ok({ plan, expiry });
      }

      case "extend_expiry": {
        const days = Number(body.days ?? 365);
        const { data: cur } = await sb.from("merchant_subscription")
          .select("expiry_date").eq("merchant_id", merchant_id).maybeSingle();
        const base = cur?.expiry_date ? new Date(cur.expiry_date as string) : new Date();
        if (base.getTime() < Date.now()) base.setTime(Date.now());
        base.setTime(base.getTime() + days * 86400_000);
        const { error } = await sb.from("merchant_subscription")
          .update({ expiry_date: base.toISOString(), status: "active" })
          .eq("merchant_id", merchant_id);
        if (error) throw error;
        return ok({ expiry: base.toISOString() });
      }

      case "set_limits": {
        const patch: any = {};
        if (body.extra_staff != null)   patch.extra_staff   = Number(body.extra_staff);
        if (body.extra_outlets != null) patch.extra_outlets = Number(body.extra_outlets);
        if (body.staff_limit != null)   patch.staff_limit   = Number(body.staff_limit);
        if (body.outlet_limit != null)  patch.outlet_limit  = Number(body.outlet_limit);
        const { error } = await sb.from("merchant_subscription").update(patch).eq("merchant_id", merchant_id);
        if (error) throw error;
        return ok(patch);
      }

      case "suspend": {
        const { error } = await sb.from("merchant_subscription")
          .update({ status: "suspended" }).eq("merchant_id", merchant_id);
        if (error) throw error;
        return ok({ status: "suspended" });
      }

      case "reactivate": {
        const { error } = await sb.from("merchant_subscription")
          .update({ status: "active" }).eq("merchant_id", merchant_id);
        if (error) throw error;
        return ok({ status: "active" });
      }

      case "activate_addon": {
        const feature_key = String(body.feature_key ?? "");
        if (!feature_key) throw new Error("feature_key required");
        const days = Number(body.duration_days ?? 365);
        const expiry = new Date(Date.now() + days * 86400_000).toISOString();
        const { error } = await sb.from("merchant_addons").upsert({
          merchant_id, feature_key, enabled: true,
          purchase_date: new Date().toISOString(),
          expiry_date: expiry,
          updated_at: new Date().toISOString(),
        }, { onConflict: "merchant_id,feature_key" });
        if (error) throw error;
        return ok({ feature_key, expiry });
      }

      case "remove_addon": {
        const feature_key = String(body.feature_key ?? "");
        const { error } = await sb.from("merchant_addons")
          .update({ enabled: false }).eq("merchant_id", merchant_id).eq("feature_key", feature_key);
        if (error) throw error;
        return ok({ feature_key, enabled: false });
      }

      case "set_custom_plan": {
        const features: string[] = Array.isArray(body.features) ? body.features : [];
        const { error } = await sb.from("merchant_custom_plan").upsert({
          merchant_id, features, is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "merchant_id" });
        if (error) throw error;
        return ok({ features });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e: any) {
    console.error("[admin-subscription-manage]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

const PLANS = new Set(["basic", "gold", "platinum"]);

function ok(payload: any) {
  return new Response(JSON.stringify({ success: true, ...payload }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
