import { getOTPProvider } from "../shared/providers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashOTP(otp: string, phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = Deno.env.get("OTP_SECRET_SALT") || "PRODUCTION_SALT_REQUIRED_HERE";
  const data = encoder.encode(otp + phone + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateOTP(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 1000000).toString().padStart(6, '0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone number is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedPhone = phone.replace('+91', '');
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return new Response(JSON.stringify({ error: "Invalid Indian mobile number." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const fullPhone = `+91${normalizedPhone}`;

    // 1. Strict Uniqueness Check (Can belong to ONLY ONE merchant or store)
    const { data: customer } = await supabase.from('customers').select('id').eq('phone', fullPhone).maybeSingle();
    if (customer) {
      return new Response(JSON.stringify({ error: "This mobile number is already registered." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: store } = await supabase.from('stores').select('id').eq('phone', fullPhone).maybeSingle();
    if (store) {
      return new Response(JSON.stringify({ error: "This mobile number is already registered." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Rate Limiting Check (Max 5 requests per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('phone_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', fullPhone)
      .gte('created_at', oneHourAgo);
      
    if (count !== null && count >= 5) {
      return new Response(JSON.stringify({ error: "Too many OTP requests. Please try again after an hour." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Generate & Hash OTP
    const plainOTP = generateOTP();
    const otpHash = await hashOTP(plainOTP, fullPhone);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // 4. Save Hash
    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: fullPhone,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        verified: false
      });

    if (insertError) throw insertError;

    // 5. Send Real OTP via Provider (No Mocks Allowed)
    const provider = getOTPProvider();
    const sent = await provider.sendOTP(fullPhone, plainOTP);
    
    if (!sent) {
      return new Response(JSON.stringify({ error: "Failed to deliver SMS. Check provider configuration." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ message: "OTP sent successfully" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Internal Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
