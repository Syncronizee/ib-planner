'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SyncStatus as SyncStatusPayload } from '@/lib/db/types'
import { usePlatform } from '@/hooks/use-platform'

export type SyncUiStatus = 'idle' | 'syncing' | 'success' | 'error'

type UseSyncState = {
  status: SyncUiStatus
  lastSynced: Date | null
  pendingChanges: number
  error: string | null
  isOnline: boolean
}

const POLL_INTERVAL_MS = 30_000

function mapSyncStatus(status: SyncStatusPayload): SyncUiStatus {
  if (status.syncing) {
    return 'syncing'
  }

  if (status.error) {
    return 'error'
  }

  if (status.lastSyncedAt) {
    return 'success'
  }

  return 'idle'
}

export function useSync() {
  const { isElectron, isOnline: browserOnline } = usePlatform()
  const [state, setState] = useState<UseSyncState>({
    status: 'idle',
    lastSynced: null,
    pendingChanges: 0,
    error: null,
    isOnline: browserOnline,
  })

  const applySyncPayload = useCallback((payload: SyncStatusPayload) => {
    setState({
      status: mapSyncStatus(payload),
      lastSynced: payload.lastSyncedAt ? new Date(payload.lastSyncedAt) : null,
      pendingChanges: payload.pendingChanges,
      error: payload.error,
      isOnline: payload.online,
    })
  }, [])

  const refreshStatus = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.sync?.status) {
      setState((prev) => ({
        ...prev,
        isOnline: browserOnline,
      }))
      return
    }

    const payload = await window.electronAPI.sync.status()
    applySyncPayload(payload)
  }, [applySyncPayload, browserOnline, isElectron])

  const refreshPendingCount = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.sync) {
      return
    }

    const count = await window.electronAPI.sync.getPendingCount()
    setState((prev) => ({ ...prev, pendingChanges: count }))
  }, [isElectron])

  const sync = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.sync?.start) {
      return
    }

    setState((prev) => ({ ...prev, status: 'syncing', error: null }))

    try {
      const payload = await window.electronAPI.sync.start()
      applySyncPayload(payload)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unable to sync right now',
      }))
    }
  }, [applySyncPayload, isElectron])

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.sync) {
      return
    }

    const unsubscribers = [
      window.electronAPI.sync.onProgress(applySyncPayload),
      window.electronAPI.sync.onComplete(applySyncPayload),
      window.electronAPI.sync.onError(applySyncPayload),
      window.electronAPI.sync.onStatusChange(applySyncPayload),
    ]

    void refreshStatus()
    void refreshPendingCount()

    const interval = window.setInterval(() => {
      void refreshPendingCount()
      void refreshStatus()
    }, POLL_INTERVAL_MS)

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
      window.clearInterval(interval)
    }
  }, [applySyncPayload, isElectron, refreshPendingCount, refreshStatus])

  useEffect(() => {
    if (!isElectron) {
      setState((prev) => ({
        ...prev,
        isOnline: browserOnline,
      }))
    }
  }, [browserOnline, isElectron])

  return useMemo(
    () => ({
      status: state.status,
      lastSynced: state.lastSynced,
      pendingChanges: state.pendingChanges,
      error: state.error,
      sync,
      isOnline: state.isOnline,
      refresh: refreshStatus,
    }),
    [refreshStatus, state.error, state.isOnline, state.lastSynced, state.pendingChanges, state.status, sync]
  )
}
