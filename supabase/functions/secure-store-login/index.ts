import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const isValidStoreIdentifier = (code: string): boolean => /^[0-9A-F]{8}$/i.test(code) || /^STR[0-9]{5}$/i.test(code)
const isValidPassword = (password: string): boolean => password.length >= 4 && password.length <= 50
const sanitizeInput = (input: string): string => input.trim().replace(/[<>'"&]/g, '')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const { store_code, password } = body

    if (!store_code || !password) {
      return new Response(
        JSON.stringify({ error: 'Store ID and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sanitizedStoreIdentifier = sanitizeInput(store_code).toUpperCase()
    const sanitizedPassword = sanitizeInput(password)

    if (!isValidStoreIdentifier(sanitizedStoreIdentifier)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Store ID format. Use the 8-character Store ID.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidPassword(sanitizedPassword)) {
      return new Response(
        JSON.stringify({ error: 'Invalid password format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: activeStores, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id, merchant_id, name, email, address, phone, business_type')
      .eq('is_active', true)
      .limit(1000)

    const storeData = (activeStores || []).find((store: any) =>
      String(store.id).slice(0, 8).toUpperCase() === sanitizedStoreIdentifier
    )

    if (storeError || !storeData?.email) {
      return new Response(JSON.stringify({ error: 'Invalid store ID or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (storeData.merchant_id) {
      const { data: linkedMerchant } = await supabaseAdmin
        .from('merchants')
        .select('is_active, approval_status')
        .eq('id', storeData.merchant_id)
        .maybeSingle()

      if (linkedMerchant && (linkedMerchant.is_active === false || String(linkedMerchant.approval_status || '').toLowerCase() === 'suspended')) {
        return new Response(JSON.stringify({ error: 'This account has been suspended. Please contact the administrator.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email: String(storeData.email).trim().toLowerCase(),
      password: sanitizedPassword,
    })

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Invalid store ID or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', authData.user.id)
      .eq('store_id', storeData.id)
      .eq('role', 'store_manager')
      .eq('is_active', true)
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'This login is not linked to this store' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch subscription data from the linked merchant
    let subscriptionData = {
      subscription_tier: 'basic',
      business_type: 'restaurant',
      enabled_addons: [] as string[],
      staff_limit: 2,
      outlet_limit: 1,
    }

    if (storeData.merchant_id) {
      const { data: merchantData } = await supabaseAdmin
        .from('merchants')
        .select('subscription_tier, subscription_plan, business_type, max_stores')
        .eq('id', storeData.merchant_id)
        .maybeSingle()

      if (merchantData) {
        // Owner's plan flows to the store: prefer subscription_tier, fall back to subscription_plan
        const ownerPlan = (merchantData as any).subscription_tier
          || (merchantData as any).subscription_plan
          || 'basic'
        subscriptionData = {
          subscription_tier: ownerPlan,
          business_type: merchantData.business_type || storeData.business_type || 'restaurant',
          enabled_addons: [],
          staff_limit: 2,
          outlet_limit: merchantData.max_stores || 1,
        }
      }
    }

    console.log('Store login successful for:', storeData.name)

    return new Response(
      JSON.stringify({ 
        success: true, 
        store_id: storeData.id,
        store_name: storeData.name,
        store_address: storeData.address,
        store_phone: storeData.phone,
        customer_id: storeData.merchant_id,
        merchant_id: storeData.merchant_id,
        store_code: String(storeData.id).slice(0, 8).toUpperCase(),
        ref_code: null,
        // Include subscription data
        subscription_tier: subscriptionData.subscription_tier,
        business_type: subscriptionData.business_type,
        enabled_addons: subscriptionData.enabled_addons,
        staff_limit: subscriptionData.staff_limit,
        outlet_limit: subscriptionData.outlet_limit,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
