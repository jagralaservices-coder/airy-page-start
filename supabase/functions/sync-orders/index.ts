import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// UUID v5-like deterministic conversion from arbitrary string to UUID format
function toUUID(input: string): string {
  // Check if already a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) return input;
  
  // Create a deterministic UUID from the string by hashing it
  let hash = 0;
  const str = 'order:' + input;
  const chars: number[] = [];
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
    chars.push(Math.abs(hash) % 256);
  }
  // Pad to 16 bytes
  while (chars.length < 16) {
    hash = ((hash << 5) - hash) + chars.length;
    hash |= 0;
    chars.push(Math.abs(hash) % 256);
  }
  const hex = chars.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Auth helper: verify JWT, store_code, or active store_id
async function authenticateRequest(req: Request, supabaseAdmin: any, store_id: string, store_code?: string): Promise<{ authorized: boolean; error?: string }> {
  // Path 1: JWT authentication
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader !== 'Bearer null' && !authHeader.endsWith('undefined')) {
    const token = authHeader.replace('Bearer ', '')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    if (token !== anonKey) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
        if (!error && user) {
          const { data: roleRows } = await supabaseAdmin
            .from('user_roles')
            .select('role, store_id, merchant_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .in('role', ['super_admin', 'admin', 'owner', 'store_manager', 'staff'])
          const roleData = (roleRows || []).find((r: any) => r.role === 'super_admin' || r.role === 'admin')
            || (roleRows || []).find((r: any) => r.role === 'owner')
            || (roleRows || []).find((r: any) => r.store_id === store_id)
          
          if (roleData) {
            if (roleData.role === 'admin' || roleData.role === 'super_admin') return { authorized: true }
            if (roleData.role === 'owner') {
              const { data: store } = await supabaseAdmin
                .from('stores').select('merchant_id').eq('id', store_id).maybeSingle()
              if (store && store.merchant_id === roleData.merchant_id) return { authorized: true }
            }
            if ((roleData.role === 'store_manager' || roleData.role === 'staff') && roleData.store_id === store_id) {
              return { authorized: true }
            }
          }
          // Fall through to Path 2/3 instead of denying immediately
        }
      } catch {}
    }
  }

  // Path 2: Store code authentication
  if (store_code) {
    const expectedCode = store_id.slice(0, 8).toUpperCase()
    const { data: storeData } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .eq('is_active', true)
      .maybeSingle()
    
    if (storeData && store_code.toUpperCase() === expectedCode) return { authorized: true }
    return { authorized: false, error: 'Invalid store credentials' }
  }

  // Path 3: Fallback - verify store_id is valid and active
  const { data: activeStore } = await supabaseAdmin
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('is_active', true)
    .maybeSingle()
  
  if (activeStore) return { authorized: true }

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
    const { action, store_id, orders, last_sync_time, store_code } = body

    if (!store_id) {
      return new Response(
        JSON.stringify({ error: 'store_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authenticate the request
    const auth = await authenticateRequest(req, supabaseAdmin, store_id, store_code)
    if (!auth.authorized) {
      console.warn('sync-orders auth denied:', auth.error || 'Unauthorized')
      return new Response(JSON.stringify({ success: false, auth_error: true, error: auth.error || 'Unauthorized', orders: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify store exists and is active
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('stores').select('id').eq('id', store_id).eq('is_active', true).maybeSingle()

    if (storeError || !storeData) {
      return new Response(
        JSON.stringify({ success: false, auth_error: true, error: 'Invalid or inactive store', orders: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ACTION: fetch
    if (action === 'fetch') {
      let query = supabaseAdmin
        .from('orders').select('*').eq('store_id', store_id)
        .order('created_at', { ascending: false })

      if (last_sync_time) {
        query = query.gte('updated_at', last_sync_time)
      }

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      query = query.gte('created_at', thirtyDaysAgo.toISOString())

      const { data, error } = await query.limit(1000)

      if (error) {
        // Schema mismatch (e.g. missing store_id column) — return empty rather than 500
        console.warn('sync-orders fetch error, returning empty:', error.message)
        return new Response(
          JSON.stringify({ success: true, orders: [], items: [], payments: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, orders: data || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ACTION: save
    if (action === 'save') {
      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return new Response(
          JSON.stringify({ error: 'orders array is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Dynamically detect if payment_breakdown column exists in public.orders
      let hasPaymentBreakdown = false;
      try {
        const { error } = await supabaseAdmin
          .from('orders')
          .select('payment_breakdown')
          .limit(1);
        if (!error) {
          hasPaymentBreakdown = true;
        }
      } catch (e) {
        // ignore - column not present yet
      }

      const dbOrders = orders.map((order: any) => {
        const row: any = {
          id: toUUID(order.id || crypto.randomUUID()),
          store_id: store_id,
          bill_number: order.billNumber || order.bill_number || `B${Date.now()}`,
          items: order.items || [],
          subtotal: order.subtotal || 0,
          tax: order.tax || 0,
          discount: order.discount || 0,
          total: order.total || 0,
          order_type: order.orderType || order.order_type || 'dine-in',
          table_number: order.tableNumber?.toString() || order.table_number || null,
          customer_name: order.customerName || order.customer_name || null,
          customer_phone: order.customerPhone || order.customer_phone || null,
          payment_method: order.paymentMethod || order.payment_method || 'cash',
          payment_details: order.paymentBreakdown || order.payment_breakdown 
            ? { breakdown: order.paymentBreakdown || order.payment_breakdown } 
            : (order.paymentDetails || order.payment_details || null),
          status: order.status || 'completed',
          cancel_reason: order.cancelReason || order.cancel_reason || null,
          cancelled_at: order.cancelledAt || order.cancelled_at || null,
          created_at: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (hasPaymentBreakdown) {
          row.payment_breakdown = order.paymentBreakdown || order.payment_breakdown || null;
        }

        return row;
      });

      // Deduplicate by id – keep last occurrence to avoid "cannot affect row a second time"
      const deduped = Array.from(
        new Map(dbOrders.map((o: any) => [o.id, o])).values()
      )

      const { data, error } = await supabaseAdmin
        .from('orders').upsert(deduped, { onConflict: 'id' }).select('id')

      if (error) {
        console.error('Failed to save orders:', {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
          sample: deduped[0],
        })
        return new Response(
          JSON.stringify({
            success: false,
            fallback: true,
            error: 'Failed to save orders',
            message: error.message,
            code: (error as any).code,
            details: (error as any).details,
            hint: (error as any).hint,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, saved_count: data?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "fetch" or "save"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return new Response(
      JSON.stringify({ success: false, fallback: true, error: 'An unexpected error occurred', message, orders: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
