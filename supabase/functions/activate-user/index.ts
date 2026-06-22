import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Body: { entity_type: 'customer'|'store'|'user_role'|'staff', entity_id: uuid }
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

    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'super_admin']).eq('is_active', true).maybeSingle()
    if (!roleData) return new Response(JSON.stringify({ error: 'Only admins can activate' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { entity_type, entity_id } = await req.json()
    const allowed = ['customer', 'store', 'user_role', 'staff']
    if (!entity_type || !entity_id || !allowed.includes(entity_type)) {
      return new Response(JSON.stringify({ error: 'entity_type and entity_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const tableMap: Record<string, string> = { customer: 'customers', store: 'stores', user_role: 'user_roles', staff: 'staff' }
    const table = tableMap[entity_type]
    const activeCol = table === 'staff' ? 'active' : 'is_active'

    const { data: before } = await supabaseAdmin.from(table).select('*').eq('id', entity_id).maybeSingle()
    const update: Record<string, unknown> = {
      [activeCol]: true,
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
    }
    const { error } = await supabaseAdmin.from(table).update(update).eq('id', entity_id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id, actor_email: user.email, action: 'activate',
      entity_type, entity_id, before_data: before, after_data: update,
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
