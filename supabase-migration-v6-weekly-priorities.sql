CREATE TABLE IF NOT EXISTS public.weekly_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  priority_number INTEGER NOT NULL CHECK (priority_number BETWEEN 1 AND 3),
  title TEXT NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  task_category TEXT NOT NULL DEFAULT 'project',
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  scheduled_day INTEGER CHECK (scheduled_day BETWEEN 0 AND 6 OR scheduled_day IS NULL),
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  reflection_rating INTEGER CHECK (reflection_rating BETWEEN 1 AND 4 OR reflection_rating IS NULL),
  reflection_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start, priority_number)
);

ALTER TABLE public.weekly_priorities
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

ALTER TABLE public.weekly_priorities
  ADD COLUMN IF NOT EXISTS task_category TEXT NOT NULL DEFAULT 'project';

ALTER TABLE public.weekly_priorities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'weekly_priorities'
      AND policyname = 'Users can manage own weekly_priorities'
  ) THEN
    CREATE POLICY "Users can manage own weekly_priorities" ON public.weekly_priorities
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_weekly_priorities_user_week
  ON public.weekly_priorities(user_id, week_start);
