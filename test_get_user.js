const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
// just see what happens if we pass a random token
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
