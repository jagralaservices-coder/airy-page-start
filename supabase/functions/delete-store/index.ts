import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { store_id } = await req.json()

    if (!store_id) {
      return new Response(
        JSON.stringify({ error: 'store_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || authHeader === 'Bearer null') {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin, super_admin or owner
    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, merchant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['admin', 'super_admin', 'owner'])

    if (roleError) {
      console.error('Role lookup error:', roleError)
    }

    const roleData = (roleRows || []).find((r: any) => r.role === 'super_admin' || r.role === 'admin')
      || (roleRows || []).find((r: any) => r.role === 'owner')

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Only owners or admins can delete stores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the store belongs to this owner's merchant
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id, merchant_id, name')
      .eq('id', store_id)
      .maybeSingle()

    if (storeError) {
      console.error('Store lookup error:', storeError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify store: ' + storeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!storeData) {
      return new Response(
        JSON.stringify({ success: true, alreadyDeleted: true, message: 'Store already deleted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isPlatformAdmin = roleData?.role === 'admin' || roleData?.role === 'super_admin'
    let canDelete = isPlatformAdmin

    if (!canDelete) {
      canDelete = (roleRows || []).some((role: any) =>
        role.role === 'owner' && role.merchant_id === storeData.merchant_id
      )
    }

    if (!canDelete) {
      const { data: merchantData, error: merchantError } = await supabaseAdmin
        .from('merchants')
        .select('id, owner_user_id')
        .eq('id', storeData.merchant_id)
        .maybeSingle()

      if (merchantError) {
        console.error('Merchant lookup error:', merchantError)
      }

      canDelete = merchantData?.owner_user_id === user.id
    }

    if (!canDelete) {
      return new Response(
        JSON.stringify({ error: 'You can only delete your own stores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get staff user_ids before deletion (to delete auth users)
    const { data: staffRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('store_id', store_id)
      .in('role', ['staff', 'store_manager'])

    // Run cascade delete
    const { error: deleteError } = await supabaseAdmin.rpc('delete_store_cascade', {
      p_store_id: store_id
    })

    if (deleteError) {
      console.error('Delete store error:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete store: ' + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete auth users for staff (optional cleanup)
    if (staffRoles && staffRoles.length > 0) {
      for (const role of staffRoles) {
        try {
          // Check if user has other roles before deleting auth user
          const { count } = await supabaseAdmin
            .from('user_roles')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', role.user_id)

          if ((count || 0) === 0) {
            await supabaseAdmin.auth.admin.deleteUser(role.user_id)
          }
        } catch (e) {
          console.warn('Failed to delete auth user:', role.user_id, e)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Store "${storeData.name}" deleted successfully` }),
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
