'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PlanWeekFlow } from '@/components/planning/plan-week-flow'
import { getLocalDesktopUser, maybePrimeLocalCache, queryLocalTable } from '@/lib/electron/local-route'
import type { Subject, Task } from '@/lib/types'
import { onDataChanged } from '@/lib/live-data/events'

type Snapshot = {
  subjects: Subject[]
  tasks: Task[]
}

const EMPTY_SNAPSHOT: Snapshot = {
  subjects: [],
  tasks: [],
}

async function loadLocalSnapshot(userId: string): Promise<Snapshot> {
  const [subjects, tasks] = await Promise.all([
    queryLocalTable<Subject>('subjects', userId, { orderBy: 'created_at', ascending: true }),
    queryLocalTable<Task>('tasks', userId, {
      filters: { is_completed: false },
      orderBy: 'due_date',
      ascending: true,
    }),
  ])

  return { subjects, tasks }
}

export function ElectronPlanWeekPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      setLoading(true)
      setError(null)

      try {
        const localUser = await getLocalDesktopUser()
        if (!localUser) {
          router.replace('/login')
          return
        }

        if (mounted) {
          setEmail(localUser.email)
        }

        let localSnapshot = await loadLocalSnapshot(localUser.id)
        if (mounted) {
          setSnapshot(localSnapshot)
          setRevision((prev) => prev + 1)
        }

        const totalRows = localSnapshot.subjects.length + localSnapshot.tasks.length
        const primed = await maybePrimeLocalCache(totalRows)
        if (primed) {
          localSnapshot = await loadLocalSnapshot(localUser.id)
          if (mounted) {
            setSnapshot(localSnapshot)
            setRevision((prev) => prev + 1)
          }
        }
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : 'Unable to load local planning data')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    const unsubscribe = onDataChanged(() => {
      if (mounted) {
        setReloadTick((prev) => prev + 1)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [reloadTick, router])

  return (
    <div className="min-h-screen app-bg">
      <Header email={email} />
      <main className="max-w-2xl mx-auto px-4 sm:px-8 py-6 space-y-4">
        {loading ? (
          <div className="token-row px-4 py-3 text-sm token-muted">Loading local planning data...</div>
        ) : null}
        {!loading && error ? (
          <div className="token-row px-4 py-3 text-sm text-amber-400">{error}</div>
        ) : null}
        <PlanWeekFlow key={revision} subjects={snapshot.subjects} tasks={snapshot.tasks} />
      </main>
    </div>
  )
}
