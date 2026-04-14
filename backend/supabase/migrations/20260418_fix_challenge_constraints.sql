-- Remove problematic constraints to allow all task types
ALTER TABLE IF EXISTS public.financial_tasks
  DROP CONSTRAINT IF EXISTS financial_tasks_challenge_end_date_check;

ALTER TABLE IF EXISTS public.financial_tasks
  DROP CONSTRAINT IF EXISTS financial_tasks_challenge_duration_check;

ALTER TABLE IF EXISTS public.financial_tasks
  DROP CONSTRAINT IF EXISTS financial_tasks_challenge_date_logic;

-- Ensure all challenge columns are nullable (they will be NULL for non-challenge tasks)
ALTER TABLE IF EXISTS public.financial_tasks
  ALTER COLUMN challenge_duration_days DROP NOT NULL;

ALTER TABLE IF EXISTS public.financial_tasks
  ALTER COLUMN challenge_end_date DROP NOT NULL;

-- Re-add simple duration check: if NOT NULL, must be 1-365
DO $$
BEGIN
  ALTER TABLE public.financial_tasks
    ADD CONSTRAINT financial_tasks_challenge_duration_range_check
    CHECK (challenge_duration_days IS NULL OR (challenge_duration_days > 0 AND challenge_duration_days <= 365));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS financial_tasks_user_id_idx
  ON public.financial_tasks (user_id asc);

CREATE INDEX IF NOT EXISTS financial_tasks_task_type_idx
  ON public.financial_tasks (task_type asc);

CREATE INDEX IF NOT EXISTS financial_tasks_challenge_end_date_idx
  ON public.financial_tasks (challenge_end_date asc);
