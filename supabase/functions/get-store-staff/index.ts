import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Auth helper: verify JWT or store_code
async function authenticateRequest(req: Request, supabaseAdmin: any, store_id: string, store_code?: string): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader !== 'Bearer null' && !authHeader.endsWith('undefined')) {
    const token = authHeader.replace('Bearer ', '')
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && user) {
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role, store_id, customer_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('role', ['admin', 'owner', 'store_manager', 'staff'])
          .limit(1)
          .maybeSingle()
        
        if (roleData) {
          if (roleData.role === 'admin') return { authorized: true }
          if (roleData.role === 'owner') {
            const { data: store } = await supabaseAdmin
              .from('stores').select('customer_id').eq('id', store_id).maybeSingle()
            if (store && store.customer_id === roleData.customer_id) return { authorized: true }
          }
          if ((roleData.role === 'store_manager' || roleData.role === 'staff') && roleData.store_id === store_id) {
            return { authorized: true }
          }
        }
        return { authorized: false, error: 'Access denied to this store' }
      }
    } catch {}
  }

  if (store_code) {
    const { data: storeData } = await supabaseAdmin
      .from('stores')
      .select('id, store_code')
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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const { store_id, store_code } = body

    if (!store_id) {
      return new Response(
        JSON.stringify({ error: 'Store ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authenticate the request
    const auth = await authenticateRequest(req, supabaseAdmin, store_id, store_code)
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: auth.error || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify store exists
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('stores').select('id, customer_id, store_name')
      .eq('id', store_id).eq('is_active', true).maybeSingle()

    if (storeError || !storeData) {
      return new Response(
        JSON.stringify({ error: 'Invalid store' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch staff (exclude sensitive PIN data)
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('user_roles')
      .select('id, user_id, role, store_id, customer_id, is_active, staff_code, face_photo_url, work_start_time, work_end_time, fingerprint_enabled, salary, created_at')
      .eq('store_id', store_id)
      .in('role', ['store_manager', 'staff'])

    if (staffError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch staff' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const staffWithProfiles = await Promise.all(
      (staffData || []).map(async (staff) => {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('id', staff.user_id)
          .maybeSingle()

        return {
          ...staff,
          email: profile?.email || `Staff ${staff.staff_code}`,
          full_name: profile?.full_name || 'Staff Member'
        }
      })
    )

    return new Response(
      JSON.stringify({ success: true, staff: staffWithProfiles }),
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
