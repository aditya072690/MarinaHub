import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  const email = 'alex.rivera@demo.com';
  const password = 'DemoMarina2026!'; // Default password from seed
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }
  
  const userId = authData.user.id;
  console.log("Logged in as:", userId);

  const { data, error } = await supabase
      .from('bookings')
      .select('*, boats(name), marinas(name, slug, logo_url, timezone), customers!inner(user_id), reviews(rating), booking_addons(total_price, addon_catalog(name))')
      .eq('customers.user_id', userId)
      .order('start_at', { ascending: false });
      
  if (error) {
    console.error("Query Error:", error);
    return;
  }
  
  console.log(`Success! Found ${data.length} records.`);
}

main();
