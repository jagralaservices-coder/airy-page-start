import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
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

    const { user_role_id, reason } = await req.json()
    if (!user_role_id) return new Response(JSON.stringify({ error: 'user_role_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: before } = await supabaseAdmin.from('user_roles').select('*').eq('id', user_role_id).maybeSingle()
    if (!before) return new Response(JSON.stringify({ error: 'Role not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (roleData.role === 'owner' && before.customer_id && before.customer_id !== roleData.customer_id) {
      return new Response(JSON.stringify({ error: 'Forbidden: staff not in your scope' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { error } = await supabaseAdmin.from('user_roles').update({
      is_active: false,
      suspended_at: new Date().toISOString(),
      suspended_by: user.id,
      suspension_reason: reason || 'Rejected',
    }).eq('id', user_role_id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (before.user_id) {
      await supabaseAdmin.from('staff').update({
        approval_status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
        active: false,
      }).eq('user_id', before.user_id)
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id, actor_email: user.email, action: 'reject_staff',
      entity_type: 'user_role', entity_id: user_role_id, before_data: before,
      after_data: { is_active: false, reason },
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
