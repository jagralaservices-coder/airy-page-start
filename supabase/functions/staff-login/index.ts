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

    const body = await req.json()
    const { email, password, staff_code, store_id } = body

    // Support email+password login (new flow)
    if (email && password) {
      const normalizedEmail = email.trim().toLowerCase()

      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                       req.headers.get('cf-connecting-ip') || 'unknown'

      // Rate limit check
      const { data: rateLimitOk } = await supabaseAdmin.rpc('check_rate_limit', { 
        p_identifier: normalizedEmail, p_type: 'staff', p_max_attempts: 5, p_window_minutes: 15
      })

      if (rateLimitOk === false) {
        return new Response(
          JSON.stringify({ error: 'Too many login attempts. Please try again in 15 minutes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Look up user by email
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      const foundUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail)

      if (!foundUser) {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_identifier: normalizedEmail, p_type: 'staff', p_success: false, p_ip: clientIp
        })
        return new Response(
          JSON.stringify({ error: 'Invalid email or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify the user has an active staff/store_manager role
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role, store_id, customer_id, staff_code, ref_code')
        .eq('user_id', foundUser.id)
        .eq('is_active', true)
        .in('role', ['staff', 'store_manager'])
        .maybeSingle()

      if (roleError || !roleData) {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_identifier: normalizedEmail, p_type: 'staff', p_success: false, p_ip: clientIp
        })
        return new Response(
          JSON.stringify({ error: 'No active staff account found for this email' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If store_id provided, verify match
      if (store_id && roleData.store_id !== store_id) {
        return new Response(
          JSON.stringify({ error: 'This account is not linked to this store' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: storeData } = roleData.store_id
        ? await supabaseAdmin
            .from('stores')
            .select('id, store_name, address, phone, store_code, customer_id')
            .eq('id', roleData.store_id)
            .maybeSingle()
        : { data: null }

      await supabaseAdmin.rpc('log_login_attempt', {
        p_identifier: normalizedEmail, p_type: 'staff', p_success: true, p_ip: clientIp
      })

      const staffName = foundUser.user_metadata?.full_name || 'Staff'

      return new Response(
        JSON.stringify({
          success: true,
          user_id: foundUser.id,
          email: normalizedEmail,
          name: staffName,
          role: roleData.role,
          store_id: roleData.store_id,
          customer_id: roleData.customer_id,
          staff_code: roleData.staff_code,
          ref_code: roleData.ref_code,
          store_name: storeData?.store_name || null,
          store_address: storeData?.address || null,
          store_phone: storeData?.phone || null,
          store_code: storeData?.store_code || null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Legacy: staff_code + PIN (kept for backward compatibility but deprecated)
    if (staff_code && password) {
      const sanitizedCode = staff_code.trim().toUpperCase()
      const sanitizedPin = password.trim()

      const isValidCode = /^[0-9]{8}$/.test(sanitizedCode) || /^(STF|MGR)[0-9]{5}$/i.test(sanitizedCode)
      if (!isValidCode) {
        return new Response(
          JSON.stringify({ error: 'Invalid Staff ID format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

      const { data: rateLimitOk } = await supabaseAdmin.rpc('check_rate_limit', { 
        p_identifier: sanitizedCode, p_type: 'staff', p_max_attempts: 5, p_window_minutes: 15
      })

      if (rateLimitOk === false) {
        return new Response(
          JSON.stringify({ error: 'Too many attempts. Try again in 15 minutes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let resolvedStaffCode = sanitizedCode
      if (!/^[0-9]{8}$/.test(sanitizedCode)) {
        const { data: roleLookup } = await supabaseAdmin
          .from('user_roles')
          .select('staff_code, ref_code')
          .eq('ref_code', sanitizedCode)
          .eq('is_active', true)
          .maybeSingle()

        if (!roleLookup?.staff_code) {
          await supabaseAdmin.rpc('log_login_attempt', {
            p_identifier: sanitizedCode, p_type: 'staff', p_success: false, p_ip: clientIp
          })
          return new Response(
            JSON.stringify({ error: 'Invalid Staff ID or PIN' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        resolvedStaffCode = roleLookup.staff_code
      }

      const { data: staffData, error: staffError } = await supabaseAdmin
        .rpc('verify_staff_pin', { p_staff_code: resolvedStaffCode, p_pin: sanitizedPin })

      if (staffError || !staffData || staffData.length === 0) {
        await supabaseAdmin.rpc('log_login_attempt', {
          p_identifier: sanitizedCode, p_type: 'staff', p_success: false, p_ip: clientIp
        })
        return new Response(
          JSON.stringify({ error: 'Invalid Staff ID or PIN' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const staff = staffData[0]
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(staff.user_id)
      const staffEmail = userData?.user?.email || ''
      const staffName = userData?.user?.user_metadata?.full_name || 'Staff'

      const { data: storeData } = staff.store_id
        ? await supabaseAdmin
            .from('stores')
            .select('id, store_name, address, phone, store_code, customer_id')
            .eq('id', staff.store_id)
            .maybeSingle()
        : { data: null }

      await supabaseAdmin.rpc('log_login_attempt', {
        p_identifier: sanitizedCode, p_type: 'staff', p_success: true, p_ip: clientIp
      })

      return new Response(
        JSON.stringify({
          success: true,
          user_id: staff.user_id,
          email: staffEmail,
          name: staffName,
          role: staff.role,
          store_id: staff.store_id,
          customer_id: staff.customer_id,
          staff_code: resolvedStaffCode,
          store_name: storeData?.store_name || null,
          store_address: storeData?.address || null,
          store_phone: storeData?.phone || null,
          store_code: storeData?.store_code || null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Email and password are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
