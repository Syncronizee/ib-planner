import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export type DatabaseBootstrapInfo = {
  userDataPath: string
  databasePath: string
  schemaPath: string
  migrationsPath: string
}

export function getDatabaseBootstrapInfo(): DatabaseBootstrapInfo {
  const userDataPath = app.getPath('userData')
  const databasePath = path.join(userDataPath, 'ib-planner.sqlite')
  const schemaPath = path.join(__dirname, 'schema.sql')
  const migrationsPath = path.join(__dirname, 'migrations')

  return {
    userDataPath,
    databasePath,
    schemaPath,
    migrationsPath,
  }
}

export function ensureDatabaseDirectories() {
  const { userDataPath } = getDatabaseBootstrapInfo()
  fs.mkdirSync(userDataPath, { recursive: true })
}
