import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kqoveyroyhfbcdedyzop.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is required to bypass RLS and insert demo data.");
  console.error("Please run the script as: $env:SUPABASE_SERVICE_ROLE_KEY='<your_key>'; npx ts-node scripts/seed-wasimrafik-data.ts");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const TARGET_EMAIL = 'wasimrafik@gmail.com'; // Adjust if exact email differs, script will search by name too
const TARGET_NAME = 'wasimrafik';

const categories = ['Main Course', 'Starters', 'Beverages', 'Desserts', 'Breads', 'Salads', 'Soups', 'Fast Food', 'Breakfast', 'Specials', 'Combo Meals', 'Snacks'];

const namesFirst = ['Rahul', 'Amit', 'Priya', 'Neha', 'Sanjay', 'Vikram', 'Anjali', 'Kavita', 'Ramesh', 'Suresh', 'Deepak', 'Pooja', 'Sneha', 'Vivek', 'Gaurav', 'Manish', 'Nitin', 'Ravi', 'Manoj', 'Rajesh', 'Siddharth', 'Arjun', 'Simran', 'Aisha', 'Kiran'];
const namesLast = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Jain', 'Shah', 'Agarwal', 'Yadav', 'Mishra', 'Pandey', 'Dubey', 'Tiwari', 'Nair', 'Bose', 'Das', 'Chatterjee', 'Iyer', 'Menon'];

const getRandomName = () => `${namesFirst[Math.floor(Math.random() * namesFirst.length)]} ${namesLast[Math.floor(Math.random() * namesLast.length)]}`;
const getRandomPhone = () => `+919${Math.floor(Math.random() * 900000000 + 100000000)}`;
const getRand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const main = async () => {
  console.log(`=========================================`);
  console.log(`Starting Demo Data Generation`);
  console.log(`Target: ${TARGET_EMAIL} / ${TARGET_NAME}`);
  console.log(`=========================================`);

  // 1. Get user profile
  let { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .or(`email.eq.${TARGET_EMAIL},full_name.ilike.%${TARGET_NAME}%`)
    .limit(1)
    .single();

  if (profileErr || !profile) {
    console.error(`Profile not found for ${TARGET_EMAIL} or ${TARGET_NAME}`, profileErr);
    process.exit(1);
  }

  console.log(`Found Profile: ${profile.full_name} (${profile.email})`);

  // 2. Get customer record linked to profile
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, owner_name, owner_email')
    .or(`owner_email.eq.${profile.email},owner_name.ilike.%${TARGET_NAME}%`)
    .limit(1)
    .single();

  let customerId = customer?.id;
  if (!customerId) {
      console.error(`Could not find customer record. Attempting to search by profile ID...`);
      // Try fallback to see if any store has this profile as a user role
      const { data: userRole } = await supabase.from('user_roles').select('customer_id').eq('user_id', profile.id).limit(1).single();
      if (userRole) {
        customerId = userRole.customer_id;
      } else {
        console.error(`Could not resolve customer_id for ${profile.full_name}.`);
        process.exit(1);
      }
  }

  // 3. Get the active store
  const { data: stores, error: storesErr } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('customer_id', customerId);

  if (storesErr || !stores || stores.length === 0) {
    console.error(`No stores found for customer ${customerId}`);
    process.exit(1);
  }

  const storeId = stores[0].id;
  console.log(`Targeting Store: ${stores[0].store_name} (ID: ${storeId})`);

  // --- WIPE OLD DATA --- //
  console.log('Wiping old data to prevent duplication...');
  await supabase.from('orders').delete().eq('store_id', storeId);
  await supabase.from('menu_items').delete().eq('store_id', storeId);
  await supabase.from('store_categories').delete().eq('store_id', storeId);
  await supabase.from('inventory_items').delete().eq('store_id', storeId);
  await supabase.from('pos_customers').delete().eq('store_id', storeId);
  await supabase.from('expenses').delete().eq('store_id', storeId);
  await supabase.from('credit_ledger').delete().eq('store_id', storeId);
  await supabase.from('credit_payments').delete().eq('store_id', storeId);
  await supabase.from('staff_attendance').delete().eq('store_id', storeId);

  // --- CATEGORIES --- //
  console.log('Generating Categories...');
  const categoryData = categories.map((cat, idx) => ({
    store_id: storeId,
    category_id: cat.toLowerCase().replace(/\\s+/g, '_'),
    name: cat,
    icon: '🍽️',
    color: 'blue-500',
    sort_order: idx
  }));
  await supabase.from('store_categories').insert(categoryData);

  // --- MENU ITEMS (150 Items) --- //
  console.log('Generating 150 Menu Items...');
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
  const { data: insertedMenu, error: menuErr } = await supabase.from('menu_items').insert(menuItems).select('id, name, price, category');
  if (menuErr) console.error('Menu items error:', menuErr);

  // --- INVENTORY --- //
  console.log('Generating 100 Inventory Items...');
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
  await supabase.from('inventory_items').insert(inventoryItems);

  // --- CUSTOMERS --- //
  console.log('Generating 300 Customers...');
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

  // --- STAFF ATTENDANCE --- //
  console.log('Generating Staff Attendance...');
  const staffNames = ['Rahul T.', 'Amit K.', 'Priya S.', 'Sanjay M.'];
  const attendance = [];
  const now = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    for (const staff of staffNames) {
      if (Math.random() > 0.1) { // 90% attendance
        attendance.push({
          store_id: storeId,
          staff_id: `staff_${staff.replace(/\\s/g, '')}`,
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

  // --- ORDERS, EXPENSES, CREDIT (90 Days) --- //
  console.log('Generating 90 Days of Extensive History (Orders, Expenses, Credit)...');
  const orders = [];
  const expenses = [];
  const creditLedgers = [];
  const creditPayments = [];
  const statuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'pending', 'cancelled', 'refunded'];
  const types = ['dine-in', 'takeaway', 'delivery'];
  const pmethods = ['cash', 'upi', 'card', 'credit_collected'];
  const expCategories = ['Rent', 'Salary', 'Electricity', 'Internet', 'Marketing', 'Maintenance', 'Miscellaneous', 'Supplies', 'Inventory Purchase'];

  // Helper to generate a random 90-day timestamp
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
    
    // 25-60 orders per day
    const numOrders = getRand(25, 60);
    for (let o = 0; o < numOrders; o++) {
      const orderDate = new Date(d);
      orderDate.setHours(getRand(8, 23), getRand(0, 59));
      
      const orderCust = Math.random() > 0.3 && insertedCustomers ? getRandomItem(insertedCustomers) : null;
      
      // Select 1 to 5 random items
      const numItems = getRand(1, 5);
      let subtotal = 0;
      const orderItems = [];
      for(let k=0; k<numItems; k++) {
        const menuItem = insertedMenu ? getRandomItem(insertedMenu) : { id: '1', name: 'Item', price: 200, category: 'General' };
        const qty = getRand(1, 3);
        const itemTotal = menuItem.price * qty;
        subtotal += itemTotal;
        orderItems.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: qty,
          total: itemTotal,
          category: menuItem.category
        });
      }

      const tax = Math.round(subtotal * 0.05); // 5% GST
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
        customer_name: orderCust?.name || 'Walk-in Customer',
        customer_phone: orderCust?.phone || null,
        items: orderItems,
      });

      // 10% chance to create a Khata (Credit) entry
      if (Math.random() > 0.9 && orderCust) {
        creditLedgers.push({
          store_id: storeId,
          customer_name: orderCust.name,
          customer_phone: orderCust.phone,
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

    // 2-5 expenses per day
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

  // Insert Orders
  console.log(`Inserting ${orders.length} orders... (This might take a moment)`);
  for (let i = 0; i < orders.length; i += 500) {
    const chunk = orders.slice(i, i + 500);
    const { error: orderErr } = await supabase.from('orders').insert(chunk);
    if (orderErr) console.error(`Error inserting orders chunk ${i}:`, orderErr.message);
  }

  // Insert Expenses
  console.log(`Inserting ${expenses.length} expenses...`);
  for (let i = 0; i < expenses.length; i += 500) {
    const chunk = expenses.slice(i, i + 500);
    const { error: expErr } = await supabase.from('expenses').insert(chunk);
    if (expErr) console.error(`Error inserting expenses chunk ${i}:`, expErr.message);
  }

  // Insert Credit Ledgers
  if (creditLedgers.length > 0) {
    console.log(`Inserting ${creditLedgers.length} credit ledger records...`);
    for (let i = 0; i < creditLedgers.length; i += 500) {
      const chunk = creditLedgers.slice(i, i + 500);
      const { data: insertedLedgers, error: credErr } = await supabase.from('credit_ledger').insert(chunk).select('id, due_amount');
      if (credErr) console.error(`Error inserting credit ledgers:`, credErr.message);
      
      // Add random payments to some ledgers
      if (insertedLedgers) {
        for (const l of insertedLedgers) {
          if (Math.random() > 0.5) {
            const payAmt = Math.round(l.due_amount * (Math.random() * 0.5 + 0.2)); // 20-70% payment
            creditPayments.push({
              store_id: storeId,
              credit_id: l.id,
              amount: payAmt,
              payment_method: getRandomItem(['cash', 'upi']),
              created_at: getRandPastDate().toISOString()
            });
          }
        }
      }
    }
    
    if (creditPayments.length > 0) {
      console.log(`Inserting ${creditPayments.length} credit payment records...`);
      for (let i = 0; i < creditPayments.length; i += 500) {
        const chunk = creditPayments.slice(i, i + 500);
        await supabase.from('credit_payments').insert(chunk);
      }
    }
  }

  // --- PURCHASE ORDERS (Supplier Purchases) --- //
  console.log('Generating Purchase Orders...');
  const purchaseOrders = [];
  for (let i = 0; i < 30; i++) { // 30 purchase orders across 90 days
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
  // Try inserting into purchase_orders if it exists, wrap in try-catch in case it's a view or unsupported in current schema
  try {
    const { error: poErr } = await supabase.from('purchase_orders').insert(purchaseOrders);
    if (poErr) console.log('Notice: purchase_orders table might not exist or schema differs. Skipping PO insertion.');
  } catch(e) {
    console.log('Notice: purchase_orders table not available.');
  }

  console.log('✅ Demo Data Generation Complete! 90 days of extensive history created for all modules.');
  console.log(`Run 'npm run dev' and login to the wasimrafik account to verify the populated Dashboards, Reports, Inventory, and CRM.`);
};

main().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
