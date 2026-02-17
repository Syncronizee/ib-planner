PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS _sync_state (
  user_id TEXT PRIMARY KEY,
  last_sync_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('HL', 'SL')),
  color TEXT NOT NULL,
  current_grade INTEGER,
  target_grade INTEGER,
  predicted_grade INTEGER,
  confidence INTEGER NOT NULL DEFAULT 3,
  teacher_name TEXT,
  teacher_email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL CHECK (category IN ('homework', 'assessment', 'college_prep', 'personal', 'project', 'revision', 'other')),
  is_completed INTEGER NOT NULL DEFAULT 0,
  linked_assessment_id TEXT REFERENCES assessments(id) ON DELETE SET NULL,
  completed_at TEXT,
  energy_level TEXT CHECK (energy_level IN ('high', 'medium', 'low') OR energy_level IS NULL),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IA', 'test', 'exam', 'quiz', 'essay', 'presentation', 'project', 'homework', 'other')),
  score REAL,
  max_score REAL,
  percentage REAL,
  weight REAL,
  date TEXT,
  notes TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  linked_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS grade_history (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL,
  grade_type TEXT NOT NULL CHECK (grade_type IN ('current', 'predicted', 'test', 'exam', 'assignment')),
  label TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  name TEXT,
  color TEXT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS study_resources (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'article', 'pdf', 'website', 'book', 'other')),
  url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS syllabus_topics (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  unit_number INTEGER,
  is_completed INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 3,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS weakness_tags (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  description TEXT,
  weakness_type TEXT NOT NULL CHECK (weakness_type IN ('content', 'logic')),
  is_resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  error_description TEXT NOT NULL,
  correction TEXT,
  error_type TEXT NOT NULL CHECK (error_type IN ('content_gap', 'logic_gap', 'careless')),
  source TEXT,
  date TEXT NOT NULL,
  is_resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES syllabus_topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  plain_text TEXT,
  has_drawing INTEGER NOT NULL DEFAULT 0,
  drawing_data TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS note_images (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS energy_checkins (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  hardest_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  weakest_subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  hardest_task_scheduled_time TEXT,
  weakest_subject_scheduled_time TEXT,
  hardest_task_completed INTEGER NOT NULL DEFAULT 0,
  weakest_subject_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  objective TEXT,
  duration_minutes INTEGER NOT NULL,
  duration_goal_minutes INTEGER,
  actual_duration_minutes INTEGER,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  session_type TEXT NOT NULL CHECK (session_type IN ('new_content', 'practice', 'review', 'passive')),
  productivity_rating TEXT CHECK (productivity_rating IN ('good', 'okay', 'poor') OR productivity_rating IS NULL),
  session_status TEXT CHECK (session_status IN ('completed', 'abandoned') OR session_status IS NULL),
  notes TEXT,
  started_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS scheduled_study_sessions (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  objective TEXT,
  task_suggestion TEXT,
  duration_goal_minutes INTEGER,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  session_type TEXT NOT NULL CHECK (session_type IN ('new_content', 'practice', 'review', 'passive')),
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS school_events (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  all_day INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS cas_experiences (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  is_creativity INTEGER NOT NULL DEFAULT 0,
  is_activity INTEGER NOT NULL DEFAULT 0,
  is_service INTEGER NOT NULL DEFAULT 0,
  is_cas_project INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS cas_reflections (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  experience_id TEXT REFERENCES cas_experiences(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS cas_experience_outcomes (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  experience_id TEXT REFERENCES cas_experiences(id) ON DELETE CASCADE,
  outcome_number INTEGER NOT NULL CHECK (outcome_number BETWEEN 1 AND 7),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tok_essays (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  prescribed_title TEXT,
  thesis TEXT,
  outline TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'planning', 'drafting', 'revising', 'complete')),
  word_count INTEGER NOT NULL DEFAULT 0,
  deadline TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tok_exhibitions (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'selecting_objects', 'writing_commentaries', 'complete')),
  deadline TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tok_exhibition_objects (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  exhibition_id TEXT REFERENCES tok_exhibitions(id) ON DELETE CASCADE,
  object_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  commentary TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tok_knowledge_questions (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  aok TEXT NOT NULL DEFAULT '[]',
  wok TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tok_notes (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('aok', 'wok')),
  category_name TEXT NOT NULL,
  content TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tok_prompts (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE,
  user_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('essay', 'exhibition')),
  prompt TEXT NOT NULL,
  year TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  synced_at TEXT,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_dirty ON subjects(user_id, is_dirty);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_dirty ON tasks(user_id, is_dirty);
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_dirty ON assessments(user_id, is_dirty);
CREATE INDEX IF NOT EXISTS idx_assessments_subject_id ON assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_user_id ON grade_history(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_user_id ON timetable_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_study_resources_user_id ON study_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_user_id ON syllabus_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_weakness_tags_user_id ON weakness_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_note_images_user_id ON note_images(user_id);
CREATE INDEX IF NOT EXISTS idx_energy_checkins_user_ts ON energy_checkins(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week ON weekly_plans(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started ON study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_dirty ON study_sessions(user_id, is_dirty);
CREATE INDEX IF NOT EXISTS idx_scheduled_study_sessions_user_for ON scheduled_study_sessions(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_school_events_user_date ON school_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_cas_experiences_user_id ON cas_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_tok_essays_user_id ON tok_essays(user_id);
CREATE INDEX IF NOT EXISTS idx_tok_exhibitions_user_id ON tok_exhibitions(user_id);
CREATE INDEX IF NOT EXISTS idx_tok_kq_user_id ON tok_knowledge_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_tok_notes_user_id ON tok_notes(user_id);

INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version', '002');
INSERT OR IGNORE INTO _migrations (name) VALUES ('001_initial');
INSERT OR IGNORE INTO _migrations (name) VALUES ('002_full_schema_sync');
