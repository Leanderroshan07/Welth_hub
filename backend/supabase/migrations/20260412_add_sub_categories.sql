create table if not exists public.sub_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create index if not exists sub_categories_created_at_idx
  on public.sub_categories (created_at asc);

create index if not exists sub_categories_category_id_idx
  on public.sub_categories (category_id asc);

alter table if exists public.ledger_entries
  add column if not exists sub_category_id uuid references public.sub_categories(id) on delete set null;

alter table public.sub_categories enable row level security;

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
