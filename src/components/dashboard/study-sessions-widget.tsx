'use client'

import { useMemo, useState } from 'react'
import { StudySession, Subject, Task, ScheduledStudySession } from '@/lib/types'
import { formatDotoNumber } from '@/lib/utils'
import { BookOpen, CalendarClock, Clock, Play } from 'lucide-react'
import { isThisWeek } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { QuickLogModal } from '@/components/study/quick-log-modal'
import { StudySessionSetupDialog } from '@/components/study/study-session-setup-dialog'

interface StudySessionsWidgetProps {
  sessions: StudySession[]
  subjects: Subject[]
  tasks: Task[]
  scheduledSessions: ScheduledStudySession[]
}

export function StudySessionsWidget({ sessions, subjects, tasks, scheduledSessions }: StudySessionsWidgetProps) {
  const [startOpen, setStartOpen] = useState(false)
  const [quickLogOpen, setQuickLogOpen] = useState(false)

  const thisWeekSessions = sessions.filter(s => isThisWeek(new Date(s.started_at), { weekStartsOn: 1 }))
  const totalMinutes = thisWeekSessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalHours = (totalMinutes / 60).toFixed(1)
  const sessionCount = thisWeekSessions.length

  const subjectCounts: Record<string, number> = {}
  for (const session of thisWeekSessions) {
    if (session.subject_id) {
      subjectCounts[session.subject_id] = (subjectCounts[session.subject_id] || 0) + session.duration_minutes
    }
  }

  let mostStudied: { name: string; minutes: number } | null = null
  for (const [id, minutes] of Object.entries(subjectCounts)) {
    const subject = subjects.find(s => s.id === id)
    if (subject && (!mostStudied || minutes > mostStudied.minutes)) {
      mostStudied = { name: subject.name, minutes }
    }
  }

  const upcomingScheduled = useMemo(
    () =>
      scheduledSessions
        .filter((session) => session.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
        .slice(0, 2),
    [scheduledSessions]
  )

  return (
    <>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
              <BookOpen className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Study Sessions</h2>
          </div>
          <Link href="/dashboard/study-sessions" className="text-xs text-[var(--accent)] hover:underline">
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button
            onClick={() => setStartOpen(true)}
            className="h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Session
          </Button>
          <Button
            onClick={() => setQuickLogOpen(true)}
            variant="outline"
            className="h-10 rounded-xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)]"
          >
            Quick Log
          </Button>
        </div>

        {sessionCount === 0 ? (
          <div className="text-center py-6">
            <Clock className="h-10 w-10 mx-auto text-[var(--muted-fg)] mb-3" />
            <p className="text-sm text-[var(--muted-fg)]">No sessions this week. Log one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] text-center">
              <p className="dotted-number-sm">{formatDotoNumber(sessionCount)}</p>
              <p className="text-[10px] text-[var(--muted-fg)] mt-1 uppercase tracking-wider">Sessions</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] text-center">
              <p className="dotted-number-sm">{formatDotoNumber(totalHours)}</p>
              <p className="text-[10px] text-[var(--muted-fg)] mt-1 uppercase tracking-wider">Hours</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] text-center">
              <p className="text-sm font-medium text-[var(--card-fg)] truncate mt-1">
                {mostStudied ? mostStudied.name : '-'}
              </p>
              <p className="text-[10px] text-[var(--muted-fg)] mt-1 uppercase tracking-wider">Top Subject</p>
            </div>
          </div>
        )}

        {upcomingScheduled.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-[var(--muted-fg)]">Upcoming Scheduled</p>
            {upcomingScheduled.map((session) => {
              const subject = subjects.find((item) => item.id === session.subject_id)
              return (
                <div key={session.id} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/45 px-3 py-2">
                  <CalendarClock className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--card-fg)] truncate">
                      {subject?.name || 'General Study'}
                      {session.task_suggestion ? ` • ${session.task_suggestion}` : ''}
                    </p>
                    <p className="text-xs text-[var(--muted-fg)]">
                      {new Date(session.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <StudySessionSetupDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        subjects={subjects}
        tasks={tasks}
      />

      <QuickLogModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        subjects={subjects}
        tasks={tasks}
      />
    </>
  )
}
