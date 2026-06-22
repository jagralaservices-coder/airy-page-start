import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Create regular client to verify admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the caller is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin'])
      .eq('is_active', true)
      .maybeSingle()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create owner accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { 
      business_name, 
      owner_name, 
      owner_email, 
      owner_password, 
      phone, 
      subscription_plan, 
      subscription_days, 
      max_stores,
      business_type,
      subscription_tier,
      address_line1,
      locality,
      city,
      state,
      pincode,
      gov_id_url,
      mobile_verified
    } = await req.json()

    // Validate required fields
    if (!business_name || !owner_name || !owner_email || !owner_password || !phone) {
      return new Response(
        JSON.stringify({ error: 'Business Name, Owner Name, Email, Password, and Mobile Number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate complete address fields
    if (!address_line1 || !locality || !city || !state || !pincode) {
      return new Response(
        JSON.stringify({ error: 'Complete address (Address Line 1, Locality, City, State, and Pincode) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = owner_email.trim().toLowerCase()
    const constructedAddress = `${address_line1.trim()}, ${locality.trim()}, ${city.trim()}, ${state.trim()} - ${pincode.trim()}`

    // Step 1: Create auth user using admin API (email_confirm: false sends the verification email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: owner_password,
      email_confirm: false,
      user_metadata: { full_name: owner_name }
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Create customer record
    const subscriptionEnd = new Date()
    subscriptionEnd.setDate(subscriptionEnd.getDate() + (subscription_days || 30))

    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({
        name: business_name, // legacy non-null column
        email: normalizedEmail,
        business_name,
        owner_name,
        owner_email: normalizedEmail,
        owner_user_id: authData.user.id,
        phone: phone || null,
        address: constructedAddress,
        address_line1: address_line1.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        gov_id_url: gov_id_url || null,
        mobile_verified: mobile_verified || false,
        email_verified: false,
        subscription_plan: subscription_plan || 'monthly',
        subscription_end: subscriptionEnd.toISOString().split('T')[0],
        max_stores: max_stores || 2,
        business_type: business_type || 'restaurant',
        subscription_tier: subscription_tier || 'basic',
        is_active: false, // pending super-admin approval
        approval_status: 'pending',
      })
      .select()
      .single()

    if (customerError) {
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: customerError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Create owner role
    const { error: roleInsertError } = await supabaseAdmin.from('user_roles').insert({
      user_id: authData.user.id,
      role: 'owner',
      customer_id: customerData.id,
      is_active: false // Inactive until verified
    })

    if (roleInsertError) {
      // Rollback: delete customer and user
      await supabaseAdmin.from('customers').delete().eq('id', customerData.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: roleInsertError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sync profiles table with address details
    await supabaseAdmin.from('profiles').update({
      phone: phone || null,
      address_line1: address_line1.trim(),
      locality: locality.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      mobile_verified: mobile_verified || false,
      email_verified: false,
    }).eq('id', authData.user.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        customer: customerData,
        message: `Owner account created for ${owner_name}. Verification email sent.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})