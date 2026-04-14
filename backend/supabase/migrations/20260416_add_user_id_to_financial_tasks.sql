-- Add user_id to financial_tasks for multi-user support
alter table public.financial_tasks
add column if not exists user_id uuid default null;

-- Create index for user queries
create index if not exists financial_tasks_user_id_idx
  on public.financial_tasks (user_id asc);

-- Update RLS policies to include user_id
drop policy if exists "public read financial_tasks" on public.financial_tasks;
drop policy if exists "public insert financial_tasks" on public.financial_tasks;
drop policy if exists "public update financial_tasks" on public.financial_tasks;
drop policy if exists "public delete financial_tasks" on public.financial_tasks;

do $$
begin
  create policy "users can read own financial_tasks"
    on public.financial_tasks
    for select
    using (user_id is null or user_id::text = current_user_id());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "users can insert own financial_tasks"
    on public.financial_tasks
    for insert
    with check (user_id is null or user_id::text = current_user_id());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "users can update own financial_tasks"
    on public.financial_tasks
    for update
    using (user_id is null or user_id::text = current_user_id())
    with check (user_id is null or user_id::text = current_user_id());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "users can delete own financial_tasks"
    on public.financial_tasks
    for delete
    using (user_id is null or user_id::text = current_user_id());
exception
  when duplicate_object then null;
end $$;
