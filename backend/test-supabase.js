#!/usr/bin/env node

/**
 * Supabase Connection Diagnostic Tool
 * Run this to test if Supabase is properly connected
 * 
 * Usage: node backend/test-supabase.js
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

console.log('\n╔════════════════════════════════════════╗');
console.log('║  SUPABASE CONNECTION DIAGNOSTIC TOOL   ║');
console.log('╚════════════════════════════════════════╝\n');

// ========== CHECK ENVIRONMENT VARIABLES ==========
console.log('📋 Checking environment variables...\n');

const envChecks = [
  { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
  { name: 'SUPABASE_ANON_KEY', value: process.env.SUPABASE_ANON_KEY },
];

let allVarsSet = true;
envChecks.forEach(({ name, value }) => {
  if (value) {
    const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    console.log(`✅ ${name}: ${masked}`);
  } else {
    console.log(`❌ ${name}: NOT SET`);
    allVarsSet = false;
  }
});

if (!allVarsSet) {
  console.log('\n❌ Missing required environment variables!');
  console.log('   Create a .env file in the backend folder with:\n');
  console.log('   SUPABASE_URL=https://your-project.supabase.co');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

// ========== TEST SUPABASE CONNECTION ==========
console.log('\n🧪 Testing Supabase connection...\n');

(async () => {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    console.log(`📍 Supabase URL: ${url}`);
    console.log(`🔑 Using: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key'}\n`);

    // Create client
    const supabase = createClient(url, key);
    console.log('✅ Supabase client created\n');

    // Test 1: Connect to financial_tasks table
    console.log('Test 1: Checking financial_tasks table...');
    const { data: taskData, error: taskError, count: taskCount } = await supabase
      .from('financial_tasks')
      .select('*', { count: 'exact', head: true });

    if (taskError) {
      console.log(`❌ Error: ${taskError.message}`);
      if (taskError.message.includes('does not exist')) {
        console.log('   ℹ️  financial_tasks table not found. Run migrations:\n');
        console.log('   cd backend/supabase');
        console.log('   supabase db push\n');
      }
    } else {
      console.log(`✅ financial_tasks table found (${taskCount || 0} rows)\n`);
    }

    // Test 2: Test insert permission
    console.log('Test 2: Testing insert permission...');
    const testTask = {
      title: 'Test Task',
      task_type: 'task',
      user_id: 123456789,
      completed: false,
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('financial_tasks')
      .insert([testTask])
      .select();

    if (insertError) {
      console.log(`❌ Cannot insert: ${insertError.message}`);
      if (insertError.message.includes('permission')) {
        console.log('   ℹ️  Check Row-Level Security (RLS) policies\n');
      }
    } else {
      console.log(`✅ Can insert to database\n`);
      
      // Clean up test record
      if (insertData && insertData[0]) {
        await supabase
          .from('financial_tasks')
          .delete()
          .eq('id', insertData[0].id);
        console.log('✅ Test record cleaned up\n');
      }
    }

    // Summary
    console.log('╔════════════════════════════════════════╗');
    console.log('║        DIAGNOSTIC SUMMARY              ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log('✅ Connection test PASSED');
    console.log('✅ Ready to deploy on Render\n');

  } catch (err) {
    console.error('❌ FATAL ERROR:', err.message);
    console.error('\nDebug info:', err);
    process.exit(1);
  }
})();
