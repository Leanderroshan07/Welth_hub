// Goal module for CRUD operations
const { supabase } = require('./supabaseClient');

async function createGoal(goal) {
  const { data, error } = await supabase
    .from('goals')
    .insert([goal])
    .select();
  if (error) throw error;
  return data[0];
}

async function getGoals(user_id) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function updateGoal(id, updates) {
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
}

async function deleteGoal(id) {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

module.exports = { createGoal, getGoals, updateGoal, deleteGoal };