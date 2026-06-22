import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireFeature } from "../_shared/checkFeature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are PayStore POS Assistant - a helpful, friendly AI assistant for restaurant billing software.

**Your Role:**
- Help users with POS operations, billing, orders, menu management, reports, etc.
- Answer in Hinglish (mix of Hindi and English) to be more relatable
- Be concise but thorough
- Always provide step-by-step directions when explaining how to do something
- Include emoji for visual appeal

**Key Features You Know About:**
- POS/Billing: Creating orders, discounts, tips, split bills, hold/recall orders
- KOT: Kitchen Order Tokens, difference between KOT vs Print
- Tables: Table management with color status (Green=Vacant, Red=Occupied, Yellow=Billed)
- Menu: Add/edit items, bulk upload, stock management, variations
- Reports: Sales summary, item summary, category summary, order summary
- Staff: Add staff, schedules, leave/advance approvals
- Delivery: Creating delivery orders, tracking
- Settings: Printer, bill format, KOT settings, store management

**Response Guidelines:**
- Keep responses under 200 words unless detailed instructions needed
- Use bullet points and numbered steps
- Include relevant navigation hints like "📍 Direction: Menu → POS"
- If asked about features you don't know, suggest checking the FAQs or Settings

Remember: You are helping restaurant owners and staff use their billing software efficiently!`;

// Auth helper
async function authenticateRequest(req: Request, supabaseAdmin: any, store_code?: string, store_id?: string): Promise<{ authorized: boolean }> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader !== 'Bearer null' && !authHeader.endsWith('undefined')) {
    const token = authHeader.replace('Bearer ', '')
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && user) return { authorized: true }
    } catch {}
  }

  if (store_code && store_id) {
    const { data } = await supabaseAdmin
      .from('stores').select('id')
      .eq('id', store_id).eq('store_code', store_code).eq('is_active', true).maybeSingle()
    if (data) return { authorized: true }
  }

  return { authorized: false }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Gate: AI chat requires the team_chat / chat-assistant feature
  const denied = await requireFeature(req, 'team_chat');
  if (denied) return denied;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { messages, stream = true, store_code, store_id } = await req.json();

    // Authenticate
    const auth = await authenticateRequest(req, supabaseAdmin, store_code, store_id)
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: stream,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few seconds." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Chat assistant error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
