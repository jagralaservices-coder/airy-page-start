import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Body: { entity_type: 'customer'|'merchant'|'store'|'user_role'|'staff', entity_id: uuid }
// Backward compatible: { entity: 'owner', customer_id, user_id }
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

    const body = await req.json()
    let { entity_type, entity_id } = body

    if (!entity_type && body.entity) {
      entity_type = body.entity === 'owner' ? 'customer' : body.entity === 'staff' ? 'user_role' : body.entity
    }
    if (!entity_id) {
      entity_id = body.customer_id || body.store_id || body.user_role_id || body.merchant_id
    }

    const allowed = ['customer', 'merchant', 'store', 'user_role', 'staff']
    if (!entity_type || !entity_id || !allowed.includes(entity_type)) {
      return new Response(JSON.stringify({ error: 'entity_type and entity_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const tableMap: Record<string, string> = { customer: 'customers', merchant: 'merchants', store: 'stores', user_role: 'user_roles', staff: 'staff' }
    const table = tableMap[entity_type]
    const activeCol = table === 'staff' ? 'active' : 'is_active'

    const { data: before } = await supabaseAdmin.from(table).select('*').eq('id', entity_id).maybeSingle()
    const cascadeUpdate: Record<string, unknown> = {
      [activeCol]: true,
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
    }
    const update: Record<string, unknown> = table === 'merchants' ? { [activeCol]: true } : cascadeUpdate
    const { error } = await supabaseAdmin.from(table).update(update).eq('id', entity_id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (entity_type === 'customer' || entity_type === 'merchant') {
      await supabaseAdmin.from('customers').update(cascadeUpdate).eq('id', entity_id)
      await supabaseAdmin.from('merchants').update({ is_active: true }).eq('id', entity_id)
      await supabaseAdmin.from('user_roles').update(cascadeUpdate).or(`customer_id.eq.${entity_id},merchant_id.eq.${entity_id}`)
      await supabaseAdmin.from('stores').update(cascadeUpdate).or(`customer_id.eq.${entity_id},merchant_id.eq.${entity_id}`)
      if (body.user_id) {
        await supabaseAdmin.from('user_roles').update(cascadeUpdate).eq('user_id', body.user_id)
      }
    }

    if (entity_type === 'store') {
      await supabaseAdmin.from('user_roles').update(cascadeUpdate).eq('store_id', entity_id)
    }

    if (entity_type === 'staff') {
      await supabaseAdmin.from('user_roles').update({
        is_active: true,
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
      }).eq('id', entity_id)
    }

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
