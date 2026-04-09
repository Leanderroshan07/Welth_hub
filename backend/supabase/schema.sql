create extension if not exists pgcrypto;

do $$
begin
  create type public.ledger_entry_type as enum ('income', 'expense', 'transfer');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type public.ledger_entry_type not null,
  amount numeric(12,2) not null check (amount > 0),
  account_name text,
  from_account text,
  to_account text,
  category text,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ledger_entries_shape check (
    (
      entry_type = 'transfer'
      and from_account is not null
      and to_account is not null
      and account_name is null
    )
    or
    (
      entry_type in ('income', 'expense')
      and account_name is not null
      and from_account is null
      and to_account is null
    )
  )
);

create index if not exists ledger_entries_occurred_at_idx
  on public.ledger_entries (occurred_at desc);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  opening_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists accounts_created_at_idx
  on public.accounts (created_at asc);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists categories_created_at_idx
  on public.categories (created_at asc);

create table if not exists public.sub_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  opening_balance numeric(12,2) not null default 0,
  parent_account_id uuid default null references public.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sub_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create index if not exists sub_accounts_created_at_idx
  on public.sub_accounts (created_at asc);

create index if not exists sub_accounts_parent_account_id_idx
  on public.sub_accounts (parent_account_id asc);

create index if not exists sub_categories_created_at_idx
  on public.sub_categories (created_at asc);

create index if not exists sub_categories_category_id_idx
  on public.sub_categories (category_id asc);

insert into public.accounts (name, opening_balance)
values ('Cash', 0), ('Bank', 0)
on conflict (name) do nothing;

insert into public.categories (name)
values ('Food'), ('Movie')
on conflict (name) do nothing;

insert into public.sub_categories (name, category_id)
select sub.name, categories.id
from (
  values
    ('Food', 'Groceries'),
    ('Food', 'Restaurant'),
    ('Movie', 'Tickets')
) as sub(category_name, name)
join public.categories categories
  on categories.name = sub.category_name
on conflict (category_id, name) do nothing;

alter table public.ledger_entries enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.sub_accounts enable row level security;
alter table public.sub_categories enable row level security;

do $$
begin
  create policy "public read ledger entries"
    on public.ledger_entries
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public insert ledger entries"
    on public.ledger_entries
    for insert
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public update ledger entries"
    on public.ledger_entries
    for update
    using (true)
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public delete ledger entries"
    on public.ledger_entries
    for delete
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public read accounts"
    on public.accounts
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public insert accounts"
    on public.accounts
    for insert
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public update accounts"
    on public.accounts
    for update
    using (true)
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public delete accounts"
    on public.accounts
    for delete
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public read categories"
    on public.categories
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public insert categories"
    on public.categories
    for insert
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public update categories"
    on public.categories
    for update
    using (true)
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public delete categories"
    on public.categories
    for delete
    using (true);
exception
  when duplicate_object then null;
end $$;

-- Add new columns to ledger_entries if they don't exist
alter table if exists public.ledger_entries
  add column if not exists sub_account_id uuid references public.sub_accounts(id) on delete set null;

alter table if exists public.ledger_entries
  add column if not exists sub_category_id uuid references public.sub_categories(id) on delete set null;

do $$
begin
  create policy "public read sub_accounts"
    on public.sub_accounts
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public insert sub_accounts"
    on public.sub_accounts
    for insert
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public update sub_accounts"
    on public.sub_accounts
    for update
    using (true)
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public delete sub_accounts"
    on public.sub_accounts
    for delete
    using (true);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.financial_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  task_date date not null,
  task_time time,
  due_date date not null,
  due_time time,
  task_type text not null default 'task',
  routine_frequency text,
  routine_days text[] not null default '{}'::text[],
  routine_month_day integer,
  completed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_tasks_task_type_check check (task_type in ('routine', 'task', 'challenge')),
  constraint financial_tasks_routine_frequency_check check (
    routine_frequency is null or routine_frequency in ('daily', 'weekly', 'monthly')
  ),
  constraint financial_tasks_routine_month_day_check check (
    routine_month_day is null or (routine_month_day between 1 and 31)
  )
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

do $$
begin
  create policy "public read sub_categories"
    on public.sub_categories
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public insert sub_categories"
    on public.sub_categories
    for insert
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public update sub_categories"
    on public.sub_categories
    for update
    using (true)
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public delete sub_categories"
    on public.sub_categories
    for delete
    using (true);
exception
  when duplicate_object then null;
end $$;