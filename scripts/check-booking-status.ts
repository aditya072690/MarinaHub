import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
      .from('bookings')
      .select('id, status, payment_status, stripe_session_id');
      
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  const relevant = data?.filter(b => b.id.startsWith('fd9ffcbb') || b.id.startsWith('2fb53a77') || b.id.startsWith('2f2fef7c'));
  console.log("Bookings:", relevant);
}

main();
