// Admin approves or rejects a merchant subscription request.
// Approval auto-applies the requested change.
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
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!(await isAdminUser(user.id))) return json({ error: "Forbidden" }, 403);

  let body: any; try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { request_id, decision, admin_note } = body ?? {};
  if (!request_id || !["approved", "rejected"].includes(decision)) {
    return json({ error: "request_id and decision (approved|rejected) required" }, 400);
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: reqRow, error: loadErr } = await sb.from("subscription_requests")
    .select("*").eq("id", request_id).maybeSingle();
  if (loadErr || !reqRow) return json({ error: "Request not found" }, 404);
  if (reqRow.status !== "pending") return json({ error: "Request already processed" }, 400);

  try {
    if (decision === "approved") {
      const merchant_id = reqRow.merchant_id;
      switch (reqRow.request_type) {
        case "plan_upgrade": {
          const plan = String(reqRow.requested_plan ?? "").toLowerCase();
          const def = PLAN_DEFAULTS[plan];
          if (!def) throw new Error("Invalid requested_plan");
          const expiry = new Date(Date.now() + 365 * 86400_000).toISOString();
          await sb.from("merchant_subscription").upsert({
            merchant_id, plan_name: plan, status: "active",
            staff_limit: def.staff_limit, outlet_limit: def.outlet_limit,
            extra_staff: 0, extra_outlets: 0, expiry_date: expiry,
            updated_at: new Date().toISOString(),
          }, { onConflict: "merchant_id" });
          break;
        }
        case "addon": {
          const fk = String(reqRow.requested_feature ?? "");
          if (!fk) throw new Error("requested_feature missing");
          await sb.from("merchant_addons").upsert({
            merchant_id, feature_key: fk, enabled: true,
            purchase_date: new Date().toISOString(),
            expiry_date: new Date(Date.now() + 365 * 86400_000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "merchant_id,feature_key" });
          break;
        }
        case "extra_staff": {
          const qty = Math.max(1, Number(reqRow.quantity ?? 1));
          const { data: cur } = await sb.from("merchant_subscription")
            .select("extra_staff").eq("merchant_id", merchant_id).maybeSingle();
          await sb.from("merchant_subscription")
            .update({ extra_staff: (cur?.extra_staff ?? 0) + qty })
            .eq("merchant_id", merchant_id);
          break;
        }
        case "extra_outlet": {
          const qty = Math.max(1, Number(reqRow.quantity ?? 1));
          const { data: cur } = await sb.from("merchant_subscription")
            .select("extra_outlets").eq("merchant_id", merchant_id).maybeSingle();
          await sb.from("merchant_subscription")
            .update({ extra_outlets: (cur?.extra_outlets ?? 0) + qty })
            .eq("merchant_id", merchant_id);
          break;
        }
        case "custom": {
          // Admin should set features manually via admin-subscription-manage.
          break;
        }
        default:
          throw new Error(`Unknown request_type: ${reqRow.request_type}`);
      }
    }

    const { error: updErr } = await sb.from("subscription_requests").update({
      status: decision,
      admin_note: admin_note ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", request_id);
    if (updErr) throw updErr;

    return json({ success: true, status: decision });
  } catch (e: any) {
    console.error("[process-subscription-request]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(p: any, status = 200) {
  return new Response(JSON.stringify(p), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
