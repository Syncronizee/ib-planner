PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS weekly_priorities (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  priority_number INTEGER NOT NULL CHECK (priority_number BETWEEN 1 AND 3),
  title TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  scheduled_day INTEGER CHECK (scheduled_day BETWEEN 0 AND 6 OR scheduled_day IS NULL),
  scheduled_start_time TEXT,
  scheduled_end_time TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  reflection_rating INTEGER CHECK (reflection_rating BETWEEN 1 AND 4 OR reflection_rating IS NULL),
  reflection_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  UNIQUE(user_id, week_start, priority_number)
);

CREATE INDEX IF NOT EXISTS idx_weekly_priorities_user_week ON weekly_priorities(user_id, week_start DESC);

INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '004');
INSERT OR IGNORE INTO _migrations (name) VALUES ('004_weekly_priorities');
