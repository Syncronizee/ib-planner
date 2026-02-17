import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { ensureDatabaseDirectories, getDatabaseBootstrapInfo } from './index'

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
  applyMigrations(database)

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
