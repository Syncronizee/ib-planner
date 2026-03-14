'use client'

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { Header } from '@/components/layout/header'
import { SubjectsSection } from './subjects-section'
import { TasksSection } from './tasks-section'
import { CalendarPreview } from './calendar-preview'
import { TimetableSection } from './timetable-section'
import { EnergyCheckinWrapper } from '@/components/energy/energy-checkin-wrapper'
import { WeeklyPlanWidget } from '@/components/dashboard/weekly-plan-widget'
import { FocusAreas } from '@/components/dashboard/focus-areas'
import { DashboardOverviewCard } from '@/components/dashboard/dashboard-overview-card'
import { PracticeTracker } from '@/components/dashboard/practice-tracker'
import { StudySessionsWidget } from '@/components/dashboard/study-sessions-widget'
import { SessionLoggerFab } from '@/components/study/session-logger-fab'
import { GraduationCap, Target, TrendingUp, CheckSquare } from 'lucide-react'
import { formatDotoNumber } from '@/lib/utils'
import { invokeDesktopDb } from '@/lib/electron/offline'
import { onDataChanged } from '@/lib/live-data/events'
import { getLocalDesktopUser } from '@/lib/electron/local-route'
import { isEffectivelyOfflineSyncStatus } from '@/lib/sync/offline-like'
import type { SyncStatus } from '@/lib/db/types'
import type {
  Assessment,
  ScheduledStudySession,
  SchoolEvent,
  StudySession,
  Subject,
  SyllabusTopic,
  Task,
  TimetableEntry,
  WeaknessTag,
  WeeklyPriority,
} from '@/lib/types'

type OfflineDashboardProps = {
  email: string
}

type Snapshot = {
  subjects: Subject[]
  tasks: Task[]
  assessments: Assessment[]
  weaknesses: WeaknessTag[]
  syllabusTopics: SyllabusTopic[]
  timetableEntries: TimetableEntry[]
  weeklyPriorities: WeeklyPriority[]
  studySessions: StudySession[]
  scheduledSessions: ScheduledStudySession[]
  schoolEvents: SchoolEvent[]
  totalRows: number
}

const EMPTY_SNAPSHOT: Snapshot = {
  subjects: [],
  tasks: [],
  assessments: [],
  weaknesses: [],
  syllabusTopics: [],
  timetableEntries: [],
  weeklyPriorities: [],
  studySessions: [],
  scheduledSessions: [],
  schoolEvents: [],
  totalRows: 0,
}

function getRowsFingerprint(rows: Array<{ id?: string; updated_at?: string | null; deleted_at?: string | null }>) {
  if (rows.length === 0) {
    return '0'
  }

  const ids: string[] = []
  let latestUpdatedAt = ''
  let deletedCount = 0

  for (const row of rows) {
    if (typeof row.id === 'string' && row.id.length > 0) {
      ids.push(row.id)
    }
    if (typeof row.updated_at === 'string' && row.updated_at > latestUpdatedAt) {
      latestUpdatedAt = row.updated_at
    }
    if (typeof row.deleted_at === 'string' && row.deleted_at.length > 0) {
      deletedCount += 1
    }
  }

  ids.sort()
  return `${rows.length}:${deletedCount}:${latestUpdatedAt}:${ids.join(',')}`
}

function getSnapshotFingerprint(snapshot: Snapshot) {
  return [
    getRowsFingerprint(snapshot.subjects),
    getRowsFingerprint(snapshot.tasks),
    getRowsFingerprint(snapshot.assessments),
    getRowsFingerprint(snapshot.weaknesses),
    getRowsFingerprint(snapshot.syllabusTopics),
    getRowsFingerprint(snapshot.timetableEntries),
    getRowsFingerprint(snapshot.weeklyPriorities),
    getRowsFingerprint(snapshot.studySessions),
    getRowsFingerprint(snapshot.scheduledSessions),
    getRowsFingerprint(snapshot.schoolEvents),
    String(snapshot.totalRows),
  ].join('|')
}

async function loadLocalSnapshot(userId: string): Promise<Snapshot> {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const [
    subjects,
    tasks,
    assessments,
    weaknesses,
    syllabusTopics,
    timetableEntries,
    weeklyPriorities,
    studySessions,
    scheduledSessions,
    schoolEvents,
  ] = await Promise.all([
    invokeDesktopDb<Subject[]>('getSubjects', [userId]),
    invokeDesktopDb<Task[]>('getTasks', [userId]),
    invokeDesktopDb<Assessment[]>('getAssessments', [userId]),
    invokeDesktopDb<WeaknessTag[]>('queryTable', [
      'weakness_tags',
      { userId, orderBy: 'created_at', ascending: true },
    ]),
    invokeDesktopDb<SyllabusTopic[]>('queryTable', [
      'syllabus_topics',
      { userId, orderBy: 'created_at', ascending: true },
    ]),
    invokeDesktopDb<TimetableEntry[]>('queryTable', [
      'timetable_entries',
      { userId, orderBy: 'start_time', ascending: true },
    ]),
    invokeDesktopDb<WeeklyPriority[]>('queryTable', [
      'weekly_priorities',
      {
        userId,
        filters: { week_start: format(weekStart, 'yyyy-MM-dd') },
        orderBy: 'priority_number',
        ascending: true,
      },
    ]),
    invokeDesktopDb<StudySession[]>('queryTable', [
      'study_sessions',
      { userId, orderBy: 'started_at', ascending: false },
    ]),
    invokeDesktopDb<ScheduledStudySession[]>('queryTable', [
      'scheduled_study_sessions',
      { userId, orderBy: 'scheduled_for', ascending: true },
    ]),
    invokeDesktopDb<SchoolEvent[]>('queryTable', [
      'school_events',
      { userId, orderBy: 'event_date', ascending: true },
    ]),
  ])

  const totalRows =
    subjects.length +
    tasks.length +
    assessments.length +
    weaknesses.length +
    syllabusTopics.length +
    timetableEntries.length +
    weeklyPriorities.length +
    studySessions.length +
    scheduledSessions.length +
    schoolEvents.length

  return {
    subjects,
    tasks,
    assessments,
    weaknesses,
    syllabusTopics,
    timetableEntries,
    weeklyPriorities,
    studySessions,
    scheduledSessions,
    schoolEvents,
    totalRows,
  }
}

export function OfflineDashboard({ email }: OfflineDashboardProps) {
  const [resolvedEmail, setResolvedEmail] = useState(email)
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const snapshotFingerprintRef = useRef(getSnapshotFingerprint(EMPTY_SNAPSHOT))
  const syncLastSeenRef = useRef<string | null>(null)
  const syncWasInProgressRef = useRef(false)

  const applySnapshot = useCallback((nextSnapshot: Snapshot, mountedRef?: { current: boolean }) => {
    if (mountedRef && !mountedRef.current) {
      return
    }

    const nextFingerprint = getSnapshotFingerprint(nextSnapshot)
    if (snapshotFingerprintRef.current === nextFingerprint) {
      return
    }

    snapshotFingerprintRef.current = nextFingerprint
    startTransition(() => {
      setSnapshot(nextSnapshot)
    })
  }, [])

  const handleSyncStatus = useCallback((status: SyncStatus) => {
    const previousLastSyncedAt = syncLastSeenRef.current
    const previouslySyncing = syncWasInProgressRef.current

    syncLastSeenRef.current = status.lastSyncedAt
    syncWasInProgressRef.current = status.syncing

    if (status.syncing) {
      return false
    }

    if (status.lastSyncedAt && status.lastSyncedAt !== previousLastSyncedAt) {
      return true
    }

    if (previouslySyncing && !status.error) {
      return true
    }

    return false
  }, [])

  const bootstrap = useCallback(async (mountedRef?: { current: boolean }, options?: { silent?: boolean }) => {
    const silent = options?.silent === true
    if (!silent) {
      setLoading(true)
      setError(null)
    }

    try {
      const localUser = await getLocalDesktopUser()
      if ((!mountedRef || mountedRef.current) && localUser?.email) {
        setResolvedEmail(localUser.email)
      }

      if (!localUser?.id) {
        if (!mountedRef || mountedRef.current) {
          setError('No local user session found. Sign in once online to seed offline data.')
        }
        return
      }

      let snapshot = await loadLocalSnapshot(localUser.id)
      applySnapshot(snapshot, mountedRef)

      const isOnline = window.electronAPI?.platform?.isOnline
        ? await window.electronAPI.platform.isOnline()
        : navigator.onLine
      const hasAuthToken = window.electronAPI?.auth?.getToken
        ? Boolean(await window.electronAPI.auth.getToken())
        : false
      const status = window.electronAPI?.sync?.status
        ? await window.electronAPI.sync.status()
        : null

      if (status?.lastSyncedAt) {
        syncLastSeenRef.current = status.lastSyncedAt
      }
      syncWasInProgressRef.current = Boolean(status?.syncing)

      const effectiveOnline = Boolean(isOnline) && !isEffectivelyOfflineSyncStatus(status)
      const shouldPrime =
        effectiveOnline &&
        hasAuthToken &&
        Boolean(window.electronAPI?.sync?.start) &&
        (snapshot.totalRows === 0 || !status?.lastSyncedAt)

      // First-run bootstrap: if local cache is empty and online is available, pull once then reload from SQLite.
      if (shouldPrime && window.electronAPI?.sync?.start) {
        await window.electronAPI.sync.start()
        snapshot = await loadLocalSnapshot(localUser.id)
        applySnapshot(snapshot, mountedRef)
      }
    } catch (cause) {
      if (!mountedRef || mountedRef.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load local dashboard data')
      }
    } finally {
      if ((!mountedRef || mountedRef.current) && !silent) {
        setLoading(false)
      }
    }
  }, [applySnapshot])

  useEffect(() => {
    const mountedRef = { current: true }
    let refreshTimer: number | null = null
    let refreshing = false
    let queued = false

    void bootstrap(mountedRef)

    const runSilentRefresh = async () => {
      if (refreshing) {
        queued = true
        return
      }

      refreshing = true
      try {
        await bootstrap(mountedRef, { silent: true })
      } finally {
        refreshing = false
        if (queued) {
          queued = false
          await runSilentRefresh()
        }
      }
    }

    const queueSilentRefresh = () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer)
      }

      refreshTimer = window.setTimeout(() => {
        refreshTimer = null
        void runSilentRefresh()
      }, 120)
    }

    const onSyncMaybeRefresh = (status: SyncStatus) => {
      if (handleSyncStatus(status)) {
        queueSilentRefresh()
      }
    }

    window.addEventListener('focus', queueSilentRefresh)
    window.addEventListener('study-sessions-updated', queueSilentRefresh)
    window.addEventListener('scheduled-sessions-updated', queueSilentRefresh)
    const unsubscribeDataChanged = onDataChanged(queueSilentRefresh)
    const unsubscribeSyncComplete = window.electronAPI?.sync?.onComplete
      ? window.electronAPI.sync.onComplete(onSyncMaybeRefresh)
      : () => {}
    const unsubscribeSyncStatus = window.electronAPI?.sync?.onStatusChange
      ? window.electronAPI.sync.onStatusChange(onSyncMaybeRefresh)
      : () => {}
    const periodicRefresh = window.setInterval(() => {
      queueSilentRefresh()
    }, 45_000)

    return () => {
      mountedRef.current = false
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer)
      }
      window.clearInterval(periodicRefresh)
      window.removeEventListener('focus', queueSilentRefresh)
      window.removeEventListener('study-sessions-updated', queueSilentRefresh)
      window.removeEventListener('scheduled-sessions-updated', queueSilentRefresh)
      unsubscribeDataChanged()
      unsubscribeSyncComplete()
      unsubscribeSyncStatus()
    }
  }, [bootstrap, handleSyncStatus])

  const {
    subjects,
    tasks,
    assessments,
    weaknesses,
    syllabusTopics,
    timetableEntries,
    weeklyPriorities,
    studySessions,
    scheduledSessions,
    schoolEvents,
  } = snapshot

  const totalSubjects = subjects.length
  const subjectsWithGrades = useMemo(
    () => subjects.filter((subject) => subject.current_grade !== null),
    [subjects]
  )
  const averageGrade =
    subjectsWithGrades.length > 0
      ? (
          subjectsWithGrades.reduce((sum, subject) => sum + (subject.current_grade || 0), 0) /
          subjectsWithGrades.length
        ).toFixed(1)
      : null
  const totalPoints = subjectsWithGrades.reduce((sum, subject) => sum + (subject.current_grade || 0), 0)
  const pendingTasks = tasks.filter((task) => !task.is_completed).length
  const todayIso = format(new Date(), 'yyyy-MM-dd')
  const nowIso = new Date().toISOString()

  return (
    <div className="min-h-screen app-bg">
      <Header email={resolvedEmail} />

      <EnergyCheckinWrapper tasks={tasks} subjects={subjects} />
      <SessionLoggerFab subjects={subjects} />

      <main className="dashboard-main max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {loading ? (
          <div className="token-row px-4 py-3 text-sm token-muted">
            Loading local dashboard data...
          </div>
        ) : null}

        {!loading ? (
          <>
            <DashboardOverviewCard
              tasks={tasks}
              assessments={assessments}
              subjects={subjects}
              scheduledSessions={scheduledSessions}
              referenceDate={todayIso}
              referenceNow={nowIso}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card-colored glass-pink p-5 hover-lift">
                <div className="flex items-center gap-2 token-muted mb-4">
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Subjects</span>
                </div>
                <p className="dotted-number">{formatDotoNumber(totalSubjects)}</p>
              </div>

              <div className="glass-card-colored glass-purple p-5 hover-lift">
                <div className="flex items-center gap-2 token-muted mb-4">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Average</span>
                </div>
                <p className="dotted-number">{formatDotoNumber(averageGrade) || '-'}</p>
              </div>

              <div className="glass-card-colored glass-cyan p-5 hover-lift">
                <div className="flex items-center gap-2 token-muted mb-4">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Points</span>
                </div>
                <div className="flex items-baseline">
                  <span className="dotted-number">{formatDotoNumber(totalPoints)}</span>
                  <span className="dotted-divider">/42</span>
                </div>
              </div>

              <div className="glass-card-colored glass-orange p-5 hover-lift">
                <div className="flex items-center gap-2 token-muted mb-4">
                  <CheckSquare className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Tasks</span>
                </div>
                <p className="dotted-number">{formatDotoNumber(pendingTasks)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card hover-lift overflow-hidden">
                <WeeklyPlanWidget priorities={weeklyPriorities} subjects={subjects} referenceDate={todayIso} />
              </div>
              <div className="glass-card hover-lift overflow-hidden">
                <FocusAreas
                  subjects={subjects}
                  assessments={assessments}
                  tasks={tasks}
                  weaknesses={weaknesses}
                />
              </div>
            </div>

            <div className="glass-card hover-lift overflow-hidden">
              <PracticeTracker
                subjects={subjects}
                syllabusTopics={syllabusTopics}
              />
            </div>

            <div className="glass-card hover-lift overflow-hidden">
              <StudySessionsWidget
                sessions={studySessions}
                subjects={subjects}
                tasks={tasks}
                scheduledSessions={scheduledSessions}
                referenceDate={todayIso}
              />
            </div>

            <div className="glass-card hover-lift overflow-hidden">
              <TimetableSection initialEntries={timetableEntries} subjects={subjects} />
            </div>

            <div className="glass-card hover-lift overflow-hidden">
              <CalendarPreview
                tasks={tasks}
                assessments={assessments}
                subjects={subjects}
                scheduledSessions={scheduledSessions}
                schoolEvents={schoolEvents}
                initialDate={todayIso}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card hover-lift overflow-hidden">
                <SubjectsSection initialSubjects={subjects} />
              </div>
              <div className="glass-card hover-lift overflow-hidden">
                <TasksSection initialTasks={tasks} subjects={subjects} />
              </div>
            </div>
          </>
        ) : null}
      </main>

      {!loading && error ? (
        <div className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-2xl border border-amber-500/35 bg-[var(--card)] px-4 py-3 shadow-2xl">
          <p className="text-sm font-medium text-[var(--card-fg)]">Offline Warning</p>
          <p className="mt-1 text-xs text-amber-300">{error}</p>
        </div>
      ) : null}
    </div>
  )
}
