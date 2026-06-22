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
      .eq('role', 'admin')
      .eq('is_active', true)
      .maybeSingle()

    if (roleError || !roleData) {
      console.log('Role check error:', roleError)
      return new Response(
        JSON.stringify({ error: 'Only admins can delete owner accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { customer_id } = await req.json()

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: 'Customer ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if target customer is the primary admin account
    const { data: customerData, error: customerLookupError } = await supabaseAdmin
      .from('customers')
      .select('owner_email')
      .eq('id', customer_id)
      .maybeSingle()

    if (customerLookupError) {
      console.log('Customer lookup error:', customerLookupError)
    }

    if (customerData?.owner_email === 'jagralasalman786@gmail.com') {
      return new Response(
        JSON.stringify({ error: 'The primary admin account (jagralasalman786@gmail.com) cannot be deleted' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Deleting customer:', customer_id)

    // Helper function to extract storage paths from public URLs
    const getStoragePath = (url: string | null, bucket: string): string | null => {
      if (!url) return null
      const prefix = `/public/${bucket}/`
      const index = url.indexOf(prefix)
      if (index !== -1) {
        return decodeURIComponent(url.substring(index + prefix.length))
      }
      const parts = url.split(`/${bucket}/`)
      if (parts.length > 1) {
        return decodeURIComponent(parts[1])
      }
      return null
    }

    // Step 1: Get user_roles for this customer to find associated users
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, face_photo_url')
      .eq('customer_id', customer_id)

    if (rolesError) {
      console.log('Error fetching user roles:', rolesError)
    }

    // Collect staff face photos to delete
    const staffFacesToDelete = (userRoles || [])
      .map(r => r.face_photo_url)
      .filter(Boolean)
      .map(url => getStoragePath(url, 'staff-faces'))
      .filter(Boolean) as string[]

    const userIds = (userRoles || []).map(r => r.user_id).filter(Boolean) as string[]

    // Step 2: Get all stores for this customer
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('customer_id', customer_id)

    if (storesError) {
      console.log('Error fetching stores:', storesError)
    }

    // Fetch menu item image urls to delete
    let menuImagesToDelete: string[] = []
    if (stores && stores.length > 0) {
      const storeIds = stores.map(s => s.id)
      const { data: menuItems, error: menuItemsError } = await supabaseAdmin
        .from('menu_items')
        .select('image_url')
        .in('store_id', storeIds)
      
      if (menuItemsError) {
        console.log('Error fetching menu items:', menuItemsError)
      }

      menuImagesToDelete = (menuItems || [])
        .map(i => i.image_url)
        .filter(Boolean)
        .map(url => getStoragePath(url, 'menu-images'))
        .filter(Boolean) as string[]
    }

    // Fetch chat media urls to delete
    let chatMediaToDelete: string[] = []
    const { data: convos, error: convosError } = await supabaseAdmin
      .from('chat_conversations')
      .select('id')
      .eq('customer_id', customer_id)

    if (convosError) {
      console.log('Error fetching conversations:', convosError)
    }

    const convoIds = (convos || []).map(c => c.id)
    if (convoIds.length > 0) {
      const { data: chatMessages, error: chatMessagesError } = await supabaseAdmin
        .from('chat_messages')
        .select('media_url')
        .in('conversation_id', convoIds)
        .not('media_url', 'is', null)

      if (chatMessagesError) {
        console.log('Error fetching chat messages:', chatMessagesError)
      }

      chatMediaToDelete = (chatMessages || [])
        .map(m => m.media_url)
        .filter(Boolean)
        .map(url => getStoragePath(url, 'chat-media'))
        .filter(Boolean) as string[]
    }

    // Step 3: Delete files from storage buckets
    if (staffFacesToDelete.length > 0) {
      const { error: storageErr } = await supabaseAdmin.storage.from('staff-faces').remove(staffFacesToDelete)
      if (storageErr) console.log('Error deleting staff face photos:', storageErr)
    }
    if (menuImagesToDelete.length > 0) {
      const { error: storageErr } = await supabaseAdmin.storage.from('menu-images').remove(menuImagesToDelete)
      if (storageErr) console.log('Error deleting menu images:', storageErr)
    }
    if (chatMediaToDelete.length > 0) {
      const { error: storageErr } = await supabaseAdmin.storage.from('chat-media').remove(chatMediaToDelete)
      if (storageErr) console.log('Error deleting chat media:', storageErr)
    }

    // Step 4: Delete audit logs associated with these users
    if (userIds.length > 0) {
      const { error: auditError } = await supabaseAdmin
        .from('security_audit_log')
        .delete()
        .in('user_id', userIds)
      if (auditError) {
        console.log('Error deleting security audit logs:', auditError)
      }
    }

    // Step 5: Delete each store using cascade function
    if (stores && stores.length > 0) {
      for (const store of stores) {
        const { error: cascadeError } = await supabaseAdmin.rpc('delete_store_cascade', {
          p_store_id: store.id
        })
        if (cascadeError) {
          console.log('Error cascading store delete:', store.id, cascadeError)
        }
      }
    }

    // Step 6: Delete owner's user_roles (those without store_id)
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('customer_id', customer_id)

    // Step 7: Delete customer record
    const { error: deleteCustomerError } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', customer_id)

    if (deleteCustomerError) {
      console.log('Error deleting customer:', deleteCustomerError)
      return new Response(
        JSON.stringify({ error: deleteCustomerError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 8: Delete auth users
    if (userIds.length > 0) {
      for (const userId of userIds) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId)
          console.log('Deleted auth user:', userId)
        } catch (e) {
          console.log('Error deleting auth user:', userId, e)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Owner account and all related data deleted successfully'
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
