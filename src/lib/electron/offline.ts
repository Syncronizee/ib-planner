import type { SyncStatus } from '@/lib/db/types'

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
    const user = window.electronAPI.auth?.getLastUser
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

  if (window.electronAPI.db?.invoke) {
    return window.electronAPI.db.invoke<T>(method, args)
  }

  if (window.electronAPI.dbInvoke) {
    return window.electronAPI.dbInvoke<T>(method, args)
  }

  throw new Error('Desktop database bridge is unavailable')
}
