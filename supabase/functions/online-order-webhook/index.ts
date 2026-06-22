import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-webhook-signature',
};

interface ParsedOrder {
  platform: string;
  platformOrderId: string;
  items: Array<{ name: string; quantity: number; price: number; notes?: string }>;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  subtotal: number;
  tax: number;
  deliveryCharge: number;
  total: number;
  commissionPercentage: number;
  rawPayload: any;
}

// Default commission rates by platform
const COMMISSION_RATES: Record<string, number> = {
  swiggy: 22,
  zomato: 20,
  other: 15,
};

// Verify webhook signature using HMAC-SHA256
async function verifyWebhookSignature(platform: string, signature: string | null, rawBody: string): Promise<boolean> {
  const secretEnvKey = `${platform.toUpperCase()}_WEBHOOK_SECRET`;
  const secret = Deno.env.get(secretEnvKey);
  if (!secret) {
    console.warn(`No webhook secret configured for platform: ${platform} (env: ${secretEnvKey})`);
    return false;
  }
  if (!signature) {
    console.warn(`No signature provided for platform: ${platform}`);
    return false;
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expectedSignature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

function sanitizeString(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLen).replace(/[<>]/g, '');
}

function sanitizeNumber(val: unknown): number {
  const num = Number(val);
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100) / 100;
}

function parseSwiggyOrder(body: any): Omit<ParsedOrder, 'rawPayload'> {
  const items = (Array.isArray(body.items || body.order_items) ? (body.items || body.order_items) : []).slice(0, 100).map((item: any) => ({
    name: sanitizeString(item.name || item.item_name, 200),
    quantity: sanitizeNumber(item.quantity) || 1,
    price: sanitizeNumber(item.price || item.total_price),
    notes: sanitizeString(item.special_instructions || item.notes || '', 500),
  }));
  const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
  const tax = sanitizeNumber(body.tax || body.tax_amount || 0);
  const deliveryCharge = sanitizeNumber(body.delivery_charge || 0);
  const total = sanitizeNumber(body.order_total || body.total) || (subtotal + tax + deliveryCharge);

  return {
    platform: 'swiggy',
    platformOrderId: sanitizeString(body.order_id || body.orderId || `SWG-${Date.now()}`, 50),
    items,
    customerName: sanitizeString(body.customer?.name || body.customer_name || 'Customer', 200),
    customerPhone: sanitizeString(body.customer?.phone || body.customer_phone || '', 20),
    customerAddress: sanitizeString(body.delivery_address || body.customer?.address || '', 500),
    subtotal,
    tax,
    deliveryCharge,
    total,
    commissionPercentage: sanitizeNumber(body.commission_percentage) || COMMISSION_RATES.swiggy,
  };
}

function parseZomatoOrder(body: any): Omit<ParsedOrder, 'rawPayload'> {
  const items = (Array.isArray(body.order?.items || body.items) ? (body.order?.items || body.items) : []).slice(0, 100).map((item: any) => ({
    name: sanitizeString(item.name || item.dish_name, 200),
    quantity: sanitizeNumber(item.quantity) || 1,
    price: sanitizeNumber(item.price || item.cost),
    notes: sanitizeString(item.instructions || '', 500),
  }));
  const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
  const tax = sanitizeNumber(body.order?.tax || body.tax || 0);
  const deliveryCharge = sanitizeNumber(body.delivery?.charge || body.delivery_charge || 0);
  const total = sanitizeNumber(body.order?.total || body.total_cost) || (subtotal + tax + deliveryCharge);

  return {
    platform: 'zomato',
    platformOrderId: sanitizeString(body.order?.id || body.orderId || `ZMT-${Date.now()}`, 50),
    items,
    customerName: sanitizeString(body.customer?.name || 'Customer', 200),
    customerPhone: sanitizeString(body.customer?.phone || body.customer?.mobile || '', 20),
    customerAddress: sanitizeString(body.delivery?.address || body.address || '', 500),
    subtotal,
    tax,
    deliveryCharge,
    total,
    commissionPercentage: sanitizeNumber(body.commission_percentage) || COMMISSION_RATES.zomato,
  };
}

function parseGenericOrder(body: any, platform: string): Omit<ParsedOrder, 'rawPayload'> {
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 100).map((item: any) => ({
    name: sanitizeString(item.name, 200),
    quantity: sanitizeNumber(item.quantity) || 1,
    price: sanitizeNumber(item.price),
    notes: sanitizeString(item.notes || '', 500),
  }));
  const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
  const tax = sanitizeNumber(body.tax || 0);
  const deliveryCharge = sanitizeNumber(body.delivery_charge || 0);
  const total = sanitizeNumber(body.total || body.orderTotal) || (subtotal + tax + deliveryCharge);

  return {
    platform: platform || 'other',
    platformOrderId: sanitizeString(body.orderId || body.order_id || body.id || `ORD-${Date.now()}`, 50),
    items,
    customerName: sanitizeString(body.customer?.name || body.customerName || 'Customer', 200),
    customerPhone: sanitizeString(body.customer?.phone || body.customerPhone || '', 20),
    customerAddress: sanitizeString(body.customer?.address || body.address || '', 500),
    subtotal,
    tax,
    deliveryCharge,
    total,
    commissionPercentage: sanitizeNumber(body.commission_percentage) || COMMISSION_RATES.other,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const platform = sanitizeString(url.searchParams.get('platform') || 'other', 20).toLowerCase();
    const storeId = sanitizeString(url.searchParams.get('store_id') || '', 50);

    const rawBody = await req.text();

    // Verify webhook signature
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-webhook-secret');
    const isValid = await verifyWebhookSignature(platform, signature, rawBody);
    if (!isValid) {
      console.error(`Webhook signature verification failed for platform: ${platform}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${platform.toUpperCase()}] Verified webhook request`);

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse order based on platform
    let parsed: Omit<ParsedOrder, 'rawPayload'>;
    switch (platform) {
      case 'swiggy': parsed = parseSwiggyOrder(body); break;
      case 'zomato': parsed = parseZomatoOrder(body); break;
      default: parsed = parseGenericOrder(body, platform);
    }

    // Calculate commission
    const commissionAmount = Math.round(parsed.subtotal * parsed.commissionPercentage) / 100;
    const netReceivable = Math.round((parsed.total - commissionAmount) * 100) / 100;

    // Determine store_id from query param or body
    const resolvedStoreId = storeId || sanitizeString(body.store_id || body.storeId || '', 50);
    if (!resolvedStoreId) {
      return new Response(
        JSON.stringify({ success: false, error: 'store_id is required (pass as query param or in body)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into database using service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify store exists and is active
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', resolvedStoreId)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or inactive store_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: insertedOrder, error: insertError } = await supabase
      .from('online_orders')
      .insert({
        store_id: resolvedStoreId,
        platform: parsed.platform,
        platform_order_id: parsed.platformOrderId,
        items: parsed.items,
        subtotal: parsed.subtotal,
        tax: parsed.tax,
        delivery_charge: parsed.deliveryCharge,
        total: parsed.total,
        commission_percentage: parsed.commissionPercentage,
        commission_amount: commissionAmount,
        net_receivable: netReceivable,
        status: 'pending',
        raw_payload: body,
      })
      .select('id, platform_order_id')
      .single();

    if (insertError) {
      console.error('DB insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Order saved: ${insertedOrder.id} (${parsed.platform} #${parsed.platformOrderId})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order received and saved',
        orderId: insertedOrder.id,
        platformOrderId: parsed.platformOrderId,
        platform: parsed.platform,
        commission: { percentage: parsed.commissionPercentage, amount: commissionAmount, netReceivable },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
