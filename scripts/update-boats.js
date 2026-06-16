require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('boats').update({ min_booking_hours: 2 }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) console.error(error);
  else console.log('Successfully updated boats to 2 hours minimum booking!');
}
run();
