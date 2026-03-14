'use client'

import type { SyncStatus } from '@/lib/db/types'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'
import { isEffectivelyOfflineSyncStatus } from '@/lib/sync/offline-like'

type PrimitiveFilter = string | number | boolean | null

export type LocalQueryOptions = {
  filters?: Record<string, PrimitiveFilter>
  orderBy?: string
  ascending?: boolean
  includeDeleted?: boolean
  limit?: number
}

export type LocalDesktopUser = {
  id: string
  email: string
}

export async function getLocalDesktopUser(): Promise<LocalDesktopUser | null> {
  if (!isElectronRuntime()) {
    return null
  }

  const fallbackUserId = await getDesktopUserId()
  const localUser = window.electronAPI?.auth?.getLastUser
    ? await window.electronAPI.auth.getLastUser().catch(() => null)
    : null
  const userId = localUser?.id ?? fallbackUserId

  if (!userId) {
    return null
  }

  return {
    id: userId,
    email: localUser?.email ?? '',
  }
}

export async function queryLocalTable<T>(
  table: string,
  userId: string,
  options: LocalQueryOptions = {}
): Promise<T[]> {
  return invokeDesktopDb<T[]>('queryTable', [
    table,
    {
      userId,
      ...options,
    },
  ])
}

export async function maybePrimeLocalCache(localRowCount: number): Promise<boolean> {
  if (!isElectronRuntime()) {
    return false
  }

  const syncApi = window.electronAPI?.sync
  if (!syncApi?.status || !syncApi.start) {
    return false
  }

  let status: SyncStatus | null = null
  try {
    status = await syncApi.status()
  } catch {
    status = null
  }

  const online = window.electronAPI?.platform?.isOnline
    ? await window.electronAPI.platform.isOnline()
    : navigator.onLine

  const token = window.electronAPI?.auth?.getToken
    ? await window.electronAPI.auth.getToken().catch(() => null)
    : null

  const effectiveOnline = Boolean(online) && !isEffectivelyOfflineSyncStatus(status)
  const shouldPrime = effectiveOnline && Boolean(token) && (localRowCount === 0 || !status?.lastSyncedAt)
  if (!shouldPrime) {
    return false
  }

  await syncApi.start()
  return true
}
