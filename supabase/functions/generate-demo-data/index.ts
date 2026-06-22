import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request body for email/name
    let targetEmail = "wasimrafik@gmail.com";
    let targetName = "wasimrafik";
    let targetStoreId = null;
    
    try {
      const body = await req.json();
      if (body.email) targetEmail = body.email;
      if (body.name) targetName = body.name;
      if (body.storeId) targetStoreId = body.storeId;
    } catch (e) {
      // Ignore if no body
    }

    console.log(`Starting Demo Data Generation for ${targetEmail} / ${targetName}...`);

    // --- HELPER FUNCTIONS ---
    const getRand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const getRandomPhone = () => `+919${Math.floor(Math.random() * 900000000 + 100000000)}`;

    const categories = ['Main Course', 'Starters', 'Beverages', 'Desserts', 'Breads', 'Salads', 'Soups', 'Fast Food', 'Breakfast', 'Specials', 'Combo Meals', 'Snacks'];
    const namesFirst = ['Rahul', 'Amit', 'Priya', 'Neha', 'Sanjay', 'Vikram', 'Anjali', 'Kavita', 'Ramesh', 'Suresh', 'Deepak', 'Pooja', 'Sneha', 'Vivek', 'Gaurav', 'Manish', 'Nitin', 'Ravi', 'Manoj', 'Rajesh', 'Siddharth', 'Arjun', 'Simran', 'Aisha', 'Kiran'];
    const namesLast = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Jain', 'Shah', 'Agarwal', 'Yadav', 'Mishra', 'Pandey', 'Dubey', 'Tiwari', 'Nair', 'Bose', 'Das', 'Chatterjee', 'Iyer', 'Menon'];
    const getRandomName = () => `${getRandomItem(namesFirst)} ${getRandomItem(namesLast)}`;

    // 1. Get user profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`email.eq.${targetEmail},full_name.ilike.%${targetName}%`)
      .limit(1)
      .single();

    if (profileErr || !profile) {
      throw new Error(`Profile not found for ${targetEmail} or ${targetName}`);
    }

    // 2. Get customer record linked to profile
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, owner_name, owner_email')
      .or(`owner_email.eq.${profile.email},owner_name.ilike.%${targetName}%`)
      .limit(1)
      .single();

    let customerId = customer?.id;
    if (!customerId) {
        // Try fallback to see if any store has this profile as a user role
        const { data: userRole } = await supabase.from('user_roles').select('customer_id').eq('user_id', profile.id).limit(1).single();
        if (userRole) {
          customerId = userRole.customer_id;
        } else {
          throw new Error(`Could not resolve customer_id for ${profile.full_name}.`);
        }
    }

    let storeId = targetStoreId;
    if (!storeId) {
      const { data: stores, error: storesErr } = await supabase
        .from('stores')
        .select('id, store_name')
        .eq('customer_id', customerId);

      if (storesErr || !stores || stores.length === 0) {
        throw new Error(`No stores found for customer ${customerId}`);
      }
      storeId = stores[0].id;
      console.log(`Targeting First Store: ${stores[0].store_name} (ID: ${storeId})`);
    } else {
      console.log(`Targeting Explicit Store ID: ${storeId}`);
    }

    // --- WIPE OLD DATA ---
    console.log('Wiping old data...');
    await Promise.all([
      supabase.from('orders').delete().eq('store_id', storeId),
      supabase.from('menu_items').delete().eq('store_id', storeId),
      supabase.from('store_categories').delete().eq('store_id', storeId),
      supabase.from('inventory_items').delete().eq('store_id', storeId),
      supabase.from('pos_customers').delete().eq('store_id', storeId),
      supabase.from('expenses').delete().eq('store_id', storeId),
      supabase.from('credit_ledger').delete().eq('store_id', storeId),
      supabase.from('credit_payments').delete().eq('store_id', storeId),
      supabase.from('staff_attendance').delete().eq('store_id', storeId)
    ]);

    // --- CATEGORIES ---
    console.log('Generating Categories...');
    const categoryData = categories.map((cat, idx) => ({
      store_id: storeId,
      category_id: cat.toLowerCase().replace(/\s+/g, '_'),
      name: cat,
      icon: '🍽️',
      color: 'blue-500',
      sort_order: idx
    }));
    await supabase.from('store_categories').insert(categoryData);

    // --- MENU ITEMS ---
    console.log('Generating Menu Items...');
    const menuItems = [];
    for (let c = 0; c < categories.length; c++) {
      const cat = categories[c];
      const numItems = getRand(10, 15);
      for (let i = 0; i < numItems; i++) {
        menuItems.push({
          store_id: storeId,
          name: `${cat} Signature ${i+1}`,
          category: cat,
          price: getRand(99, 1299),
          is_available: true,
          stock: getRand(10, 100),
          description: `Delicious homemade ${cat.toLowerCase()}`,
          is_veg: getRand(0, 1) === 1,
        });
      }
    }
    const { data: insertedMenu } = await supabase.from('menu_items').insert(menuItems).select('id, name, price, category');
    const menuData: any[] = insertedMenu || [];

    // --- INVENTORY ---
    console.log('Generating Inventory Items...');
    const inventoryItems = [];
    const units = ['kg', 'liters', 'pcs', 'packets', 'gm', 'ml'];
    for (let i = 0; i < 100; i++) {
      inventoryItems.push({
        store_id: storeId,
        name: `Raw Supply ${i+1}`,
        quantity: getRand(10, 1000),
        unit: getRandomItem(units),
        min_stock: getRand(5, 50),
        cost_per_unit: getRand(10, 500),
        gst_percentage: getRandomItem([0, 5, 12, 18]),
      });
    }
    const { data: insertedInventory } = await supabase.from('inventory_items').insert(inventoryItems).select('id');
    const invData: any[] = insertedInventory || [];

    // --- MENU COMPONENTS (INGREDIENTS) ---
    console.log('Generating Menu Components...');
    const ingredients = [];
    if (insertedMenu && insertedInventory && insertedInventory.length > 0) {
      for (const menuItem of insertedMenu) {
        const numIngredients = getRand(1, 4);
        for (let i = 0; i < numIngredients; i++) {
          const invItem = invData.length > 0 ? getRandomItem(invData) : { id: 'fallback-inv-id' };
          ingredients.push({
            menu_item_id: (menuItem as any).id,
            inventory_item_id: invItem.id,
            quantity_required: getRand(1, 100),
            unit: getRandomItem(['gm', 'ml', 'pcs'])
          });
        }
      }
      await supabase.from('menu_item_ingredients').insert(ingredients);
    }

    // --- CUSTOMERS ---
    console.log('Generating Customers...');
    const customersList = [];
    for(let i=0; i<300; i++) {
      customersList.push({
        store_id: storeId,
        name: getRandomName(),
        phone: getRandomPhone(),
        email: `customer${i}_${Date.now()}@example.com`,
        address: `${getRand(10, 999)}, MG Road`,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: `4000${getRand(10, 99)}`,
        points: getRand(0, 5000)
      });
    }
    const { data: insertedCustomers } = await supabase.from('pos_customers').insert(customersList).select('id, name, phone, email');
    const custData: any[] = insertedCustomers || [];

    // --- STAFF ATTENDANCE ---
    console.log('Generating Staff Attendance...');
    const staffNames = ['Rahul T.', 'Amit K.', 'Priya S.', 'Sanjay M.'];
    const attendance = [];
    const now = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      for (const staff of staffNames) {
        if (Math.random() > 0.1) {
          attendance.push({
            store_id: storeId,
            staff_id: `staff_${staff.replace(/\s/g, '')}`,
            staff_name: staff,
            date: dateStr,
            status: 'present',
            check_in: '09:00',
            check_out: '18:00'
          });
        }
      }
    }
    await supabase.from('staff_attendance').insert(attendance);

    // --- ORDERS, EXPENSES, CREDIT (90 Days) ---
    console.log('Generating 90 Days of Extensive History...');
    const orders = [];
    const expenses = [];
    const creditLedgers = [];
    const creditPayments = [];
    const statuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'pending', 'cancelled', 'refunded'];
    const types = ['dine-in', 'takeaway', 'delivery'];
    const pmethods = ['cash', 'upi', 'card', 'credit'];
    const expCategories = ['Rent', 'Salary', 'Electricity', 'Internet', 'Marketing', 'Maintenance', 'Miscellaneous', 'Supplies', 'Inventory Purchase'];

    const getRandPastDate = () => {
      const past = new Date();
      past.setDate(past.getDate() - getRand(0, 89));
      past.setHours(getRand(8, 23), getRand(0, 59), getRand(0, 59));
      return past;
    };

    for (let i = 0; i < 90; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const numOrders = getRand(25, 60);
      for (let o = 0; o < numOrders; o++) {
        const orderDate = new Date(d);
        orderDate.setHours(getRand(8, 23), getRand(0, 59));
        
        let customerName = getRandomName();
        let customerPhone = getRandomPhone();
        
        // 50% chance to use an existing customer if any
        if (Math.random() > 0.5 && custData.length > 0) {
          const c = getRandomItem(custData);
          customerName = (c as any).name;
          customerPhone = (c as any).phone;
        }
        
        const numItems = getRand(1, 5);
        let subtotal = 0;
        const orderItems = [];

        for (let j = 0; j < numItems; j++) {
          const item = menuData.length > 0 ? getRandomItem(menuData) : { id: 'fallback-id', name: 'Fallback Item', price: 100, category: 'General' };
          const qty = getRand(1, 3);
          const price = (item as any).price;
          subtotal += price * qty;
          orderItems.push({
            id: (item as any).id,
            name: (item as any).name,
            price: price,
            quantity: qty,
            variant: null,
            category: (item as any).category,
          });
        }

        const tax = Math.round(subtotal * 0.05);
        const discount = Math.random() > 0.8 ? Math.round(subtotal * 0.1) : 0;
        const total = subtotal + tax - discount;

        orders.push({
          store_id: storeId,
          bill_number: `B-${dateStr.replace(/-/g, '')}-${o}`,
          subtotal: subtotal,
          tax: tax,
          discount: discount,
          total: total,
          status: getRandomItem(statuses),
          payment_method: getRandomItem(pmethods),
          order_type: getRandomItem(types),
          created_at: orderDate.toISOString(),
          customer_name: customerName,
          customer_phone: customerPhone,
          items: orderItems,
        });

        if (Math.random() > 0.9) {
          creditLedgers.push({
            store_id: storeId,
            customer_name: customerName,
            customer_phone: customerPhone,
            bill_number: `B-${dateStr.replace(/-/g, '')}-${o}`,
            total_amount: total,
            paid_amount: 0,
            due_amount: total,
            payment_status: 'pending',
            notes: 'Credit order',
            created_at: orderDate.toISOString()
          });
        }
      }

      const numExp = getRand(2, 5);
      for(let e=0; e<numExp; e++) {
        const expDate = new Date(d);
        expDate.setHours(getRand(9, 20));
        expenses.push({
          store_id: storeId,
          amount: getRand(200, 5000),
          category: getRandomItem(expCategories),
          description: `Daily ${getRandomItem(['operations', 'maintenance', 'purchase', 'bill'])}`,
          date: dateStr,
          paid_by: getRandomItem(['Cash', 'Bank Transfer', 'UPI', 'Owner Card']),
          created_at: expDate.toISOString(),
        });
      }
    }

    // Chunk Insertions
    const chunkInsert = async (table: string, data: any[]) => {
      for (let i = 0; i < data.length; i += 500) {
        const chunk = data.slice(i, i + 500);
        await supabase.from(table).insert(chunk);
      }
    };

    await chunkInsert('orders', orders);
    await chunkInsert('expenses', expenses);

    if (creditLedgers.length > 0) {
      for (let i = 0; i < creditLedgers.length; i += 500) {
        const chunk = creditLedgers.slice(i, i + 500);
        const { data: insertedLedgers } = await supabase.from('credit_ledger').insert(chunk).select('id, due_amount');
        if (insertedLedgers) {
          const ledgerUpdates = [];
          for (const l of insertedLedgers) {
            if (Math.random() > 0.5) {
              const payAmt = Math.round(l.due_amount * (Math.random() * 0.5 + 0.2));
              creditPayments.push({
                store_id: storeId,
                credit_id: l.id,
                amount: payAmt,
                payment_method: getRandomItem(['cash', 'upi']),
                created_at: getRandPastDate().toISOString()
              });
              
              const newDue = l.due_amount - payAmt;
              ledgerUpdates.push({
                id: l.id,
                paid_amount: payAmt,
                due_amount: newDue,
                payment_status: newDue <= 0 ? 'paid' : 'partial'
              });
            }
          }
          
          for (const up of ledgerUpdates) {
            await supabase.from('credit_ledger').update({
              paid_amount: up.paid_amount,
              due_amount: up.due_amount,
              payment_status: up.payment_status
            }).eq('id', up.id);
          }
        }
      }
      if (creditPayments.length > 0) {
        await chunkInsert('credit_payments', creditPayments);
      }
    }

    try {
      const purchaseOrders = [];
      for (let i = 0; i < 30; i++) {
        const poDate = getRandPastDate();
        purchaseOrders.push({
          store_id: storeId,
          po_number: `PO-${poDate.toISOString().split('T')[0].replace(/-/g, '')}-${getRand(10,99)}`,
          supplier_name: `Supplier ${getRandomItem(['A', 'B', 'C', 'D', 'Express', 'Wholesale', 'Fresh'])}`,
          status: getRandomItem(['draft', 'sent', 'received', 'received']),
          total_amount: getRand(5000, 25000),
          expected_date: new Date(poDate.getTime() + 86400000 * 2).toISOString().split('T')[0],
          created_at: poDate.toISOString()
        });
      }
      await supabase.from('purchase_orders').insert(purchaseOrders);
    } catch(e) {
      console.log('Skipping purchase_orders insertion');
    }

    return new Response(
      JSON.stringify({ message: "Demo data generated successfully", success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating demo data:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred", success: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
