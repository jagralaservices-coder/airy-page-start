import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kqoveyroyhfbcdedyzop.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxb3ZleXJveWhmYmNkZWR5em9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNTQ0MzksImV4cCI6MjA4MzgzMDQzOX0.nkCNw8Rp7uzqb_BNMVuUoxnQ__1CzQYT2rXS7yj7ZV0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const wipe = async () => {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'owner@gmail.com',
    password: '253422'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  
  console.log("Logged in successfully. Getting stores...");

  const { data: stores } = await supabase.from('stores').select('id, store_name');
  if (!stores || stores.length === 0) {
    console.log("No stores found.");
    return;
  }

  for (const store of stores) {
    console.log(`Wiping orders for store: ${store.store_name} (${store.id})`);
    
    await supabase.from('orders').delete().eq('store_id', store.id);
    await supabase.from('online_orders').delete().eq('store_id', store.id);
    await supabase.from('qr_orders').delete().eq('store_id', store.id);
    await supabase.from('credit_ledger').delete().eq('store_id', store.id);
    await supabase.from('credit_payments').delete().eq('store_id', store.id);
    
    console.log("Done for store", store.store_name);
  }
  console.log("Wipe complete!");
};

wipe();
