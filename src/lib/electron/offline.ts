import type { SyncStatus } from '@/lib/db/types'
import { emitDataChanged } from '@/lib/live-data/events'

export function isElectronRuntime() {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)
}

export async function getDesktopSyncStatus(): Promise<SyncStatus | null> {
  if (!isElectronRuntime() || !window.electronAPI) {
    return null
  }

  try {
    if (window.electronAPI.sync?.status) {
      return await window.electronAPI.sync.status()
    }

    if (window.electronAPI.getSyncStatus) {
      return await window.electronAPI.getSyncStatus()
    }

    return null
  } catch {
    return null
  }
}

export async function isManualOfflineMode() {
  const status = await getDesktopSyncStatus()

  if (!status) {
    return false
  }

  return status.online === false
}

export async function getDesktopUserId() {
  if (!isElectronRuntime() || !window.electronAPI) {
    return null
  }

  try {
    const user = window.electronAPI.auth?.getUser
      ? await window.electronAPI.auth.getUser()
      : window.electronAPI.auth?.getLastUser
        ? await window.electronAPI.auth.getLastUser()
        : await window.electronAPI.getLastAuthUser?.()

    return user?.id ?? null
  } catch {
    return null
  }
}

export async function invokeDesktopDb<T>(method: string, args: unknown[] = []) {
  if (!isElectronRuntime() || !window.electronAPI) {
    throw new Error('Desktop database bridge is unavailable')
  }

  let result: T

  if (window.electronAPI.db?.invoke) {
    result = await window.electronAPI.db.invoke<T>(method, args)
  } else if (window.electronAPI.dbInvoke) {
    result = await window.electronAPI.dbInvoke<T>(method, args)
  } else {
    throw new Error('Desktop database bridge is unavailable')
  }

  const isMutationMethod =
    method.startsWith('create') ||
    method.startsWith('update') ||
    method.startsWith('delete') ||
    method === 'createTableRecord' ||
    method === 'updateTableRecords' ||
    method === 'deleteTableRecords'

  if (isMutationMethod) {
    const tableArg = typeof args[0] === 'string' ? args[0] : undefined
    emitDataChanged({
      source: 'desktop-db',
      action: 'mutation',
      table: tableArg,
    })
  }

  return result
}
