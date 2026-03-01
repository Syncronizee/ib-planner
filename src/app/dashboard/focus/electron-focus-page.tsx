'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FocusSession } from '@/components/study/focus-session'
import { getLocalDesktopUser, maybePrimeLocalCache, queryLocalTable } from '@/lib/electron/local-route'
import type { EnergyLevel, SessionType, Subject, Task, WeeklyPriority } from '@/lib/types'
import { calculateScheduledDurationMinutes } from '@/lib/weekly-planning'

type Snapshot = {
  subjects: Subject[]
  tasks: Task[]
  priority: WeeklyPriority | null
}

const EMPTY_SNAPSHOT: Snapshot = {
  subjects: [],
  tasks: [],
  priority: null,
}

const VALID_SESSION_TYPES: SessionType[] = ['new_content', 'practice', 'review', 'passive']
const VALID_ENERGY_LEVELS: EnergyLevel[] = ['high', 'medium', 'low']

async function loadLocalSnapshot(userId: string, priorityId?: string | null): Promise<Snapshot> {
  const [subjects, tasks, priorities] = await Promise.all([
    queryLocalTable<Subject>('subjects', userId, { orderBy: 'created_at', ascending: true }),
    queryLocalTable<Task>('tasks', userId, {
      filters: { is_completed: false },
      orderBy: 'due_date',
      ascending: true,
    }),
    priorityId
      ? queryLocalTable<WeeklyPriority>('weekly_priorities', userId, {
          filters: { id: priorityId },
          limit: 1,
        })
      : Promise.resolve([] as WeeklyPriority[]),
  ])

  return { subjects, tasks, priority: priorities[0] ?? null }
}

export function ElectronFocusPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const priorityId = searchParams.get('priority')
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      setLoading(true)

      try {
        const localUser = await getLocalDesktopUser()
        if (!localUser) {
          router.replace('/login')
          return
        }

        let localSnapshot = await loadLocalSnapshot(localUser.id, priorityId)
        if (mounted) {
          setSnapshot(localSnapshot)
        }

        const totalRows = localSnapshot.subjects.length + localSnapshot.tasks.length + (localSnapshot.priority ? 1 : 0)
        const primed = await maybePrimeLocalCache(totalRows)
        if (primed) {
          localSnapshot = await loadLocalSnapshot(localUser.id, priorityId)
          if (mounted) {
            setSnapshot(localSnapshot)
          }
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [priorityId, router])

  const subjectId = searchParams.get('subject') || ''
  const taskId = searchParams.get('task') || ''
  const weaknessId = searchParams.get('weakness') || undefined
  const explicitDurationValue = Number.parseInt(searchParams.get('duration') || '', 10)
  const sessionTypeValue = searchParams.get('sessionType')
  const energyLevelValue = searchParams.get('energy')
  const taskSuggestion = searchParams.get('objective') || searchParams.get('taskSuggestion') || ''
  const autoStart = searchParams.get('autostart') === '1'
  const plannedSessionId = searchParams.get('plannedSessionId') || undefined

  const sessionType = VALID_SESSION_TYPES.includes(sessionTypeValue as SessionType)
    ? (sessionTypeValue as SessionType)
    : 'practice'

  const energyLevel = VALID_ENERGY_LEVELS.includes(energyLevelValue as EnergyLevel)
    ? (energyLevelValue as EnergyLevel)
    : 'medium'
  const initialSubjectId = subjectId || snapshot.priority?.subject_id || ''
  const initialTaskId = taskId || snapshot.priority?.task_id || ''
  const fallbackDurationValue = snapshot.priority ? calculateScheduledDurationMinutes(snapshot.priority) : null
  const resolvedDurationValue = Number.isNaN(explicitDurationValue)
    ? (fallbackDurationValue ?? 45)
    : explicitDurationValue
  const resolvedTaskSuggestion = taskSuggestion || snapshot.priority?.title || ''

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-4">
        <div className="token-row px-4 py-3 text-sm token-muted">Loading local focus session data...</div>
      </div>
    )
  }

  return (
    <FocusSession
      subjects={snapshot.subjects}
      tasks={snapshot.tasks}
      initialSubjectId={initialSubjectId}
      initialTaskId={initialTaskId}
      initialWeaknessId={weaknessId}
      initialDurationGoal={resolvedDurationValue}
      initialSessionType={sessionType}
      initialEnergyLevel={energyLevel}
      initialTaskSuggestion={resolvedTaskSuggestion}
      initialPriority={snapshot.priority}
      autoStart={autoStart}
      plannedSessionId={plannedSessionId}
    />
  )
}
