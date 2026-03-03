'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OfflineDashboard } from './offline-dashboard'

type GateState = 'checking' | 'ready' | 'redirecting'

export function ElectronDashboardAuthGate() {
  const router = useRouter()
  const [state, setState] = useState<GateState>('checking')
  const [email, setEmail] = useState('')

  useEffect(() => {
    let mounted = true

    const checkLocalAuth = async () => {
      const activeUser = window.electronAPI?.auth?.getUser
        ? await window.electronAPI.auth.getUser().catch(() => null)
        : null
      const lastUser = window.electronAPI?.auth?.getLastUser
        ? await window.electronAPI.auth.getLastUser().catch(() => null)
        : null

      if (!mounted) {
        return
      }

      const canEnterOfflineDashboard = Boolean(activeUser?.id || lastUser?.id)
      if (!canEnterOfflineDashboard) {
        if (!mounted) {
          return
        }

        setState('redirecting')
        router.replace('/login')
        return
      }

      // Prefer active session identity, but fall back to last known user so
      // the app can boot offline after relaunch.
      setEmail(activeUser?.email ?? lastUser?.email ?? '')
      setState('ready')
    }

    void checkLocalAuth()

    return () => {
      mounted = false
    }
  }, [router])

  if (state === 'ready') {
    return <OfflineDashboard email={email} />
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="token-row px-4 py-3 text-sm token-muted">
        {state === 'checking' ? 'Checking login status...' : 'Redirecting to login...'}
      </div>
    </div>
  )
}
