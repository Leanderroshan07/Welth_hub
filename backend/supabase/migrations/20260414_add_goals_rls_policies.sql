-- Migration: Add RLS policies for goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "public read goals"
    ON public.goals
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "public insert goals"
    ON public.goals
    FOR INSERT
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "public update goals"
    ON public.goals
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "public delete goals"
    ON public.goals
    FOR DELETE
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
