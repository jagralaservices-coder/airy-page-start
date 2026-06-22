import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireStoreFeature, requireFeature } from "../_shared/checkFeature.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Auth helper: verify JWT or store_code
async function authenticateRequest(req: Request, supabaseAdmin: any, store_code?: string, store_id?: string): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader !== 'Bearer null' && !authHeader.endsWith('undefined')) {
    const token = authHeader.replace('Bearer ', '')
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && user) return { authorized: true }
    } catch {}
  }

  if (store_code && store_id) {
    const { data: storeData } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .eq('store_code', store_code)
      .eq('is_active', true)
      .maybeSingle()
    if (storeData) return { authorized: true }
    return { authorized: false, error: 'Invalid store credentials' }
  }

  return { authorized: false, error: 'Authentication required' }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json();
    const { capturedFaceBase64, storedFaceUrl, store_code, store_id } = body;

    // Authenticate
    const auth = await authenticateRequest(req, supabaseAdmin, store_code, store_id)
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: auth.error || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Feature gate: face_attendance must be enabled on merchant plan
    const featureGate = store_code
      ? await requireStoreFeature(req, store_code, "face_attendance")
      : await requireFeature(req, "face_attendance");
    if (featureGate) return featureGate;


    if (!capturedFaceBase64 || !storedFaceUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing face data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let capturedImageUrl = capturedFaceBase64;
    if (!capturedFaceBase64.startsWith('data:') && !capturedFaceBase64.startsWith('http')) {
      capturedImageUrl = `data:image/jpeg;base64,${capturedFaceBase64}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a face verification assistant. Compare two face images and determine if they belong to the same person.
RULES:
1. Focus on facial features: face shape, eyes, nose, mouth, structure
2. Ignore lighting, angle, expression, image quality differences
3. Be reasonably lenient for camera quality variations
4. Return ONLY JSON: {"match": true/false, "confidence": 0-100, "reason": "brief explanation"}
5. Confidence 70+ with match=true means likely same person`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Compare these two face images. First is stored reference, second is newly captured. Are they the same person?' },
              { type: 'image_url', image_url: { url: storedFaceUrl } },
              { type: 'image_url', image_url: { url: capturedImageUrl } }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Face verification service error` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    let verificationResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verificationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      verificationResult = { match: false, confidence: 0, reason: 'Could not verify face' };
    }

    return new Response(
      JSON.stringify({
        success: true,
        match: verificationResult.match === true,
        confidence: verificationResult.confidence || 0,
        reason: verificationResult.reason || 'Verification complete'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Face verification error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: 'Face verification failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
