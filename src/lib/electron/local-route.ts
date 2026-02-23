'use client'

import type { SyncStatus } from '@/lib/db/types'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'

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
  const localUser = await window.electronAPI?.auth?.getLastUser?.().catch(() => null)
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

  const shouldPrime = Boolean(online) && (localRowCount === 0 || !status?.lastSyncedAt)
  if (!shouldPrime) {
    return false
  }

  await syncApi.start()
  return true
}
