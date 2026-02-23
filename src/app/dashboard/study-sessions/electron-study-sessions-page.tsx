'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { StudySessionsList } from '@/components/study/study-sessions-list'
import { getLocalDesktopUser, maybePrimeLocalCache, queryLocalTable } from '@/lib/electron/local-route'
import type { StudySession, Subject } from '@/lib/types'
import { onDataChanged } from '@/lib/live-data/events'

type Snapshot = {
  sessions: StudySession[]
  subjects: Subject[]
}

const EMPTY_SNAPSHOT: Snapshot = {
  sessions: [],
  subjects: [],
}

async function loadLocalSnapshot(userId: string): Promise<Snapshot> {
  const [sessions, subjects] = await Promise.all([
    queryLocalTable<StudySession>('study_sessions', userId, { orderBy: 'started_at', ascending: false }),
    queryLocalTable<Subject>('subjects', userId, { orderBy: 'created_at', ascending: true }),
  ])

  return { sessions, subjects }
}

export function ElectronStudySessionsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const bootstrap = useCallback(async (mountedRef?: { current: boolean }, options?: { silent?: boolean }) => {
    const silent = options?.silent === true
    if (!silent) {
      setLoading(true)
      setError(null)
    }

    try {
      const localUser = await getLocalDesktopUser()
      if (!localUser) {
        router.replace('/login')
        return
      }

      if (!mountedRef || mountedRef.current) {
        setEmail(localUser.email)
      }

      let localSnapshot = await loadLocalSnapshot(localUser.id)
      if (!mountedRef || mountedRef.current) {
        setSnapshot(localSnapshot)
        setRevision((prev) => prev + 1)
      }

      const totalRows = localSnapshot.sessions.length + localSnapshot.subjects.length
      const primed = await maybePrimeLocalCache(totalRows)
      if (primed) {
        localSnapshot = await loadLocalSnapshot(localUser.id)
        if (!mountedRef || mountedRef.current) {
          setSnapshot(localSnapshot)
          setRevision((prev) => prev + 1)
        }
      }
    } catch (cause) {
      if (!mountedRef || mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load local study sessions data')
      }
    } finally {
      if ((!mountedRef || mountedRef.current) && !silent) {
        setLoading(false)
      }
    }
  }, [router])

  useEffect(() => {
    const mountedRef = { current: true }

    void bootstrap(mountedRef)

    const refresh = () => {
      void bootstrap(mountedRef, { silent: true })
    }

    window.addEventListener('focus', refresh)
    window.addEventListener('study-sessions-updated', refresh)
    const unsubscribe = onDataChanged(refresh)

    return () => {
      mountedRef.current = false
      window.removeEventListener('focus', refresh)
      window.removeEventListener('study-sessions-updated', refresh)
      unsubscribe()
    }
  }, [bootstrap])

  return (
    <div className="min-h-screen app-bg">
      <Header email={email} />
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-4">
        {loading ? (
          <div className="token-row px-4 py-3 text-sm token-muted">Loading local study sessions data...</div>
        ) : null}
        {!loading && error ? (
          <div className="token-row px-4 py-3 text-sm text-amber-400">{error}</div>
        ) : null}
        <StudySessionsList key={revision} sessions={snapshot.sessions} subjects={snapshot.subjects} />
      </main>
    </div>
  )
}
