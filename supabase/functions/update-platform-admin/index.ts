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
    const { role_id, user_id, fullName, email, password, role } = body

    if (!role_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Role ID and User ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || authHeader === 'Bearer null') {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check if the caller is a super_admin
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin'])
      .eq('is_active', true)
      .maybeSingle()

    if (roleError || !callerRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only Super Administrators can update admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the target user is actually an admin or super_admin
    const { data: targetRoleData, error: targetRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('id', role_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (targetRoleError || !targetRoleData || (targetRoleData.role !== 'admin' && targetRoleData.role !== 'super_admin')) {
      return new Response(
        JSON.stringify({ error: 'Target is not a platform admin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const targetRole = targetRoleData

    const updateAuthData: Record<string, unknown> = {}
    if (email) updateAuthData.email = email.trim().toLowerCase()
    if (password) updateAuthData.password = password
    if (fullName) updateAuthData.user_metadata = { full_name: fullName }

    if (role && (role === 'admin' || role === 'super_admin') && targetRole.role !== role) {
      // Update role
      const { error: updateRoleError } = await supabaseAdmin.from('user_roles').update({
        role: role
      }).eq('id', role_id)
      
      if (updateRoleError) {
        return new Response(
          JSON.stringify({ error: updateRoleError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (Object.keys(updateAuthData).length > 0) {
      // Need email_confirm: true to skip confirmation emails on email change
      if (updateAuthData.email) updateAuthData.email_confirm = true;
      
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        updateAuthData
      )

      if (authUpdateError) {
        return new Response(
          JSON.stringify({ error: authUpdateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (fullName) {
      // Update profile
      await supabaseAdmin.from('profiles').update({
        full_name: fullName,
      }).eq('id', user_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Admin account updated successfully`
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
