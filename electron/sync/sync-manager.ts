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

function normalizeScheduledForValue(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const repaired = value
    .trim()
    .replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}):\d{2}$/, '$1')
  const parsed = new Date(repaired)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toISOString()
}

function normalizeForeignKeySubjectValue(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
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
    const userId = session?.user?.id ?? this.tokenStore.getLastUser()?.id

    if (userId) {
      this.status.lastSyncedAt = this.localDb.getLastSyncAt(userId)
      this.status.pendingChanges = this.localDb.getPendingChangesCount(userId)
    }

    this.emitStatus('status')
  }

  getStatus() {
    return { ...this.status }
  }

  async setOnline(online: boolean) {
    this.status.online = online
    if (!online) {
      this.status.syncing = false
      this.status.error = null
    }
    this.emitStatus('progress')

    if (!online) {
      return
    }

    const session = this.tokenStore.getSession()
    if (!session?.user?.id) {
      return
    }

    void this.syncNow().catch((error) => {
      this.status.error = this.getErrorMessage(error)
      this.emitStatus('error')
    })
  }

  async syncNow() {
    return this.queue.enqueue(async () => {
      const existingSession = this.tokenStore.getSession()
      const session = await this.ensureFreshSession(existingSession)

      if (!session?.accessToken || !session.user?.id) {
        this.status.syncing = false
        this.status.error = null
        this.emitStatus('status')
        return this.getStatus()
      }

      if (!this.status.online) {
        this.status.syncing = false
        this.status.error = null
        this.emitStatus('status')
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
          const normalizedRow = this.prepareRowForPush(table, row, userId)
          const remoteId = normalizedRow.remote_id ?? normalizedRow.id

          if (normalizedRow.deleted_at) {
            try {
              await this.remote.delete(table, remoteId, userId, accessToken)
            } catch (error) {
              const message = this.getErrorMessage(error)
              // Deletions are idempotent from a sync perspective.
              if (!message.toLowerCase().includes('row')) {
                throw error
              }
            }

            this.localDb.markRecordSynced(table, normalizedRow.id, remoteId)
            continue
          }

          const remoteRow = await this.remote.upsert(table, {
            ...normalizedRow,
            id: remoteId,
          }, accessToken)

          const persistedRemoteId = typeof remoteRow.id === 'string' ? remoteRow.id : remoteId
          this.localDb.markRecordSynced(table, normalizedRow.id, persistedRemoteId)
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

  private prepareRowForPush(table: SyncTable, row: SyncRow, userId: string) {
    const patch: RowRecord = {}

    if (table === 'scheduled_study_sessions' && typeof row.scheduled_for === 'string') {
      const normalizedScheduledFor = normalizeScheduledForValue(row.scheduled_for)
      if (normalizedScheduledFor !== row.scheduled_for && typeof normalizedScheduledFor === 'string') {
        patch.scheduled_for = normalizedScheduledFor
      }
    }

    if (table !== 'subjects' && Object.prototype.hasOwnProperty.call(row, 'subject_id')) {
      const currentSubjectId = normalizeForeignKeySubjectValue(row.subject_id)
      let nextSubjectId: string | null = currentSubjectId

      if (currentSubjectId) {
        const linkedSubject = this.localDb.getById<SyncRow>('subjects', currentSubjectId, userId, true)
        const linkedSubjectDeleted = typeof linkedSubject?.deleted_at === 'string' && linkedSubject.deleted_at.length > 0

        if (!linkedSubject || linkedSubjectDeleted) {
          nextSubjectId = null
        } else {
          const remoteSubjectId =
            typeof linkedSubject.remote_id === 'string' && linkedSubject.remote_id.length > 0
              ? linkedSubject.remote_id
              : linkedSubject.id

          nextSubjectId = typeof remoteSubjectId === 'string' && remoteSubjectId.length > 0
            ? remoteSubjectId
            : null
        }
      }

      if (nextSubjectId !== currentSubjectId) {
        patch.subject_id = nextSubjectId
      }
    }

    if (table === 'weekly_plans' && Object.prototype.hasOwnProperty.call(row, 'weakest_subject_id')) {
      const currentWeakestSubjectId = normalizeForeignKeySubjectValue(row.weakest_subject_id)
      let nextWeakestSubjectId: string | null = currentWeakestSubjectId

      if (currentWeakestSubjectId) {
        const linkedSubject = this.localDb.getById<SyncRow>('subjects', currentWeakestSubjectId, userId, true)
        const linkedSubjectDeleted = typeof linkedSubject?.deleted_at === 'string' && linkedSubject.deleted_at.length > 0

        if (!linkedSubject || linkedSubjectDeleted) {
          nextWeakestSubjectId = null
        } else {
          const remoteSubjectId =
            typeof linkedSubject.remote_id === 'string' && linkedSubject.remote_id.length > 0
              ? linkedSubject.remote_id
              : linkedSubject.id

          nextWeakestSubjectId = typeof remoteSubjectId === 'string' && remoteSubjectId.length > 0
            ? remoteSubjectId
            : null
        }
      }

      if (nextWeakestSubjectId !== currentWeakestSubjectId) {
        patch.weakest_subject_id = nextWeakestSubjectId
      }
    }

    if (Object.keys(patch).length === 0) {
      return row
    }

    return this.localDb.updateRecord<SyncRow>(table, row.id, userId, patch)
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
