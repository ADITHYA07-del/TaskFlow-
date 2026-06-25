const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_KEY environment variables are not set.');
}

const supabase = createClient(
  supabaseUrl || 'https://your-supabase-url.supabase.co',
  supabaseKey || 'your-supabase-key'
);

module.exports = supabase;
