'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarClock, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Assessment, ScheduledStudySession, Subject, Task } from '@/lib/types'
import { StudySessionSetupDialog } from '@/components/study/study-session-setup-dialog'
import { parseDateSafe } from '@/lib/date-utils'

interface DashboardOverviewCardProps {
  tasks: Task[]
  assessments: Assessment[]
  subjects: Subject[]
  scheduledSessions: ScheduledStudySession[]
  referenceDate: string
  referenceNow: string
}

export function DashboardOverviewCard({
  tasks,
  assessments,
  subjects,
  scheduledSessions,
  referenceDate,
  referenceNow,
}: DashboardOverviewCardProps) {
  const [setupOpen, setSetupOpen] = useState(false)
  const [setupMode, setSetupMode] = useState<'start' | 'schedule'>('start')
  const [mounted, setMounted] = useState(false)
  const now = parseDateSafe(referenceNow) ?? new Date()
  const today = referenceDate

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleOpenTaskDialog = () => {
    window.dispatchEvent(new CustomEvent('open-task-dialog'))
  }

  const openTasks = useMemo(() => tasks.filter((task) => !task.is_completed), [tasks])
  const dueTodayCount = openTasks.filter((task) => task.due_date === today).length
  const overdueCount = openTasks.filter((task) => task.due_date && task.due_date < today).length

  const nextTask = [...openTasks]
    .filter((task) => task.due_date && task.due_date >= today)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))[0] || null

  const nextAssessment = [...assessments]
    .filter((assessment) => !assessment.is_completed && assessment.date && assessment.date >= today)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0] || null

  const nextScheduledSession = [...scheduledSessions]
    .map((session) => ({ session, scheduledAt: parseDateSafe(session.scheduled_for) }))
    .filter((entry): entry is { session: ScheduledStudySession; scheduledAt: Date } =>
      entry.session.status === 'scheduled' && entry.scheduledAt instanceof Date && entry.scheduledAt >= now
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0]?.session || null

  return (
    <section className="token-card p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--card-fg)]">Dashboard Overview</h1>
          <p className="text-sm token-muted mt-1">
            {dueTodayCount} due today, {overdueCount} overdue. Prioritize the next deadline and lock in a focused session.
          </p>
        </div>
        <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Button
            onClick={() => {
              setSetupMode('start')
              setSetupOpen(true)
            }}
            className="token-btn-accent rounded-2xl h-[4.5rem] px-2 text-xs sm:text-sm font-medium transition-smooth inline-flex flex-col justify-center items-center gap-1 leading-tight text-center"
          >
            <Play className="h-4 w-4" />
            Start Focus
          </Button>
          <Button
            onClick={() => {
              setSetupMode('schedule')
              setSetupOpen(true)
            }}
            className="btn-glass rounded-2xl h-[4.5rem] px-2 text-xs sm:text-sm font-medium transition-smooth inline-flex flex-col justify-center items-center gap-1 leading-tight text-center"
          >
            <CalendarClock className="h-4 w-4" />
            Schedule Study
          </Button>
          <Button
            type="button"
            onClick={handleOpenTaskDialog}
            className="btn-glass rounded-2xl h-[4.5rem] px-2 text-xs sm:text-sm font-medium transition-smooth inline-flex flex-col justify-center items-center gap-1 leading-tight text-center"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="token-row px-3 py-2 flex items-center justify-between text-sm">
          <span>Next Task</span>
          <span className="token-muted truncate max-w-[68%] text-right">
            {nextTask ? `${nextTask.title} (${nextTask.due_date})` : 'No pending tasks'}
          </span>
        </div>
        <div className="token-row px-3 py-2 flex items-center justify-between text-sm">
          <span>Next Assessment</span>
          <span className="token-muted truncate max-w-[68%] text-right">
            {nextAssessment ? `${nextAssessment.title} (${nextAssessment.date})` : 'No upcoming assessments'}
          </span>
        </div>
        <div className="token-row px-3 py-2 flex items-center justify-between text-sm">
          <span>Next Study Block</span>
          <span className="token-muted truncate max-w-[68%] text-right">
            {nextScheduledSession
              ? (() => {
                  const scheduledAt = parseDateSafe(nextScheduledSession.scheduled_for)
                  if (!scheduledAt) {
                    return 'Scheduled'
                  }

                  return mounted ? format(scheduledAt, 'MMM d, h:mm a') : 'Scheduled'
                })()
              : 'Nothing scheduled'}
          </span>
        </div>
      </div>

      <StudySessionSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        subjects={subjects}
        tasks={tasks}
        title={setupMode === 'start' ? 'Start Focus Session' : 'Schedule Study Session'}
        description={
          setupMode === 'start'
            ? 'Quick setup before entering focus mode.'
            : 'Plan a study session without leaving your dashboard.'
        }
      />
    </section>
  )
}
