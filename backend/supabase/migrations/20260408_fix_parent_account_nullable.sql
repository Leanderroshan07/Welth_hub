-- Fix parent_account_id to allow NULL values in sub_accounts table
ALTER TABLE public.sub_accounts
ALTER COLUMN parent_account_id DROP NOT NULL;
