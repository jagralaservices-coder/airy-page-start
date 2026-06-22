import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_FIELDS = [
  'name', 'phone', 'email', 'address', 'address_line1', 'locality',
  'city', 'state', 'pincode', 'country', 'currency_code',
  'tax_type', 'tax_percentage', 'business_type',
]

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

    const { data: roles } = await supabaseAdmin.from('user_roles').select('role, customer_id').eq('user_id', user.id).eq('is_active', true)
    const isAdmin = (roles || []).some(r => r.role === 'admin' || r.role === 'super_admin')
    const ownerCustomerId = (roles || []).find(r => r.role === 'owner')?.customer_id

    if (!isAdmin && !ownerCustomerId) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { store_id, updates } = body
    if (!store_id || !updates || typeof updates !== 'object') {
      return new Response(JSON.stringify({ error: 'store_id and updates required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: before } = await supabaseAdmin.from('stores').select('*').eq('id', store_id).maybeSingle()
    if (!before) return new Response(JSON.stringify({ error: 'Store not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (!isAdmin && before.customer_id !== ownerCustomerId) {
      return new Response(JSON.stringify({ error: 'Forbidden: store not in your scope' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const safeUpdates: Record<string, unknown> = {}
    for (const k of ALLOWED_FIELDS) {
      if (k in updates) safeUpdates[k] = updates[k]
    }
    if (Object.keys(safeUpdates).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields to update' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    safeUpdates.updated_at = new Date().toISOString()

    const { data: updated, error } = await supabaseAdmin.from('stores').update(safeUpdates).eq('id', store_id).select().maybeSingle()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id, actor_email: user.email, action: 'update_store',
      entity_type: 'store', entity_id: store_id, before_data: before, after_data: safeUpdates,
    })

    return new Response(JSON.stringify({ success: true, store: updated }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
