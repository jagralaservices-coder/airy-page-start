import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id, store_code, reason } = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: "Missing payment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth: JWT (must be owner/admin) or store_code
    const authHeader = req.headers.get("Authorization");
    let authorized = false;
    let isRoleBased = false;

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await supabaseUser.auth.getClaims(token);
      if (!claimsErr && claims?.claims?.sub) {
        const userId = claims.claims.sub as string;
        // Check role - only admin or owner can refund
        const { data: role } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        
        if (role && (role.role === "admin" || role.role === "owner")) {
          authorized = true;
          isRoleBased = true;
        }
      }
    }

    // Store code fallback (for store-login mode, still restricted)
    if (!authorized && store_code) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id, store_code")
        .eq("store_code", store_code)
        .eq("is_active", true)
        .maybeSingle();
      if (store) {
        // Store login can refund but we log it
        authorized = true;
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Only admin/owner can process refunds." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment record
    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", payment_id)
      .maybeSingle();

    if (payErr || !payment) {
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment.status !== "paid") {
      return new Response(
        JSON.stringify({ error: `Cannot refund payment with status: ${payment.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payment.provider_payment_id) {
      return new Response(
        JSON.stringify({ error: "No provider payment ID found. Cannot process refund." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process Razorpay refund
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountInPaise = Math.round(Number(payment.amount) * 100);

    const rzpResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${payment.provider_payment_id}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
        },
        body: JSON.stringify({
          amount: amountInPaise,
          notes: {
            reason: reason || "Refund requested by merchant",
            payment_id: payment.id,
            store_id: payment.store_id,
          },
        }),
      }
    );

    const rzpData = await rzpResponse.json();

    if (!rzpResponse.ok) {
      console.error("Razorpay refund failed:", rzpData);
      return new Response(
        JSON.stringify({ error: "Refund failed", details: rzpData.error?.description || "Unknown error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payment status
    const { error: updateErr } = await supabaseAdmin
      .from("payments")
      .update({
        status: "refunded",
        provider_data: {
          ...(payment.provider_data as Record<string, unknown> || {}),
          refund: rzpData,
          refund_reason: reason || "Merchant initiated refund",
          refunded_at: new Date().toISOString(),
        },
      })
      .eq("id", payment_id);

    if (updateErr) {
      console.error("Failed to update payment status:", updateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund_id: rzpData.id,
        status: "refunded",
        amount: Number(payment.amount),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-refund error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
