'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { WeeklyPriorityPlanner } from '@/components/dashboard/weekly-priority-planner'
import { getLocalDesktopUser, maybePrimeLocalCache, queryLocalTable } from '@/lib/electron/local-route'
import type { Subject, WeeklyPriority } from '@/lib/types'
import { getRelativeWeekStart } from '@/lib/weekly-planning'
import { onDataChanged } from '@/lib/live-data/events'

type Snapshot = {
  subjects: Subject[]
  priorities: WeeklyPriority[]
}

const EMPTY_SNAPSHOT: Snapshot = {
  subjects: [],
  priorities: [],
}

async function loadLocalSnapshot(userId: string, weekStart: string): Promise<Snapshot> {
  const [subjects, priorities] = await Promise.all([
    queryLocalTable<Subject>('subjects', userId, { orderBy: 'created_at', ascending: true }),
    queryLocalTable<WeeklyPriority>('weekly_priorities', userId, {
      filters: { week_start: weekStart },
      orderBy: 'priority_number',
      ascending: true,
    }),
  ])

  return { subjects, priorities }
}

export function ElectronPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const weekVariant = searchParams.get('week') === 'next' ? 'next' : 'current'
  const weekStart = getRelativeWeekStart(weekVariant === 'next' ? 1 : 0)
  const [email, setEmail] = useState('')
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

        let localSnapshot = await loadLocalSnapshot(localUser.id, weekStart)
        if (mounted) {
          setSnapshot(localSnapshot)
        }

        const totalRows = localSnapshot.subjects.length + localSnapshot.priorities.length
        const primed = await maybePrimeLocalCache(totalRows)
        if (primed) {
          localSnapshot = await loadLocalSnapshot(localUser.id, weekStart)
          if (mounted) {
            setSnapshot(localSnapshot)
          }
        }
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : 'Unable to load weekly planning data')
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
        setReloadTick((current) => current + 1)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [reloadTick, router, weekStart])

  return (
    <div className="min-h-screen app-bg">
      <Header email={email} />
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-4">
        {loading ? <div className="token-row px-4 py-3 text-sm token-muted">Loading local planning data...</div> : null}
        {!loading && error ? <div className="token-row px-4 py-3 text-sm text-amber-400">{error}</div> : null}
        {!loading && !error ? (
          <WeeklyPriorityPlanner
            subjects={snapshot.subjects}
            initialPriorities={snapshot.priorities}
            weekStart={weekStart}
            weekVariant={weekVariant}
          />
        ) : null}
      </main>
    </div>
  )
}
