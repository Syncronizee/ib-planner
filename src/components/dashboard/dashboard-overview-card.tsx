'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { CalendarClock, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Assessment, ScheduledStudySession, Subject, Task } from '@/lib/types'
import { StudySessionSetupDialog } from '@/components/study/study-session-setup-dialog'

interface DashboardOverviewCardProps {
  tasks: Task[]
  assessments: Assessment[]
  subjects: Subject[]
  scheduledSessions: ScheduledStudySession[]
}

export function DashboardOverviewCard({
  tasks,
  assessments,
  subjects,
  scheduledSessions,
}: DashboardOverviewCardProps) {
  const [focusOpen, setFocusOpen] = useState(false)
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')

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
    .filter((session) => session.status === 'scheduled' && new Date(session.scheduled_for) >= now)
    .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0] || null

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
            onClick={() => setFocusOpen(true)}
            className="token-btn-accent rounded-2xl h-[4.5rem] px-2 text-xs sm:text-sm font-medium transition-smooth inline-flex flex-col justify-center items-center gap-1 leading-tight text-center"
          >
            <Play className="h-4 w-4" />
            Start Focus
          </Button>
          <Link href="/dashboard/calendar?intent=schedule-study" className="btn-glass rounded-2xl h-[4.5rem] px-2 text-xs sm:text-sm font-medium transition-smooth inline-flex flex-col justify-center items-center gap-1 leading-tight text-center">
            <CalendarClock className="h-4 w-4" />
            Schedule Study
          </Link>
          <Link href="/dashboard" className="btn-glass rounded-2xl h-[4.5rem] px-2 text-xs sm:text-sm font-medium transition-smooth inline-flex flex-col justify-center items-center gap-1 leading-tight text-center">
            <Plus className="h-4 w-4" />
            Add Task
          </Link>
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
            {nextScheduledSession ? format(new Date(nextScheduledSession.scheduled_for), 'MMM d, h:mm a') : 'Nothing scheduled'}
          </span>
        </div>
      </div>

      <StudySessionSetupDialog
        open={focusOpen}
        onOpenChange={setFocusOpen}
        subjects={subjects}
        tasks={tasks}
        title="Start Focus Session"
      />
    </section>
  )
}
