import type { DatabaseService } from '@/lib/db/types'
import { ElectronLocalDatabaseService } from '@/lib/db/local-database'
import { RemoteDatabaseService } from '@/lib/db/remote-database'

let dbService: DatabaseService | null = null

export function isElectronRenderer() {
  if (typeof window === 'undefined') {
    return false
  }

  if (window.electronAPI?.isElectron) {
    return true
  }

  return typeof window.process === 'object' && window.process.type === 'renderer'
}

export function getDatabaseService(): DatabaseService {
  if (dbService) {
    return dbService
  }

  dbService = isElectronRenderer()
    ? new ElectronLocalDatabaseService()
    : new RemoteDatabaseService()

  return dbService
}

export function resetDatabaseServiceForTests() {
  dbService = null
}
