-- Migration: Link goals to sub-accounts for automatic progress tracking
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS goals_sub_account_id_idx
  ON public.goals (sub_account_id);
