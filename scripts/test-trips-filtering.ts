import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const userId = 'b0000000-0000-4000-8000-000000000004'; // Alex's user ID
  const { data, error } = await supabase
      .from('bookings')
      .select('*, boats(name), marinas(name, slug, logo_url, timezone), customers!inner(user_id), reviews(rating), booking_addons(total_price, addon_catalog(name))')
      .eq('customers.user_id', userId)
      .order('start_at', { ascending: false });
      
  if (error) {
    console.error("Query Error:", error);
    return;
  }
  
  if (data) {
    const now = new Date();
    const upcoming = data.filter(d => new Date(d.start_at) >= now && d.status !== 'cancelled');
    const past = data.filter(d => new Date(d.start_at) < now || d.status === 'cancelled');
    
    console.log(`Upcoming: ${upcoming.length}`);
    console.log(`Past: ${past.length}`);
  }
}

main();
