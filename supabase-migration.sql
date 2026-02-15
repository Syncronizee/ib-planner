-- ============================================
-- IB Planner: Energy-Based Study Features Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Energy Check-ins Table
CREATE TABLE IF NOT EXISTS energy_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE energy_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own energy checkins"
  ON energy_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own energy checkins"
  ON energy_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own energy checkins"
  ON energy_checkins FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Weekly Plans Table
CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  hardest_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  weakest_subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  hardest_task_scheduled_time TIMESTAMPTZ,
  weakest_subject_scheduled_time TIMESTAMPTZ,
  hardest_task_completed BOOLEAN NOT NULL DEFAULT false,
  weakest_subject_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly plans"
  ON weekly_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly plans"
  ON weekly_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly plans"
  ON weekly_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly plans"
  ON weekly_plans FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Study Sessions Table
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  session_type TEXT NOT NULL CHECK (session_type IN ('new_content', 'practice', 'review', 'passive')),
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Add completed_at to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 5. Add energy_level to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS energy_level TEXT CHECK (energy_level IN ('high', 'medium', 'low') OR energy_level IS NULL);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_energy_checkins_user_id ON energy_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_energy_checkins_timestamp ON energy_checkins(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_id ON weekly_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_week ON weekly_plans(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started ON study_sessions(user_id, started_at DESC);
