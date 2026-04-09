-- Replace the legacy priority column with task_type on financial_tasks.
alter table if exists public.financial_tasks
  add column if not exists task_type text;

update public.financial_tasks
set task_type = coalesce(task_type, 'task')
where task_type is null;

alter table public.financial_tasks
  alter column task_type set default 'task';

alter table public.financial_tasks
  alter column task_type set not null;

do $$
begin
  alter table public.financial_tasks
    add constraint financial_tasks_task_type_check
    check (task_type in ('routine', 'task', 'challenge'));
exception
  when duplicate_object then null;
end $$;

alter table if exists public.financial_tasks
  drop column if exists priority;