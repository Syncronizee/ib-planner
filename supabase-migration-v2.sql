-- ============================================
-- IB Planner: Focus Session Feature Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Add new columns to study_sessions table
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS duration_goal_minutes INTEGER;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS productivity_rating TEXT CHECK (productivity_rating IN ('good', 'okay', 'poor') OR productivity_rating IS NULL);
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS session_status TEXT CHECK (session_status IN ('completed', 'abandoned') OR session_status IS NULL);
