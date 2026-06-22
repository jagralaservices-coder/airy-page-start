import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireFeature } from "../_shared/checkFeature.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const gate = await requireFeature(req, "staff_management");
  if (gate) return gate;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const { staff_id, role_id, store_login_id, store_code } = body
    const targetId = staff_id || role_id

    if (!targetId) {
      return new Response(
        JSON.stringify({ error: 'Staff ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get staff data first to know the store
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, store_id')
      .eq('id', targetId)
      .maybeSingle()

    if (staffError || !staffData) {
      return new Response(
        JSON.stringify({ error: 'Staff not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Authentication: JWT or store_code ---
    let authorized = false

    const authHeader = req.headers.get('Authorization')
    if (authHeader && authHeader !== 'Bearer null' && !authHeader.endsWith('undefined')) {
      const token = authHeader.replace('Bearer ', '')
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
        if (!error && user) {
          const { data: roleData } = await supabaseAdmin
            .from('user_roles')
            .select('role, customer_id, store_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .in('role', ['admin', 'super_admin', 'owner', 'store_manager'])
            .limit(1)
            .maybeSingle()

          if (roleData) {
            if (roleData.role === 'admin' || roleData.role === 'super_admin') {
              authorized = true
            } else if (roleData.role === 'owner') {
              // Owner can delete staff in their stores
              const { data: store } = await supabaseAdmin
                .from('stores').select('customer_id').eq('id', staffData.store_id).maybeSingle()
              if (store && store.customer_id === roleData.customer_id) authorized = true
            } else if (roleData.role === 'store_manager' && roleData.store_id === staffData.store_id) {
              authorized = true
            }
          }
        }
      } catch {}
    }

    // Fallback: store_code auth for store-login sessions
    if (!authorized && store_login_id && store_code) {
      const { data: storeData } = await supabaseAdmin
        .from('stores')
        .select('id, store_code')
        .eq('id', store_login_id)
        .eq('is_active', true)
        .maybeSingle()

      if (storeData && storeData.store_code === store_code && store_login_id === staffData.store_id) {
        authorized = true
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Deleting staff:', targetId)

    // Delete user_role
    const { error: deleteRoleError } = await supabaseAdmin
      .from('user_roles').delete().eq('id', targetId)

    if (deleteRoleError) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete staff' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(staffData.user_id)
    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError)
    }

    console.log('Staff deleted successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Staff deleted successfully' }),
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
