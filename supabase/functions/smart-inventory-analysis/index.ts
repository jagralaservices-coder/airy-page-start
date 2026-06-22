import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { requireFeature } from "../_shared/checkFeature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Gate: smart inventory requires the smart_inventory_ai feature (Platinum)
  const denied = await requireFeature(req, 'smart_inventory_ai');
  if (denied) return denied;

  try {
    const body = await req.json();
    const { store_id, scheduled } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Scheduled mode: find all stores that need analysis today
    if (scheduled) {
      const currentDow = new Date().getDay().toString();
      const { data: settings, error: settErr } = await supabaseAdmin
        .from("store_settings")
        .select("store_id")
        .eq("setting_key", "smart_inventory_auto")
        .filter("setting_value->>enabled", "eq", "true")
        .filter("setting_value->>day", "eq", currentDow);

      if (settErr) throw settErr;

      const results: any[] = [];
      for (const s of settings || []) {
        try {
          // Call ourselves for each store
          const resp = await fetch(`${supabaseUrl}/functions/v1/smart-inventory-analysis`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({ store_id: s.store_id }),
          });
          const data = await resp.json();
          results.push({ store_id: s.store_id, success: data.success, count: data.summary?.total || 0 });
        } catch (e: any) {
          results.push({ store_id: s.store_id, success: false, error: e.message });
        }
      }

      return new Response(JSON.stringify({ scheduled: true, processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!store_id) {
      return new Response(JSON.stringify({ error: "store_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = supabaseAdmin;

    // 1. Get all inventory items for the store
    const { data: inventoryItems, error: invError } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("store_id", store_id);

    if (invError) throw invError;

    // 2. Get last 7 days of completed orders
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const periodStart = sevenDaysAgo.toISOString().split("T")[0];
    const periodEnd = new Date().toISOString().split("T")[0];

    const { data: orders, error: ordError } = await supabase
      .from("orders")
      .select("items, created_at, total")
      .eq("store_id", store_id)
      .eq("status", "completed")
      .gte("created_at", sevenDaysAgo.toISOString());

    if (ordError) throw ordError;

    // 3. Get menu items with linked inventory
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, linked_inventory_id, gramage_per_unit")
      .eq("store_id", store_id);

    if (menuError) throw menuError;

    // 4. Get ingredient mappings
    const menuIds = menuItems?.map((m) => m.id) || [];
    const { data: ingredients, error: ingError } = await supabase
      .from("menu_item_ingredients")
      .select("*")
      .in("menu_item_id", menuIds.length > 0 ? menuIds : ["none"]);

    if (ingError) throw ingError;

    // 5. Calculate daily sales per inventory item
    const dailySalesMap: Record<string, number[]> = {};

    for (const order of orders || []) {
      const orderDate = new Date(order.created_at).toISOString().split("T")[0];
      const items = order.items as any[];

      for (const item of items) {
        const menuItem = menuItems?.find(
          (m) => m.name === item.name || m.id === item.menuItemId
        );
        if (!menuItem) continue;

        // Direct linked inventory
        if (menuItem.linked_inventory_id) {
          const invId = menuItem.linked_inventory_id;
          if (!dailySalesMap[invId]) dailySalesMap[invId] = [];
          const qty = (item.quantity || 1) * (menuItem.gramage_per_unit || 1);
          dailySalesMap[invId].push(qty);
        }

        // Ingredient-based deduction
        const itemIngredients = ingredients?.filter(
          (ing) => ing.menu_item_id === menuItem.id
        );
        for (const ing of itemIngredients || []) {
          const invId = ing.inventory_item_id;
          if (!dailySalesMap[invId]) dailySalesMap[invId] = [];
          const qty = (item.quantity || 1) * ing.quantity_required;
          dailySalesMap[invId].push(qty);
        }
      }
    }

    // 6. Generate recommendations using AI analysis
    const recommendations: any[] = [];
    const SAFETY_BUFFER = 1.1; // 10% extra

    for (const inv of inventoryItems || []) {
      const sales = dailySalesMap[inv.id] || [];
      const totalSalesQty = sales.reduce((a: number, b: number) => a + b, 0);
      const avgDailySales = sales.length > 0 ? totalSalesQty / 7 : 0;
      const predictedDemand7d = avgDailySales * 7 * SAFETY_BUFFER;

      // Trend calculation (first half vs second half of week)
      let trend = "stable";
      if (sales.length >= 4) {
        const mid = Math.floor(sales.length / 2);
        const firstHalf = sales.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
        const secondHalf = sales.slice(mid).reduce((a, b) => a + b, 0) / (sales.length - mid);
        if (secondHalf > firstHalf * 1.15) trend = "growing";
        else if (secondHalf < firstHalf * 0.85) trend = "declining";
      }

      // Days until stockout
      const daysUntilStockout = avgDailySales > 0 ? inv.quantity / avgDailySales : 999;

      // Determine reason and category
      let reason = "";
      let category = "normal";

      if (inv.quantity <= 0) {
        reason = "Out of stock";
        category = "critical";
      } else if (inv.quantity <= inv.min_stock) {
        reason = "Below minimum stock level";
        category = "low_stock";
      } else if (daysUntilStockout <= 2) {
        reason = `May run out in ${Math.round(daysUntilStockout)} day(s)`;
        category = "critical";
      } else if (daysUntilStockout <= 5) {
        reason = `Stock will last ~${Math.round(daysUntilStockout)} days`;
        category = "warning";
      } else if (trend === "growing" && daysUntilStockout <= 7) {
        reason = "High demand trend detected";
        category = "high_demand";
      } else if (avgDailySales > 0 && inv.quantity < predictedDemand7d) {
        reason = "Insufficient stock for next 7 days";
        category = "low_stock";
      }

      // Calculate suggested purchase quantity
      const suggestedQty = Math.max(0, Math.ceil(predictedDemand7d - inv.quantity));

      // Classify movement speed
      let movementCategory = "normal";
      if (avgDailySales === 0) movementCategory = "dead_stock";
      else if (avgDailySales > (totalSalesQty / 7) * 1.5) movementCategory = "fast_moving";
      else if (avgDailySales < (totalSalesQty / 7) * 0.3) movementCategory = "slow_moving";

      // Only add if action needed
      if (reason && suggestedQty > 0) {
        recommendations.push({
          store_id,
          inventory_item_id: inv.id,
          product_name: inv.name,
          current_stock: inv.quantity,
          min_stock: inv.min_stock,
          avg_daily_sales: Math.round(avgDailySales * 100) / 100,
          predicted_demand_7d: Math.round(predictedDemand7d * 100) / 100,
          suggested_quantity: suggestedQty,
          reason,
          category,
          days_until_stockout: Math.round(daysUntilStockout * 10) / 10,
          trend,
          status: "pending",
          analysis_period_start: periodStart,
          analysis_period_end: periodEnd,
        });
      }
    }

    // 7. Clear old pending recommendations for this store and insert new ones
    await supabase
      .from("purchase_recommendations")
      .delete()
      .eq("store_id", store_id)
      .eq("status", "pending");

    if (recommendations.length > 0) {
      const { error: insertError } = await supabase
        .from("purchase_recommendations")
        .insert(recommendations);
      if (insertError) throw insertError;
    }

    // 8. Generate AI-powered summary using Lovable AI
    let aiSummary = "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (LOVABLE_API_KEY && recommendations.length > 0) {
      try {
        const criticalItems = recommendations.filter((r) => r.category === "critical");
        const lowStockItems = recommendations.filter((r) => r.category === "low_stock");
        const highDemandItems = recommendations.filter((r) => r.category === "high_demand");

        const prompt = `You are an inventory management assistant for a small business POS system. Analyze the following inventory data and provide a brief, actionable summary in 3-4 bullet points.

Critical items (out of stock or running out in 2 days): ${criticalItems.map((i) => `${i.product_name} (stock: ${i.current_stock}, avg daily usage: ${i.avg_daily_sales})`).join(", ") || "None"}

Low stock items: ${lowStockItems.map((i) => `${i.product_name} (stock: ${i.current_stock}, need: ${i.suggested_quantity})`).join(", ") || "None"}

High demand items: ${highDemandItems.map((i) => `${i.product_name} (trend: ${i.trend})`).join(", ") || "None"}

Total recommendations: ${recommendations.length}
Analysis period: Last 7 days

Respond with brief actionable bullet points only, no intro.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a concise inventory management assistant. Keep responses under 200 words." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiSummary = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (aiErr) {
        console.error("AI summary error:", aiErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        recommendations,
        summary: {
          total: recommendations.length,
          critical: recommendations.filter((r) => r.category === "critical").length,
          low_stock: recommendations.filter((r) => r.category === "low_stock").length,
          high_demand: recommendations.filter((r) => r.category === "high_demand").length,
          warning: recommendations.filter((r) => r.category === "warning").length,
          ai_summary: aiSummary,
          period: { start: periodStart, end: periodEnd },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Smart inventory analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
