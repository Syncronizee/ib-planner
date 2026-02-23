'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { Header } from '@/components/layout/header'
import { SubjectsSection } from './subjects-section'
import { TasksSection } from './tasks-section'
import { CalendarPreview } from './calendar-preview'
import { TimetableSection } from './timetable-section'
import { EnergyCheckinWrapper } from '@/components/energy/energy-checkin-wrapper'
import { WeeklyPlanWidget } from '@/components/planning/weekly-plan-widget'
import { WeaknessIndicator } from '@/components/dashboard/weakness-indicator'
import { DashboardOverviewCard } from '@/components/dashboard/dashboard-overview-card'
import { ProactiveScore } from '@/components/dashboard/proactive-score'
import { StudySessionsWidget } from '@/components/dashboard/study-sessions-widget'
import { SessionLoggerFab } from '@/components/study/session-logger-fab'
import { GraduationCap, Target, TrendingUp, CheckSquare } from 'lucide-react'
import { formatDotoNumber } from '@/lib/utils'
import { getDesktopUserId, invokeDesktopDb } from '@/lib/electron/offline'
import { onDataChanged } from '@/lib/live-data/events'
import type {
  Assessment,
  ScheduledStudySession,
  SchoolEvent,
  StudySession,
  Subject,
  Task,
  TimetableEntry,
  WeeklyPlan,
} from '@/lib/types'

type OfflineDashboardProps = {
  email: string
}

type Snapshot = {
  subjects: Subject[]
  tasks: Task[]
  assessments: Assessment[]
  timetableEntries: TimetableEntry[]
  weeklyPlan: WeeklyPlan | null
  studySessions: StudySession[]
  scheduledSessions: ScheduledStudySession[]
  schoolEvents: SchoolEvent[]
  totalRows: number
}

const EMPTY_SNAPSHOT: Snapshot = {
  subjects: [],
  tasks: [],
  assessments: [],
  timetableEntries: [],
  weeklyPlan: null,
  studySessions: [],
  scheduledSessions: [],
  schoolEvents: [],
  totalRows: 0,
}

async function loadLocalSnapshot(userId: string): Promise<Snapshot> {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const [
    subjects,
    tasks,
    assessments,
    timetableEntries,
    weeklyPlans,
    studySessions,
    scheduledSessions,
    schoolEvents,
  ] = await Promise.all([
    invokeDesktopDb<Subject[]>('getSubjects', [userId]),
    invokeDesktopDb<Task[]>('getTasks', [userId]),
    invokeDesktopDb<Assessment[]>('getAssessments', [userId]),
    invokeDesktopDb<TimetableEntry[]>('queryTable', [
      'timetable_entries',
      { userId, orderBy: 'start_time', ascending: true },
    ]),
    invokeDesktopDb<WeeklyPlan[]>('queryTable', [
      'weekly_plans',
      {
        userId,
        filters: { week_start_date: format(weekStart, 'yyyy-MM-dd') },
        orderBy: 'created_at',
        ascending: false,
        limit: 1,
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
    timetableEntries.length +
    weeklyPlans.length +
    studySessions.length +
    scheduledSessions.length +
    schoolEvents.length

  return {
    subjects,
    tasks,
    assessments,
    timetableEntries,
    weeklyPlan: weeklyPlans[0] ?? null,
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

  const bootstrap = useCallback(async (mountedRef?: { current: boolean }, options?: { silent?: boolean }) => {
    const silent = options?.silent === true
    if (!silent) {
      setLoading(true)
      setError(null)
    }

    try {
      if (window.electronAPI?.auth?.getLastUser) {
        const localUser = await window.electronAPI.auth.getLastUser()
        if ((!mountedRef || mountedRef.current) && localUser?.email) {
          setResolvedEmail(localUser.email)
        }
      }

      const userId = await getDesktopUserId()
      if (!userId) {
        if (!mountedRef || mountedRef.current) {
          setError('No local user session found. Sign in once online to seed offline data.')
        }
        return
      }

      let snapshot = await loadLocalSnapshot(userId)
      if (!mountedRef || mountedRef.current) {
        setSnapshot(snapshot)
      }

      const isOnline = window.electronAPI?.platform?.isOnline
        ? await window.electronAPI.platform.isOnline()
        : navigator.onLine
      const status = window.electronAPI?.sync?.status
        ? await window.electronAPI.sync.status()
        : null

      const shouldPrime =
        Boolean(isOnline) &&
        Boolean(window.electronAPI?.sync?.start) &&
        (snapshot.totalRows === 0 || !status?.lastSyncedAt)

      // First-run bootstrap: if local cache is empty and online is available, pull once then reload from SQLite.
      if (shouldPrime && window.electronAPI?.sync?.start) {
        await window.electronAPI.sync.start()
        snapshot = await loadLocalSnapshot(userId)
        if (!mountedRef || mountedRef.current) {
          setSnapshot(snapshot)
        }
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
  }, [])

  useEffect(() => {
    const mountedRef = { current: true }

    void bootstrap(mountedRef)

    const refresh = () => {
      void bootstrap(mountedRef, { silent: true })
    }

    window.addEventListener('focus', refresh)
    window.addEventListener('study-sessions-updated', refresh)
    window.addEventListener('scheduled-sessions-updated', refresh)
    const unsubscribe = onDataChanged(refresh)

    return () => {
      mountedRef.current = false
      window.removeEventListener('focus', refresh)
      window.removeEventListener('study-sessions-updated', refresh)
      window.removeEventListener('scheduled-sessions-updated', refresh)
      unsubscribe()
    }
  }, [bootstrap])

  const {
    subjects,
    tasks,
    assessments,
    timetableEntries,
    weeklyPlan,
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

        {!loading && error ? (
          <div className="token-row px-4 py-3 text-sm text-amber-400">
            {error}
          </div>
        ) : null}

        {!loading ? (
          <>
            <DashboardOverviewCard
              tasks={tasks}
              assessments={assessments}
              subjects={subjects}
              scheduledSessions={scheduledSessions}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-card hover-lift overflow-hidden">
                <WeeklyPlanWidget plan={weeklyPlan} tasks={tasks} subjects={subjects} />
              </div>
              <div className="glass-card hover-lift overflow-hidden">
                <WeaknessIndicator subjects={subjects} tasks={tasks} />
              </div>
              <div className="glass-card hover-lift overflow-hidden">
                <ProactiveScore tasks={tasks} subjects={subjects} />
              </div>
            </div>

            <div className="glass-card hover-lift overflow-hidden">
              <StudySessionsWidget
                sessions={studySessions}
                subjects={subjects}
                tasks={tasks}
                scheduledSessions={scheduledSessions}
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
    </div>
  )
}
