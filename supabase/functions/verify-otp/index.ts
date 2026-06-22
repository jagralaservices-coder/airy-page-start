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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: "Phone number and OTP are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedPhone = phone.replace('+91', '');
    const fullPhone = `+91${normalizedPhone}`;

    // Fetch the latest OTP record
    const { data: records, error } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', fullPhone)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !records || records.length === 0) {
      return new Response(JSON.stringify({ error: "No pending verification found. Please request a new OTP." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const record = records[0];

    if (record.verified) {
      return new Response(JSON.stringify({ error: "This OTP has already been used." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // STRICT REQUIREMENT: Maximum 3 verification attempts
    if (record.attempts >= 3) {
      return new Response(JSON.stringify({ error: "Maximum verification attempts exceeded. Request a new OTP." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (new Date(record.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP has expired." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const inputHash = await hashOTP(otp, fullPhone);
    
    if (inputHash === record.otp_hash) {
      // Success
      await supabase
        .from('phone_verifications')
        .update({ verified: true, attempts: record.attempts + 1 })
        .eq('id', record.id);
        
      return new Response(JSON.stringify({ message: "Phone number verified successfully", verifiedToken: record.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      // Failure
      await supabase
        .from('phone_verifications')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id);
        
      return new Response(JSON.stringify({ error: "Invalid OTP." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error: any) {
    console.error("Internal Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
