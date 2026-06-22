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
    const url = new URL(req.url);
    const storeCode = url.searchParams.get("store_code");

    if (!storeCode) {
      return new Response(
        JSON.stringify({ error: "store_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Feature gate: merchant must have qr_menu (or qr_orders) enabled
    const gate = await requireStoreFeature(req, storeCode, "qr_menu");
    if (gate) return gate;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get store info
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, store_name, address, phone, business_type, currency_code, tax_percentage, tax_type")
      .eq("store_code", storeCode)
      .eq("is_active", true)
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: "Store not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get categories
    const { data: categories } = await supabase
      .from("store_categories")
      .select("category_id, name, icon, color, sort_order")
      .eq("store_id", store.id)
      .order("sort_order");

    // Get menu items with variations
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, name_hindi, category, price, image_url, description, is_available, preparation_time")
      .eq("store_id", store.id)
      .eq("is_available", true);

    // Get variations for available items
    const itemIds = (menuItems || []).map((i) => i.id);
    let variations: any[] = [];
    if (itemIds.length > 0) {
      const { data: vars } = await supabase
        .from("menu_item_variations")
        .select("id, menu_item_id, name, price, is_available, unit")
        .in("menu_item_id", itemIds)
        .eq("is_available", true);
      variations = vars || [];
    }

    // Attach variations to items
    const itemsWithVariations = (menuItems || []).map((item) => ({
      ...item,
      variations: variations.filter((v) => v.menu_item_id === item.id),
    }));

    return new Response(
      JSON.stringify({
        store: {
          id: store.id,
          name: store.store_name,
          address: store.address,
          phone: store.phone,
          business_type: store.business_type,
          currency_code: store.currency_code,
          tax_percentage: store.tax_percentage,
          tax_type: store.tax_type,
        },
        categories: categories || [],
        menu_items: itemsWithVariations,
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
