import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
      .from('bookings')
      .select('id, start_at, status, customers(user_id)');
  if (error) console.error(error);
  console.log("Bookings count:", data?.length);
  if (data) {
    const past = data.filter(d => new Date(d.start_at) < new Date());
    console.log("Past bookings count:", past.length);
    console.log("Past booking sample:", past.slice(0, 2));
  }
}

main();
