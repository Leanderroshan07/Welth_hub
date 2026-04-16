-- Migration: Add support for account-to-account transfers (not just to sub-accounts)

do $$
begin
  alter table public.ledger_entries 
    add column to_account text references public.accounts(name) on delete set null;
exception
  when duplicate_column then null;
end $$;

-- Create index for to_account lookups
create index if not exists ledger_entries_to_account_idx
  on public.ledger_entries (to_account);
