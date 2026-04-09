-- Create financial_tasks table
create table if not exists public.financial_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  task_date date not null,
  task_time time,
  due_date date not null,
  due_time time,
  task_type text not null default 'task',
  completed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_tasks_task_type_check check (task_type in ('routine', 'task', 'challenge'))
);

create index if not exists financial_tasks_due_date_idx
  on public.financial_tasks (due_date asc);

create index if not exists financial_tasks_completed_idx
  on public.financial_tasks (completed asc);

alter table public.financial_tasks enable row level security;

do $$
begin
  create policy "public read financial_tasks"
    on public.financial_tasks
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public insert financial_tasks"
    on public.financial_tasks
    for insert
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public update financial_tasks"
    on public.financial_tasks
    for update
    using (true)
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public delete financial_tasks"
    on public.financial_tasks
    for delete
    using (true);
exception
  when duplicate_object then null;
end $$;
