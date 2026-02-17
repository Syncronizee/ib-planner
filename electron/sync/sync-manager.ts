import { EventEmitter } from 'node:events'
import type { StoredAuthSession, SyncStatus } from '../shared-types'
import { LocalDatabaseService, SYNC_TABLES, type QueryValue, type RowRecord, type SyncTable } from '../database/local-database'
import { resolveConflict } from './conflict-resolver'
import { RemoteSyncDatabase } from './remote-database'
import { SyncQueue } from './sync-queue'
import { TokenStore } from '../auth/token-store'

type SyncRow = RowRecord & {
  id: string
  user_id: string
  remote_id?: string | null
  is_dirty?: number | boolean
  deleted_at?: string | null
  updated_at?: string | null
}

export class SyncManager extends EventEmitter {
  private readonly queue = new SyncQueue()
  private readonly remote = new RemoteSyncDatabase()
  private status: SyncStatus = {
    online: true,
    syncing: false,
    lastSyncedAt: null,
    pendingChanges: 0,
    error: null,
  }

  constructor(
    private readonly localDb: LocalDatabaseService,
    private readonly tokenStore: TokenStore
  ) {
    super()
    // Keep "error" non-fatal if emitted before explicit listeners are attached.
    this.on('error', () => {})
  }

  async initialize() {
    const session = this.tokenStore.getSession()

    if (session?.user?.id) {
      this.status.lastSyncedAt = this.localDb.getLastSyncAt(session.user.id)
      this.status.pendingChanges = this.localDb.getPendingChangesCount(session.user.id)
    }

    this.emitStatus('status')
  }

  getStatus() {
    return { ...this.status }
  }

  async setOnline(online: boolean) {
    this.status.online = online
    this.emitStatus('progress')

    if (!online) {
      return
    }

    const session = this.tokenStore.getSession()
    if (!session?.user?.id) {
      return
    }

    await this.syncNow()
  }

  async syncNow() {
    return this.queue.enqueue(async () => {
      const existingSession = this.tokenStore.getSession()
      const session = await this.ensureFreshSession(existingSession)

      if (!session?.accessToken || !session.user?.id) {
        this.status.error = 'Missing auth session for sync'
        this.emitStatus('error')
        return this.getStatus()
      }

      if (!this.status.online) {
        this.status.error = 'Offline mode: sync deferred'
        this.emitStatus('error')
        return this.getStatus()
      }

      const userId = session.user.id
      this.status.syncing = true
      this.status.error = null
      this.emitStatus('progress')

      try {
        await this.pushDirtyRecords(userId, session.accessToken)
        await this.pullRemoteRecords(userId, session.accessToken)

        const syncedAt = new Date().toISOString()
        this.localDb.setLastSyncAt(userId, syncedAt)

        this.status.lastSyncedAt = syncedAt
        this.status.pendingChanges = this.localDb.getPendingChangesCount(userId)
        this.status.error = null
        this.emitStatus('complete')
      } catch (error) {
        this.status.error = this.getErrorMessage(error)
        console.error('Desktop sync failed:', error)
        this.emitStatus('error')
      } finally {
        this.status.syncing = false
        this.emitStatus('status')
      }

      return this.getStatus()
    })
  }

  private async ensureFreshSession(session: StoredAuthSession | null) {
    if (!session) {
      return null
    }

    const expiresAtSeconds = session.expiresAt
    if (!expiresAtSeconds) {
      return session
    }

    // Refresh if token expires in < 2 minutes.
    const expiresAtMs = expiresAtSeconds * 1000
    const thresholdMs = Date.now() + 2 * 60 * 1000
    if (expiresAtMs > thresholdMs) {
      return session
    }

    try {
      const refreshed = await this.remote.refreshSession(session.refreshToken)
      this.tokenStore.setSession(refreshed)
      return refreshed
    } catch {
      return session
    }
  }

  private async pushDirtyRecords(userId: string, accessToken: string) {
    for (const table of SYNC_TABLES) {
      const dirtyRows = this.localDb.getDirtyRecords<SyncRow>(table, userId, 500)

      if (dirtyRows.length === 0) {
        continue
      }

      try {
        for (const row of dirtyRows) {
          const remoteId = row.remote_id ?? row.id

          if (row.deleted_at) {
            try {
              await this.remote.delete(table, remoteId, userId, accessToken)
            } catch (error) {
              const message = this.getErrorMessage(error)
              // Deletions are idempotent from a sync perspective.
              if (!message.toLowerCase().includes('row')) {
                throw error
              }
            }

            this.localDb.markRecordSynced(table, row.id, remoteId)
            continue
          }

          const remoteRow = await this.remote.upsert(table, {
            ...row,
            id: remoteId,
          }, accessToken)

          const persistedRemoteId = typeof remoteRow.id === 'string' ? remoteRow.id : remoteId
          this.localDb.markRecordSynced(table, row.id, persistedRemoteId)
        }
      } catch (error) {
        if (this.isMissingRemoteTableError(error)) {
          throw new Error(
            `Push sync failed for table \"${table}\": remote table is missing and ${dirtyRows.length} local change(s) are pending`
          )
        }

        throw new Error(`Push sync failed for table "${table}": ${this.getErrorMessage(error)}`)
      }
    }
  }

  private async pullRemoteRecords(userId: string, accessToken: string) {
    for (const table of SYNC_TABLES) {
      try {
        const remoteRows = await this.remote.fetchByUser(table, userId, accessToken)
        const remoteIds = new Set<string>()

        for (const remoteRowUntyped of remoteRows) {
          const remoteRow = remoteRowUntyped as SyncRow
          if (typeof remoteRow.id !== 'string') {
            continue
          }

          remoteIds.add(remoteRow.id)

          const localRow = this.localDb.getById<SyncRow>(table, remoteRow.id, userId, true)

          if (!localRow) {
            this.localDb.upsertRemoteRecord(table, remoteRow)
            continue
          }

          const localDirty = Number(localRow.is_dirty ?? 0) === 1
          if (!localDirty) {
            this.localDb.upsertRemoteRecord(table, remoteRow)
            continue
          }

          const winner = resolveConflict(localRow, remoteRow)
          if (winner === 'remote') {
            this.localDb.upsertRemoteRecord(table, remoteRow)
          }
        }

        // Handle deletes that happened remotely by pruning locally synced rows that vanished.
        const localRows = this.localDb.listByUser<SyncRow>(table, userId, {
          includeDeleted: true,
          orderBy: 'updated_at',
        })

        for (const localRow of localRows) {
          const remoteId = localRow.remote_id ?? localRow.id
          const localDirty = Number(localRow.is_dirty ?? 0) === 1

          if (localDirty || localRow.deleted_at) {
            continue
          }

          if (!remoteIds.has(remoteId)) {
            this.localDb.hardDeleteRecord(table, localRow.id, userId)
          }
        }
      } catch (error) {
        if (this.isMissingRemoteTableError(error)) {
          console.warn(`Skipping pull sync for missing remote table \"${table}\"`)
          continue
        }

        throw new Error(`Pull sync failed for table "${table}": ${this.getErrorMessage(error)}`)
      }
    }
  }

  getPendingChanges(userId: string) {
    return this.localDb.getPendingChangesCount(userId)
  }

  ensureSyncTable(table: string): table is SyncTable {
    return this.localDb.ensureSyncTable(table)
  }

  upsertRemoteRecord(table: SyncTable, record: Record<string, QueryValue>) {
    return this.localDb.upsertRemoteRecord(table, record)
  }

  private emitStatus(event: 'progress' | 'complete' | 'error' | 'status') {
    const statusSnapshot = this.getStatus()
    this.emit(event, statusSnapshot)
    if (event !== 'status') {
      this.emit('status', statusSnapshot)
    }
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) {
      return error.message
    }

    if (typeof error === 'string') {
      return error
    }

    if (error && typeof error === 'object') {
      const candidate = error as Record<string, unknown>
      const parts: string[] = []

      if (typeof candidate.message === 'string' && candidate.message.length > 0) {
        parts.push(candidate.message)
      }
      if (typeof candidate.details === 'string' && candidate.details.length > 0) {
        parts.push(candidate.details)
      }
      if (typeof candidate.hint === 'string' && candidate.hint.length > 0) {
        parts.push(`hint: ${candidate.hint}`)
      }
      if (typeof candidate.code === 'string' && candidate.code.length > 0) {
        parts.push(`code: ${candidate.code}`)
      }

      if (parts.length > 0) {
        return parts.join(' | ')
      }

      try {
        return JSON.stringify(error)
      } catch {
        return 'Unknown sync failure'
      }
    }

    return 'Unknown sync failure'
  }

  private isMissingRemoteTableError(error: unknown) {
    if (!error || typeof error !== 'object') {
      return false
    }

    const candidate = error as Record<string, unknown>
    if (candidate.code === 'PGRST205') {
      return true
    }

    const message = this.getErrorMessage(error)
    return message.includes('PGRST205') || message.includes('Could not find the table')
  }
}
