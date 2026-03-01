import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { ensureDatabaseDirectories, getDatabaseBootstrapInfo } from './index'
import { FOCUS_AREA_PROGRESS_TYPES } from '../focus-area-progress'

let database: Database.Database | null = null

function applySqlFile(db: Database.Database, filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf8')
  db.exec(sql)
}

function ensureMigrationTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `)
}

function hasColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return rows.some((row) => row.name === column)
}

function ensureColumn(db: Database.Database, table: string, column: string, definition: string) {
  if (hasColumn(db, table, column)) {
    return
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

function ensureFocusAreaAndPracticeParity(db: Database.Database) {
  ensureColumn(db, 'syllabus_topics', 'practice_count', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'syllabus_topics', 'last_practiced_at', 'TEXT')
  ensureColumn(
    db,
    'syllabus_topics',
    'practice_status',
    "TEXT NOT NULL DEFAULT 'not_tracking' CHECK (practice_status IN ('not_tracking', 'tracking', 'on_track', 'mastered'))"
  )
  ensureColumn(db, 'syllabus_topics', 'mastered_at', 'TEXT')
  ensureColumn(db, 'syllabus_topics', 'difficulty', 'INTEGER CHECK (difficulty BETWEEN 1 AND 5 OR difficulty IS NULL)')
  ensureColumn(db, 'syllabus_topics', 'reminder_enabled', 'INTEGER NOT NULL DEFAULT 1')

  ensureColumn(db, 'weakness_tags', 'last_addressed_at', 'TEXT')
  ensureColumn(db, 'weakness_tags', 'address_count', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'weakness_tags', 'reflection_notes', 'TEXT')
  ensureColumn(
    db,
    'weakness_tags',
    'improvement_rating',
    'INTEGER CHECK (improvement_rating BETWEEN 1 AND 4 OR improvement_rating IS NULL)'
  )

  ensureColumn(db, 'study_sessions', 'weakness_tag_id', 'TEXT REFERENCES weakness_tags(id) ON DELETE SET NULL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS focus_area_progress (
      id TEXT PRIMARY KEY,
      remote_id TEXT UNIQUE,
      user_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      focus_area_id TEXT NOT NULL,
      focus_area_type TEXT NOT NULL,
      addressed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      synced_at TEXT,
      is_dirty INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    );
  `)

  ensureColumn(db, 'weekly_priorities', 'task_id', 'TEXT REFERENCES tasks(id) ON DELETE SET NULL')
  ensureColumn(db, 'weekly_priorities', 'task_category', "TEXT NOT NULL DEFAULT 'project'")
}

function normalizeLegacyFocusAreaProgress(db: Database.Database) {
  const allowedTypes = FOCUS_AREA_PROGRESS_TYPES.map((value) => `'${value}'`).join(', ')

  db.exec(`
    UPDATE focus_area_progress
    SET focus_area_type = CASE
          WHEN lower(trim(focus_area_type)) IN (${allowedTypes}) THEN lower(trim(focus_area_type))
          WHEN lower(trim(focus_area_type)) = 'practice' THEN 'confidence'
          WHEN focus_area_id LIKE 'syllabus-%' THEN 'confidence'
          ELSE 'weakness'
        END,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        synced_at = NULL,
        is_dirty = 1
    WHERE deleted_at IS NULL
      AND (
        focus_area_type IS NULL
        OR focus_area_type != CASE
             WHEN lower(trim(focus_area_type)) IN (${allowedTypes}) THEN lower(trim(focus_area_type))
             WHEN lower(trim(focus_area_type)) = 'practice' THEN 'confidence'
             WHEN focus_area_id LIKE 'syllabus-%' THEN 'confidence'
             ELSE 'weakness'
           END
      );
  `)
}

function applyMigrations(db: Database.Database) {
  const { migrationsPath } = getDatabaseBootstrapInfo()
  ensureMigrationTables(db)

  const applied = new Set<string>(
    (db.prepare('SELECT name FROM _migrations').all() as Array<{ name: string }>).map((row) => String(row.name))
  )

  const files = fs
    .readdirSync(migrationsPath)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))

  for (const file of files) {
    const migrationName = path.basename(file, '.sql')
    if (applied.has(migrationName)) {
      continue
    }

    const migrationPath = path.join(migrationsPath, file)
    const sql = fs.readFileSync(migrationPath, 'utf8')

    const tx = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT OR IGNORE INTO _migrations (name) VALUES (?)').run(migrationName)
    })

    tx()
  }
}

export function initializeDatabase() {
  if (database) {
    return database
  }

  ensureDatabaseDirectories()

  const { databasePath, schemaPath } = getDatabaseBootstrapInfo()
  database = new Database(databasePath)

  database.pragma('foreign_keys = ON')
  database.pragma('journal_mode = WAL')
  database.pragma('synchronous = NORMAL')

  applySqlFile(database, schemaPath)
  ensureFocusAreaAndPracticeParity(database)
  applyMigrations(database)
  normalizeLegacyFocusAreaProgress(database)

  return database
}

export function getDatabase() {
  if (!database) {
    return initializeDatabase()
  }

  return database
}

export function closeDatabase() {
  if (database) {
    database.close()
    database = null
  }
}
