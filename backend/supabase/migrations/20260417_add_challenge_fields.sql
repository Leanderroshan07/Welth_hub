-- Add challenge-specific fields to financial_tasks
ALTER TABLE IF EXISTS public.financial_tasks
  ADD COLUMN IF NOT EXISTS challenge_duration_days integer,
  ADD COLUMN IF NOT EXISTS challenge_end_date date;

-- Add constraints for challenge fields
DO $$
BEGIN
  ALTER TABLE public.financial_tasks
    ADD CONSTRAINT financial_tasks_challenge_duration_check
    CHECK (challenge_duration_days IS NULL OR (challenge_duration_days > 0 AND challenge_duration_days <= 365));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.financial_tasks
    ADD CONSTRAINT financial_tasks_challenge_end_date_check
    CHECK (task_type != 'challenge' OR challenge_end_date IS NOT NULL);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure user_id is present for task tracking
ALTER TABLE IF EXISTS public.financial_tasks
  ADD COLUMN IF NOT EXISTS user_id text;

CREATE INDEX IF NOT EXISTS financial_tasks_user_id_idx
  ON public.financial_tasks (user_id asc);

CREATE INDEX IF NOT EXISTS financial_tasks_task_type_idx
  ON public.financial_tasks (task_type asc);

CREATE INDEX IF NOT EXISTS financial_tasks_challenge_end_date_idx
  ON public.financial_tasks (challenge_end_date asc);
