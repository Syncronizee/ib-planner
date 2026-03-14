import type { SyncStatus } from '@/lib/db/types'

const OFFLINE_LIKE_ERROR_FRAGMENTS = [
  'failed to fetch',
  'fetch failed',
  'network request failed',
  'networkerror',
  'internet disconnected',
  'err_internet_disconnected',
  'econn',
  'enotfound',
  'timeout',
  'timed out',
  'getaddrinfo',
  'network is unreachable',
  'socket disconnected',
  'secure tls connection',
]

export function isOfflineLikeSyncError(error: string | null | undefined) {
  if (!error) {
    return false
  }

  const normalized = error.toLowerCase()
  return OFFLINE_LIKE_ERROR_FRAGMENTS.some((fragment) => normalized.includes(fragment))
}

export function isEffectivelyOfflineSyncStatus(
  status: Pick<SyncStatus, 'online' | 'error'> | null | undefined
) {
  if (!status) {
    return false
  }

  return !status.online || isOfflineLikeSyncError(status.error)
}
