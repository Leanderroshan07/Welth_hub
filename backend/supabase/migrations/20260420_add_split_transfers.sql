-- Migration: Add split transfer support for main accounts and sub-accounts

do $$
begin
  create type public.transfer_split_type as enum ('cash', 'bank');
exception
  when duplicate_object then null;
end $$;

-- Add transfer_split_details table to track cash vs bank splits
create table if not exists public.transfer_split_details (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.ledger_entries(id) on delete cascade,
  split_type public.transfer_split_type not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Add columns to ledger_entries for enhanced transfer tracking
do $$
begin
  alter table public.ledger_entries 
    add column to_sub_account_id uuid references public.sub_accounts(id) on delete set null;
  alter table public.ledger_entries 
    add column from_sub_account_id uuid references public.sub_accounts(id) on delete set null;
  alter table public.ledger_entries 
    add column is_split_transfer boolean default false;
  alter table public.ledger_entries 
    add column split_note text;
exception
  when duplicate_column then null;
end $$;

-- Create index for transfer splits
create index if not exists transfer_split_details_transfer_id_idx
  on public.transfer_split_details (transfer_id);

-- Enable RLS on transfer_split_details
alter table public.transfer_split_details enable row level security;

-- Create RLS policies for transfer_split_details
do $$
begin
  create policy "public read transfer split details"
    on public.transfer_split_details
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public insert transfer split details"
    on public.transfer_split_details
    for insert
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public update transfer split details"
    on public.transfer_split_details
    for update
    using (true)
    with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "public delete transfer split details"
    on public.transfer_split_details
    for delete
    using (true);
exception
  when duplicate_object then null;
end $$;
