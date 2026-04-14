-- Add user_id to financial_tasks for multi-user support
alter table public.financial_tasks
add column if not exists user_id uuid default null;

-- Create index for user queries
create index if not exists financial_tasks_user_id_idx
  on public.financial_tasks (user_id asc);

-- Allow all data to be read/written (simplified - no RLS for now)
-- This prevents the current_user_id() error while maintaining basic functionality
-- RLS can be added later when auth is properly configured
