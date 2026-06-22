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

    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'super_admin']).eq('is_active', true).maybeSingle()
    if (!roleData) return new Response(JSON.stringify({ error: 'Only admins can reject stores' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { store_id, reason } = await req.json()
    if (!store_id) return new Response(JSON.stringify({ error: 'store_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: before } = await supabaseAdmin.from('stores').select('*').eq('id', store_id).maybeSingle()
    const { error } = await supabaseAdmin.from('stores').update({
      approval_status: 'rejected',
      is_active: false,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || null,
      approved_by: user.id,
    }).eq('id', store_id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id, actor_email: user.email, action: 'reject_store',
      entity_type: 'store', entity_id: store_id, before_data: before,
      after_data: { approval_status: 'rejected', reason },
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
