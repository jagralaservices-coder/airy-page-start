import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || authHeader === 'Bearer null') {
      return new Response(JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authUserError } = await supabaseAdmin.auth.getUser(token)
    if (authUserError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Allow owner, admin, super_admin to create stores
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role, merchant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const allowed = (roles || []).find((r: any) =>
      ['owner', 'admin', 'super_admin'].includes(r.role)
    )
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden: insufficient role to create stores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const {
      store_id,
      merchant_id: bodyMerchantId,
      store_name,
      email,
      password,
      phone,
      address,
      business_type,
      country,
      currency_code,
      tax_type,
      tax_percentage,
    } = body

    // Resolve merchant_id: prefer caller's own merchant, fallback to body (super_admin/admin)
    let merchant_id: string | null = allowed.merchant_id || bodyMerchantId || null
    if (!merchant_id) {
      return new Response(JSON.stringify({ error: 'No merchant account linked to this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!store_name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Store name, email, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (store_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(store_id))) {
      return new Response(JSON.stringify({ error: 'Invalid store id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // Verify merchant exists & check store limit
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id, max_stores')
      .eq('id', merchant_id)
      .maybeSingle()
    if (!merchant) {
      return new Response(JSON.stringify({ error: 'Invalid merchant account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { count } = await supabaseAdmin
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchant_id)
      .eq('is_active', true)

    // PLAN ENFORCEMENT: outlet limit from merchant_subscription
    if (allowed.role !== 'admin' && allowed.role !== 'super_admin') {
      const { data: sub } = await supabaseAdmin
        .from('merchant_subscription')
        .select('plan_name, outlet_limit, extra_outlets, expiry_date, status')
        .eq('merchant_id', merchant_id)
        .maybeSingle()

      const planActive = sub && sub.status === 'active' && new Date(sub.expiry_date) >= new Date()
      const allowedOutlets = planActive ? ((sub.outlet_limit || 1) + (sub.extra_outlets || 0)) : 1

      if ((count || 0) >= allowedOutlets) {
        const required = (sub?.plan_name === 'gold') ? 'platinum' : 'platinum'
        return new Response(JSON.stringify({
          error: `Outlet limit reached (${allowedOutlets}). Upgrade to Platinum for multi-outlet support.`,
          required_plan: required,
        }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    } else {
      const maxStores = merchant.max_stores ?? 999
      if ((count || 0) >= maxStores) {
        return new Response(JSON.stringify({ error: `Store limit reached (max ${maxStores})` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Find or create auth user for the store login
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )

    let userId: string
    if (existingUser) {
      userId = existingUser.id
      // Update password so the new credentials work
      await supabaseAdmin.auth.admin.updateUserById(userId, { password })
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: store_name.trim() }
      })
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      userId = authData.user.id
    }

    // Insert the store
    const { data: dbStore, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({
        ...(store_id ? { id: store_id } : {}),
        merchant_id,
        name: String(store_name).trim(),
        email: normalizedEmail,
        phone: phone || null,
        address: address || null,
        business_type: business_type || 'restaurant',
        country: country || 'India',
        currency_code: currency_code || 'INR',
        tax_type: tax_type || 'GST',
        tax_percentage: tax_percentage ?? 0,
        is_active: true,
      })
      .select('id, name')
      .single()

    if (storeError) {
      if (!existingUser) await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(JSON.stringify({ error: 'Failed to create store: ' + storeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Attach store_manager role for the user
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'store_manager',
        merchant_id,
        store_id: dbStore.id,
        is_active: true,
      })
    if (roleErr) {
      // Best-effort cleanup
      await supabaseAdmin.from('stores').delete().eq('id', dbStore.id)
      if (!existingUser) await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(JSON.stringify({ error: roleErr.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(
      JSON.stringify({
        success: true,
        store: {
          id: dbStore.id,
          store_code: dbStore.id.slice(0, 8).toUpperCase(),
          store_name: dbStore.name,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('create-store error:', err)
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
