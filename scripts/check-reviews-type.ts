import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
      .from('bookings')
      .select('id, reviews(rating)')
      .not('reviews', 'is', null)
      .limit(1);
      
  if (error) {
    console.error("Query Error:", error);
    return;
  }
  
  console.log("Bookings with reviews:", data);
}

main();
