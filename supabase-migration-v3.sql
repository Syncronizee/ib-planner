-- ============================================
-- IB Planner: Scheduling + School Events Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1) Scheduled study sessions
CREATE TABLE IF NOT EXISTS scheduled_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_suggestion TEXT,
  duration_goal_minutes INTEGER,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  session_type TEXT NOT NULL CHECK (session_type IN ('new_content', 'practice', 'review', 'passive')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled sessions"
  ON scheduled_study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled sessions"
  ON scheduled_study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled sessions"
  ON scheduled_study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled sessions"
  ON scheduled_study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- 2) School events
CREATE TABLE IF NOT EXISTS school_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN NOT NULL DEFAULT true,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own school events"
  ON school_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own school events"
  ON school_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own school events"
  ON school_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own school events"
  ON school_events FOR DELETE
  USING (auth.uid() = user_id);

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_study_sessions_user_date
  ON scheduled_study_sessions(user_id, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_school_events_user_date
  ON school_events(user_id, event_date);
