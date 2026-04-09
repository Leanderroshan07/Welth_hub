-- Add routine schedule customization fields to financial_tasks.
alter table if exists public.financial_tasks
  add column if not exists routine_frequency text,
  add column if not exists routine_days text[] not null default '{}'::text[],
  add column if not exists routine_month_day integer;

do $$
begin
  alter table public.financial_tasks
    add constraint financial_tasks_routine_frequency_check
    check (routine_frequency is null or routine_frequency in ('daily', 'weekly', 'monthly'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.financial_tasks
    add constraint financial_tasks_routine_month_day_check
    check (routine_month_day is null or (routine_month_day between 1 and 31));
exception
  when duplicate_object then null;
end $$;