import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kqoveyroyhfbcdedyzop.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is required to bypass RLS and delete demo data.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const TARGET_EMAIL = 'wasimrafik@gmail.com';

const main = async () => {
  console.log(`Starting Demo Data Removal for ${TARGET_EMAIL}...`);

  // 1. Get user profile
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email', TARGET_EMAIL)
    .single();

  if (profileErr || !profile) {
    console.error(`Profile not found for ${TARGET_EMAIL}`, profileErr);
    process.exit(1);
  }

  // 2. Get customer record linked to profile
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id')
    .eq('owner_email', TARGET_EMAIL)
    .single();

  let customerId = customer?.id;
  if (!customerId) {
      console.error(`Could not find customer with owner_email = ${TARGET_EMAIL}.`);
      process.exit(1);
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

  console.log('Wiping all demo data for this store...');
  
  // Delete orders
  const { error: err1 } = await supabase.from('orders').delete().eq('store_id', storeId);
  if (err1) console.error('Error deleting orders:', err1);
  else console.log('Orders deleted.');

  // Delete menu items
  const { error: err2 } = await supabase.from('menu_items').delete().eq('store_id', storeId);
  if (err2) console.error('Error deleting menu items:', err2);
  else console.log('Menu items deleted.');

  // Delete inventory
  const { error: err3 } = await supabase.from('inventory_items').delete().eq('store_id', storeId);
  if (err3) console.error('Error deleting inventory:', err3);
  else console.log('Inventory items deleted.');

  // Delete customers
  const { error: err4 } = await supabase.from('pos_customers').delete().eq('store_id', storeId);
  if (err4) console.error('Error deleting customers:', err4);
  else console.log('POS customers deleted.');

  // Delete expenses
  const { error: err5 } = await supabase.from('expenses').delete().eq('store_id', storeId);
  if (err5) console.error('Error deleting expenses:', err5);
  else console.log('Expenses deleted.');

  // Delete compliance items
  const { error: err6 } = await supabase.from('compliance_items').delete().eq('store_id', storeId);
  if (err6) console.error('Error deleting compliance items:', err6);
  else console.log('Compliance items deleted.');

  // Delete staff metrics
  const { error: err7 } = await supabase.from('staff_metrics').delete().eq('store_id', storeId);
  if (err7) console.error('Error deleting staff metrics:', err7);
  else console.log('Staff metrics deleted.');

  // Delete purchase orders
  const { error: err8 } = await supabase.from('purchase_orders').delete().eq('store_id', storeId);
  if (err8) console.error('Error deleting purchase orders:', err8);
  else console.log('Purchase orders deleted.');

  console.log('✅ Demo Data Removal Complete! All data wiped.');
};

main();
