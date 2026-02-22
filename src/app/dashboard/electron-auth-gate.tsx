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
      try {
        const localUser = await window.electronAPI?.auth?.getLastUser?.()
        if (!mounted) {
          return
        }

        if (!localUser?.id) {
          setState('redirecting')
          router.replace('/login')
          return
        }

        setEmail(localUser.email ?? '')
        setState('ready')
      } catch {
        if (!mounted) {
          return
        }

        setState('redirecting')
        router.replace('/login')
      }
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
