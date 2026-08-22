require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Data:', data);
  }
}
run();
