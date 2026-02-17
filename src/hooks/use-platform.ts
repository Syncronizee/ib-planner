'use client'

import { useEffect, useMemo, useState } from 'react'

function detectElectronRuntime() {
  if (typeof window === 'undefined') {
    return false
  }

  if (window.electronAPI?.isElectron) {
    return true
  }

  return typeof window.process === 'object' && window.process.type === 'renderer'
}

export function isElectronRuntime() {
  return detectElectronRuntime()
}

export function usePlatform() {
  const [isElectron] = useState(() => detectElectronRuntime())
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const updateOnline = () => {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)

    let removeBridgeListener: (() => void) | null = null
    if (isElectron && window.electronAPI?.platform?.onOnlineChange) {
      removeBridgeListener = window.electronAPI.platform.onOnlineChange((online) => {
        setIsOnline(online)
      })
    }

    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
      removeBridgeListener?.()
    }
  }, [isElectron])

  return useMemo(
    () => ({
      isTauri: false as const,
      isElectron,
      isOnline,
      platform: isElectron ? ('electron' as const) : ('web' as const),
    }),
    [isElectron, isOnline]
  )
}
