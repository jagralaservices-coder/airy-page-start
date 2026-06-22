import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireFeature } from "../_shared/checkFeature.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const gate = await requireFeature(req, "staff_management"); if (gate) return gate;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const authHeader = req.headers.get('Authorization') || ''
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role, customer_id').eq('user_id', user.id).in('role', ['admin', 'super_admin', 'owner']).eq('is_active', true).maybeSingle()
    if (!roleData) return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { user_role_id } = await req.json()
    if (!user_role_id) return new Response(JSON.stringify({ error: 'user_role_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: before } = await supabaseAdmin.from('user_roles').select('*').eq('id', user_role_id).maybeSingle()
    if (!before) return new Response(JSON.stringify({ error: 'Role not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Owners can only approve staff in their customer scope
    if (roleData.role === 'owner' && before.customer_id && before.customer_id !== roleData.customer_id) {
      return new Response(JSON.stringify({ error: 'Forbidden: staff not in your scope' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { error } = await supabaseAdmin.from('user_roles').update({
      is_active: true,
    }).eq('id', user_role_id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (before.user_id) {
      await supabaseAdmin.from('staff').update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        active: true,
      }).eq('user_id', before.user_id)
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id, actor_email: user.email, action: 'approve_staff',
      entity_type: 'user_role', entity_id: user_role_id, before_data: before,
      after_data: { is_active: true },
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
