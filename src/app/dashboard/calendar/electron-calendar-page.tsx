'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { CalendarView } from './calendar-view'
import { getLocalDesktopUser, maybePrimeLocalCache, queryLocalTable } from '@/lib/electron/local-route'
import type { Assessment, ScheduledStudySession, SchoolEvent, Subject, Task } from '@/lib/types'
import { onDataChanged } from '@/lib/live-data/events'

type Snapshot = {
  tasks: Task[]
  assessments: Assessment[]
  subjects: Subject[]
  scheduledSessions: ScheduledStudySession[]
  schoolEvents: SchoolEvent[]
}

const EMPTY_SNAPSHOT: Snapshot = {
  tasks: [],
  assessments: [],
  subjects: [],
  scheduledSessions: [],
  schoolEvents: [],
}

async function loadLocalSnapshot(userId: string): Promise<Snapshot> {
  const [tasks, assessments, subjects, scheduledSessions, schoolEvents] = await Promise.all([
    queryLocalTable<Task>('tasks', userId, { orderBy: 'due_date', ascending: true }),
    queryLocalTable<Assessment>('assessments', userId, { orderBy: 'date', ascending: true }),
    queryLocalTable<Subject>('subjects', userId, { orderBy: 'created_at', ascending: true }),
    queryLocalTable<ScheduledStudySession>('scheduled_study_sessions', userId, {
      orderBy: 'scheduled_for',
      ascending: true,
    }),
    queryLocalTable<SchoolEvent>('school_events', userId, { orderBy: 'event_date', ascending: true }),
  ])

  return { tasks, assessments, subjects, scheduledSessions, schoolEvents }
}

export function ElectronCalendarPage() {
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

        const totalRows =
          localSnapshot.tasks.length +
          localSnapshot.assessments.length +
          localSnapshot.subjects.length +
          localSnapshot.scheduledSessions.length +
          localSnapshot.schoolEvents.length

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
          setError(cause instanceof Error ? cause.message : 'Unable to load local calendar data')
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
    <div className="min-h-screen bg-background">
      <Header email={email} />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-4">
        {loading ? (
          <div className="token-row px-4 py-3 text-sm token-muted">Loading local calendar data...</div>
        ) : null}
        {!loading && error ? (
          <div className="token-row px-4 py-3 text-sm text-amber-400">{error}</div>
        ) : null}
        <CalendarView
          key={revision}
          initialTasks={snapshot.tasks}
          initialAssessments={snapshot.assessments}
          subjects={snapshot.subjects}
          initialScheduledSessions={snapshot.scheduledSessions}
          initialSchoolEvents={snapshot.schoolEvents}
        />
      </main>
    </div>
  )
}
