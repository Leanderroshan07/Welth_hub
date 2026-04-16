-- Migration: Add start_time column to financial_tasks

do $$
begin
  alter table public.financial_tasks 
    add column start_time time;
exception
  when duplicate_column then null;
end $$;

-- Create index for start_time queries
create index if not exists financial_tasks_start_time_idx
  on public.financial_tasks (start_time);
