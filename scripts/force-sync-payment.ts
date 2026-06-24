import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const ids = [
    '2f2fef7c-1a15-4d6e-8dd2-b378e36aa645',
    'fd9ffcbb-a812-4631-b474-9560567769b7',
    '2fb53a77-3fb9-45e1-a615-9a4f8d8b9ece'
  ];
  
  for (const id of ids) {
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed', 
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        ticket_token: 'ticket_' + Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7)
      })
      .eq('id', id);
      
    if (error) {
      console.error(`Error updating ${id}:`, error);
    } else {
      console.log(`Successfully marked booking ${id} as paid and confirmed.`);
    }
  }
}

main();
