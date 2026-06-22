import { supabase } from '@/integrations/supabase/client';
import { generateId, Staff, setStaff, AttendanceRecord } from '@/lib/store';

export const generateClientDemoData = async (storeId: string, customerId: string) => {
  console.log(`Starting Client Demo Data Generation for Store ID: ${storeId}...`);

  const getRand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const getRandomPhone = () => `+919${Math.floor(Math.random() * 900000000 + 100000000)}`;

  const categories = ['Main Course', 'Starters', 'Beverages', 'Desserts', 'Breads', 'Salads', 'Soups', 'Fast Food'];
  const namesFirst = ['Rahul', 'Amit', 'Priya', 'Neha', 'Sanjay', 'Vikram', 'Anjali', 'Kavita', 'Ramesh', 'Suresh'];
  const namesLast = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Jain', 'Shah'];
  const getRandomName = () => `${getRandomItem(namesFirst)} ${getRandomItem(namesLast)}`;

  // --- WIPE OLD DATA ---
  console.log('Wiping old data...');
  try {
    await Promise.all([
      supabase.from('orders').delete().eq('store_id', storeId),
      supabase.from('menu_items').delete().eq('store_id', storeId),
      supabase.from('store_categories').delete().eq('store_id', storeId),
      supabase.from('inventory_items').delete().eq('store_id', storeId),
      supabase.from('pos_customers').delete().eq('store_id', storeId),
      supabase.from('expenses').delete().eq('store_id', storeId),
      supabase.from('credit_ledger').delete().eq('store_id', storeId),
      supabase.from('credit_payments').delete().eq('store_id', storeId),
      supabase.from('staff_attendance').delete().eq('store_id', storeId),
      supabase.from('purchase_orders').delete().eq('store_id', storeId),
      supabase.from('user_roles').delete().eq('store_id', storeId).eq('role', 'staff')
    ]);
  } catch(e) {
    console.log("Wipe error (likely RLS), continuing to insert demo data:", e);
  }

  // --- DEMO STAFF ---
  console.log('Generating 5 Demo Staff...');
  const demoStaff: Staff[] = [];
  const staffRoles = ['cashier', 'waiter', 'kitchen', 'delivery', 'waiter'];
  for (let i = 0; i < 5; i++) {
    const sId = generateId();
    const sName = getRandomName();
    
    // Attempt DB Insert for user_roles
    try {
      await supabase.from('user_roles').insert({
        id: generateId(),
        user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID, might fail if FK is strict
        store_id: storeId,
        role: staffRoles[i],
        staff_code: `STF${100+i}`,
        pin: '000000',
        is_active: true,
      });
    } catch (e) {
      // Ignore FK failure
    }

    // Always push to local storage so the POS can use them
    demoStaff.push({
      id: sId,
      name: sName,
      role: staffRoles[i] as any,
      phone: getRandomPhone(),
      pin: '000000',
      isActive: true,
      attendance: []
    });
  }
  setStaff(demoStaff); // Save to local storage for PIN login

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
    const numItems = getRand(5, 8);
    for (let i = 0; i < numItems; i++) {
      menuItems.push({
        store_id: storeId,
        name: `${cat} Signature ${i+1}`,
        category: cat.toLowerCase().replace(/\s+/g, '_'),
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

  // --- INVENTORY ITEMS ---
  console.log('Generating Inventory Items...');
  const inventoryItems = [];
  const rawMaterials = ['Tomatoes', 'Onions', 'Potatoes', 'Flour', 'Rice', 'Milk', 'Cheese', 'Chicken', 'Cooking Oil'];
  for (const raw of rawMaterials) {
    inventoryItems.push({
      store_id: storeId,
      name: raw,
      quantity: getRand(50, 500),
      unit: getRandomItem(['kg', 'ltr', 'pcs']),
      min_stock: getRand(10, 30),
      cost_per_unit: getRand(20, 300),
      gst_percentage: getRandomItem([0, 5, 12, 18])
    });
  }
  await supabase.from('inventory_items').insert(inventoryItems);

  // --- PURCHASE ORDERS ---
  console.log('Generating Purchase Orders...');
  const poData = [];
  const suppliers = ['Fresh Farms Ltd', 'Metro Wholesale', 'City Dairy', 'Global Meats'];
  for (let i = 1; i <= 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() - getRand(1, 10));
    poData.push({
      store_id: storeId,
      po_number: `PO-2026-${String(i).padStart(3, '0')}`,
      supplier_name: getRandomItem(suppliers),
      status: getRandomItem(['draft', 'ordered', 'shipped', 'delivered', 'cancelled']),
      order_date: d.toISOString().split('T')[0],
      expected_date: new Date(d.getTime() + 3 * 86400000).toISOString().split('T')[0],
      total_amount: getRand(5000, 25000),
      notes: 'Demo Purchase Order'
    });
  }
  try { await supabase.from('purchase_orders').insert(poData); } catch(e) {}

  // --- CUSTOMERS ---
  console.log('Generating Customers...');
  const customersList = [];
  for(let i=0; i<50; i++) {
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

  // --- ORDERS, EXPENSES, CREDIT ---
  console.log('Generating 30 Days of Extensive History...');
  const orders = [];
  const expenses = [];
  const creditLedgers = [];
  const creditPayments = [];
  const statuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'pending', 'cancelled', 'refunded'];
  const types = ['dine-in', 'takeaway', 'delivery', 'online', 'qr'];
  const pmethods = ['cash', 'upi', 'card', 'credit'];
  const expCategories = ['Rent', 'Salary', 'Electricity', 'Internet', 'Marketing', 'Maintenance', 'Miscellaneous', 'Supplies', 'Inventory Purchase'];

  const now = new Date();
  const getRandPastDate = () => {
    const past = new Date();
    past.setDate(past.getDate() - getRand(0, 29));
    past.setHours(getRand(8, 23), getRand(0, 59), getRand(0, 59));
    return past;
  };

  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const numOrders = getRand(10, 20);
    for (let o = 0; o < numOrders; o++) {
      const orderDate = new Date(d);
      orderDate.setHours(getRand(8, 23), getRand(0, 59));
      
      let customerName = getRandomName();
      let customerPhone = getRandomPhone();
      
      if (Math.random() > 0.5 && custData.length > 0) {
        const c = getRandomItem(custData);
        customerName = (c as any).name;
        customerPhone = (c as any).phone;
      }
      
      const numItems = getRand(1, 5);
      let subtotal = 0;
      const orderItems = [];

      for (let j = 0; j < numItems; j++) {
        const item = menuData.length > 0 ? getRandomItem(menuData) : { id: generateId(), name: 'Fallback Item', price: 100, category: 'General' };
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

      if (Math.random() > 0.8) {
        creditLedgers.push({
          store_id: storeId,
          customer_name: customerName,
          customer_phone: customerPhone,
          bill_number: `B-${dateStr.replace(/-/g, '')}-${o}`,
          total_amount: total,
          paid_amount: 0,
          due_amount: total,
          payment_status: 'unpaid',
          notes: 'Demo credit order',
          created_at: orderDate.toISOString()
        });
      }
    }

    const numExp = getRand(1, 3);
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
    for (let i = 0; i < data.length; i += 100) {
      const chunk = data.slice(i, i + 100);
      try {
        await supabase.from(table).insert(chunk);
      } catch (e) {
        console.log(`Failed inserting chunk to ${table}`);
      }
    }
  };

  await chunkInsert('orders', orders);
  await chunkInsert('expenses', expenses);

  if (creditLedgers.length > 0) {
    for (let i = 0; i < creditLedgers.length; i += 100) {
      const chunk = creditLedgers.slice(i, i + 100);
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
        
        // Apply the updates to credit_ledger so UI shows partial/paid
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

  // --- STAFF SCHEDULES, ATTENDANCE, LEAVES, ADVANCES ---
  console.log('Generating Staff Modules Data...');
  const schedules = [];
  const attendances = [];
  const leaves = [];
  const advances = [];

  for (const staff of demoStaff) {
    // Schedules for next 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      schedules.push({
        store_id: storeId,
        staff_id: staff.id,
        staff_name: staff.name,
        date: d.toISOString().split('T')[0],
        shift_type: getRandomItem(['morning', 'evening', 'full_day']),
        start_time: '09:00',
        end_time: '18:00',
        status: 'published'
      });
    }

    // Attendance for past 10 days
    for (let i = 1; i <= 10; i++) {
      if (Math.random() > 0.2) { // 80% attendance rate
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(getRand(8, 10), getRand(0, 59));
        
        const outDate = new Date(d);
        outDate.setHours(getRand(17, 20), getRand(0, 59));
        
        attendances.push({
          store_id: storeId,
          staff_id: staff.id,
          staff_name: staff.name,
          date: d.toISOString().split('T')[0],
          check_in: d.toISOString(),
          check_out: outDate.toISOString(),
          status: 'present',
          verified: true
        });
      }
    }

    // Random Leaves
    if (Math.random() > 0.5) {
      const startD = new Date(now);
      startD.setDate(now.getDate() + getRand(1, 14));
      const endD = new Date(startD);
      endD.setDate(startD.getDate() + getRand(0, 3));
      leaves.push({
        store_id: storeId,
        staff_id: staff.id,
        staff_name: staff.name,
        leave_type: getRandomItem(['sick', 'casual', 'annual']),
        start_date: startD.toISOString().split('T')[0],
        end_date: endD.toISOString().split('T')[0],
        reason: 'Personal reason / Demo data',
        status: getRandomItem(['pending', 'approved', 'rejected'])
      });
    }

    // Random Advances
    if (Math.random() > 0.7) {
      advances.push({
        store_id: storeId,
        staff_id: staff.id,
        staff_name: staff.name,
        amount: getRand(1000, 5000),
        reason: 'Medical emergency / Demo data',
        status: getRandomItem(['pending', 'approved', 'paid'])
      });
    }
  }

  await chunkInsert('staff_schedules', schedules);
  await chunkInsert('staff_attendance', attendances);
  await chunkInsert('leave_requests', leaves);
  await chunkInsert('advance_requests', advances);

  return { success: true };
};
