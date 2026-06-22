import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { requireStoreFeature } from "../_shared/checkFeature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { store_code, customer_name, customer_phone, items, notes, table_number } = body;

    // Feature gate: merchant must have qr_orders enabled
    const gate = await requireStoreFeature(req, store_code, "qr_orders");
    if (gate) return gate;

    if (!store_code || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "store_code and items are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate items structure
    for (const item of items) {
      if (!item.name || typeof item.price !== "number" || typeof item.quantity !== "number" || item.quantity < 1) {
        return new Response(
          JSON.stringify({ error: "Each item must have name, price, and quantity >= 1" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get store
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, tax_percentage, tax_type")
      .eq("store_code", store_code)
      .eq("is_active", true)
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: "Store not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const taxRate = store.tax_percentage || 0;
    const tax = store.tax_type === 'inclusive' ? 0 : Math.round(subtotal * taxRate / 100 * 100) / 100;
    const total = subtotal + tax;

    // Generate 4-digit order number
    const orderNumber = String(Math.floor(1000 + Math.random() * 9000));

    const { data: order, error: orderError } = await supabase
      .from("qr_orders")
      .insert({
        store_id: store.id,
        order_number: orderNumber,
        customer_name: customer_name?.trim() || null,
        customer_phone: customer_phone?.trim() || null,
        table_number: table_number?.trim() || null,
        items: items,
        subtotal,
        tax,
        total,
        notes: notes?.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      return new Response(
        JSON.stringify({ error: "Failed to place order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          total: order.total,
          status: order.status,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
