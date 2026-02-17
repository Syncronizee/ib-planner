export type ConflictWinner = 'local' | 'remote'

type SyncRecord = {
  updated_at?: string | null
  deleted_at?: string | null
}

function timestampValue(value?: string | null) {
  if (!value) {
    return 0
  }

  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return 0
  }

  return parsed
}

export function resolveConflict(localRecord: SyncRecord, remoteRecord: SyncRecord): ConflictWinner {
  const localUpdated = timestampValue(localRecord.updated_at)
  const remoteUpdated = timestampValue(remoteRecord.updated_at)

  if (localUpdated === remoteUpdated) {
    if (localRecord.deleted_at && !remoteRecord.deleted_at) {
      return 'local'
    }

    return 'remote'
  }

  return localUpdated > remoteUpdated ? 'local' : 'remote'
}
