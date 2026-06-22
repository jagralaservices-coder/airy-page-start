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
      console.log('Auth error:', userError)
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
      console.log('Role check error:', roleError)
      return new Response(
        JSON.stringify({ error: 'Only admins can approve owners' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { customer_id, owner_email } = await req.json()

    if (!customer_id || !owner_email) {
      return new Response(
        JSON.stringify({ error: 'Customer ID and owner email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Approving customer:', customer_id, 'email:', owner_email)

    // Step 1: Find the auth user by email using admin API
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.log('Error listing users:', listError)
      return new Response(
        JSON.stringify({ error: 'Failed to find user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = owner_email.trim().toLowerCase()
    const authUser = usersData.users.find(u => (u.email || '').toLowerCase() === normalizedEmail)
    
    if (!authUser) {
      console.log('User not found for email:', owner_email)
      return new Response(
        JSON.stringify({ error: 'User account not found. The owner may need to sign up again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found auth user:', authUser.id)

    // Step 2: Update customer record
    const subscriptionEnd = new Date()
    subscriptionEnd.setDate(subscriptionEnd.getDate() + 30) // 30 days

    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({ 
        approval_status: 'approved',
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        subscription_start: new Date().toISOString().split('T')[0],
        subscription_end: subscriptionEnd.toISOString().split('T')[0],
      })
      .eq('id', customer_id)

    if (updateError) {
      console.log('Error updating customer:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Create user_role for the owner (check if already exists first)
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('role', 'owner')
      .eq('customer_id', customer_id)
      .maybeSingle()

    if (!existingRole) {
      const { error: roleInsertError } = await supabaseAdmin.from('user_roles').insert({
        user_id: authUser.id,
        role: 'owner',
        customer_id: customer_id,
        is_active: true
      })

      if (roleInsertError) {
        console.log('Error creating role:', roleInsertError)
      }
    } else {
      // Ensure existing role is active
      await supabaseAdmin.from('user_roles')
        .update({ is_active: true })
        .eq('id', existingRole.id)
    }

    // Step 4: Also create/update profile if missing
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle()

    if (!existingProfile) {
      await supabaseAdmin.from('profiles').insert({
        id: authUser.id,
        email: owner_email,
        full_name: authUser.user_metadata?.full_name || owner_email.split('@')[0]
      })
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id, actor_email: user.email, action: 'approve_owner',
      entity_type: 'customer', entity_id: customer_id,
      after_data: { approval_status: 'approved', owner_user_id: authUser.id },
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Owner approved successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    console.log('Unexpected error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
