require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Use service role key for server-side operations (preferred)
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

console.log('\n=== SUPABASE CONNECTION INFO ===');
console.log(`📍 Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ MISSING'}`);
console.log(`🔑 Service Role Key: ${supabaseServiceRoleKey ? '✅ Set' : '⚠️  Not set (will try Anon Key)'}`);
console.log(`🔑 Anon Key: ${supabaseAnonKey ? '✅ Set' : '❌ MISSING'}`);
console.log(`🔐 Using: ${supabaseServiceRoleKey ? 'Service Role Key (recommended for server)' : 'Anon Key'}`);

if (!supabaseUrl) {
  const err = new Error('❌ FATAL: Missing SUPABASE_URL environment variable');
  console.error(err.message);
  throw err;
}

if (!supabaseKey) {
  const err = new Error('❌ FATAL: Missing both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY');
  console.error(err.message);
  throw err;
}

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized successfully\n');
  module.exports = { supabase };
} catch (err) {
  console.error('❌ Failed to create Supabase client:', err.message);
  throw err;
}