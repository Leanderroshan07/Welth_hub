-- Migration: Add telegram_user_id to financial_tasks for Telegram-based users

ALTER TABLE public.financial_tasks
  ADD COLUMN IF NOT EXISTS telegram_user_id bigint DEFAULT NULL;

-- Backfill numeric values from existing user_id (if any are numeric strings)
-- This will only update rows where user_id text is all digits.
UPDATE public.financial_tasks
SET telegram_user_id = (user_id::text)::bigint
WHERE user_id IS NOT NULL AND (user_id::text) ~ '^[0-9]+$';

CREATE INDEX IF NOT EXISTS financial_tasks_telegram_user_id_idx
  ON public.financial_tasks (telegram_user_id ASC);

-- Note: Do NOT drop or alter the existing `user_id` column here.
-- Use the new `telegram_user_id` field in backend code when storing Telegram numeric IDs.
