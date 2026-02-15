'use client'

import { useEffect, useMemo, useState } from 'react'
import { StudySession, Subject, Task, EnergyLevel, ScheduledStudySession, SessionType } from '@/lib/types'
import { formatDotoNumber } from '@/lib/utils'
import { BookOpen, CalendarClock, Clock, Play, Zap } from 'lucide-react'
import { isThisWeek } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QuickLogModal } from '@/components/study/quick-log-modal'
import { getTaskBankSuggestions } from '@/lib/study-task-bank'

interface StudySessionsWidgetProps {
  sessions: StudySession[]
  subjects: Subject[]
  tasks: Task[]
  scheduledSessions: ScheduledStudySession[]
}

const DURATION_PRESETS = [
  { label: '25 min', value: 25 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
  { label: 'No timer', value: 0 },
]

function getSuggestedTasksForEnergy(tasks: Task[], energy: EnergyLevel, subjectId?: string) {
  const availableTasks = tasks.filter((task) => !task.is_completed && (!subjectId || task.subject_id === subjectId))

  return availableTasks
    .filter((task) => {
      if (task.energy_level) return task.energy_level === energy

      if (energy === 'high') return task.priority === 'high' || task.category === 'assessment' || task.category === 'project'
      if (energy === 'medium') return task.priority === 'medium' || task.category === 'revision' || task.category === 'homework'
      return task.priority === 'low' || task.category === 'personal' || task.category === 'other'
    })
    .slice(0, 4)
}

export function StudySessionsWidget({ sessions, subjects, tasks, scheduledSessions }: StudySessionsWidgetProps) {
  const router = useRouter()
  const [startOpen, setStartOpen] = useState(false)
  const [quickLogOpen, setQuickLogOpen] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [durationGoal, setDurationGoal] = useState(45)
  const [customDuration, setCustomDuration] = useState('')
  const [energyCheck, setEnergyCheck] = useState<EnergyLevel>('medium')
  const [sessionType, setSessionType] = useState<SessionType>('practice')
  const [taskSuggestion, setTaskSuggestion] = useState('')
  const [scheduleFor, setScheduleFor] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)

  const thisWeekSessions = sessions.filter(s => isThisWeek(new Date(s.started_at), { weekStartsOn: 1 }))
  const totalMinutes = thisWeekSessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalHours = (totalMinutes / 60).toFixed(1)
  const sessionCount = thisWeekSessions.length

  // Most studied subject this week
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

  useEffect(() => {
    const loadLatestEnergy = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: checkins } = await supabase
        .from('energy_checkins')
        .select('energy_level, timestamp')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1)

      const latest = checkins?.[0]
      if (!latest) return

      const timestamp = new Date(latest.timestamp).getTime()
      const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60)
      if (ageHours <= 24) {
        const energy = latest.energy_level as EnergyLevel
        setEnergyCheck(energy)
      }
    }

    loadLatestEnergy()
  }, [])

  const filteredTasks = useMemo(() => {
    if (!subjectId) return tasks.filter((task) => !task.is_completed)
    return tasks.filter((task) => task.subject_id === subjectId && !task.is_completed)
  }, [tasks, subjectId])

  const suggestedTasks = useMemo(() => {
    return getSuggestedTasksForEnergy(tasks, energyCheck, subjectId || undefined)
  }, [tasks, energyCheck, subjectId])

  const taskBankSuggestions = useMemo(() => getTaskBankSuggestions(energyCheck, 4), [energyCheck])

  const upcomingScheduled = useMemo(
    () =>
      scheduledSessions
        .filter((session) => session.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
        .slice(0, 2),
    [scheduledSessions]
  )

  const finalDuration = customDuration.trim() ? Number.parseInt(customDuration, 10) : durationGoal

  const handleStartSession = () => {
    if (!subjectId) return

    const fallbackSuggestion = taskSuggestion.trim() || taskBankSuggestions[0] || ''

    const query = new URLSearchParams({
      subject: subjectId,
      duration: String(Number.isFinite(finalDuration) ? finalDuration : durationGoal),
      sessionType,
      energy: energyCheck,
      autostart: '1',
    })

    if (taskId) {
      query.set('task', taskId)
    }
    if (fallbackSuggestion) {
      query.set('objective', fallbackSuggestion)
      query.set('taskSuggestion', fallbackSuggestion)
    }

    router.push(`/dashboard/focus?${query.toString()}`)
  }

  const handleScheduleSession = async () => {
    if (!subjectId || !scheduleFor) return
    setSavingSchedule(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSavingSchedule(false)
      return
    }

    const fallbackSuggestion = taskSuggestion.trim() || taskBankSuggestions[0] || null

    const { error } = await supabase.from('scheduled_study_sessions').insert({
      user_id: user.id,
      subject_id: subjectId,
      task_id: taskId || null,
      task_suggestion: taskId ? null : fallbackSuggestion,
      duration_goal_minutes: Number.isFinite(finalDuration) ? finalDuration : durationGoal,
      energy_level: energyCheck,
      session_type: sessionType,
      scheduled_for: new Date(scheduleFor).toISOString(),
      status: 'scheduled',
    })

    setSavingSchedule(false)
    if (!error) {
      setStartOpen(false)
      setScheduleFor('')
      setTaskSuggestion('')
      router.refresh()
    }
  }

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
    
    <Dialog open={startOpen} onOpenChange={setStartOpen}>
      <DialogContent className="glass-card border-[var(--border)] bg-[var(--card)] max-w-md p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-[var(--card-fg)]">Start Study Session</DialogTitle>
          <p className="text-xs text-[var(--muted-fg)] mt-1">Quick setup before entering focus mode.</p>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Subject</label>
            <Select value={subjectId || 'none'} onValueChange={(value) => { setSubjectId(value === 'none' ? '' : value); setTaskId('') }}>
              <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                <SelectValue placeholder="Select subject..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a subject</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Energy Check</label>
              <Select value={energyCheck} onValueChange={(value: EnergyLevel) => setEnergyCheck(value)}>
                <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Session Type</label>
              <Select value={sessionType} onValueChange={(value: SessionType) => setSessionType(value)}>
                <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_content">New Content</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="passive">Passive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Task (optional)</label>
              {energyCheck && (
                <span className="text-[10px] text-[var(--muted-fg)] flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {energyCheck} energy suggestions
                </span>
              )}
            </div>
            <Select value={taskId || 'none'} onValueChange={(value) => {
              const next = value === 'none' ? '' : value
              setTaskId(next)
              if (next) setTaskSuggestion('')
            }}>
              <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                <SelectValue placeholder="Pick a task..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific task</SelectItem>
                {suggestedTasks.map((task) => (
                  <SelectItem key={`suggested-${task.id}`} value={task.id}>
                    <span className="block max-w-[280px] truncate">{task.title} (Suggested)</span>
                  </SelectItem>
                ))}
                {filteredTasks
                  .filter((task) => !suggestedTasks.some((suggested) => suggested.id === task.id))
                  .map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      <span className="block max-w-[280px] truncate">{task.title}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {!taskId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                Objective / custom task (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Master stoichiometry calculations"
                value={taskSuggestion}
                onChange={(event) => setTaskSuggestion(event.target.value)}
                className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
              />
            </div>
          )}

          {!taskId && (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/45 p-3">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                Task Bank Suggestions
              </label>
              <div className="space-y-1.5">
                {taskBankSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setTaskSuggestion(suggestion)}
                    className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs transition-smooth ${
                      taskSuggestion === suggestion
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                        : 'bg-[var(--card)] text-[var(--card-fg)] border-[var(--border)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Duration Goal</label>
            <div className="grid grid-cols-5 gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => { setDurationGoal(preset.value); setCustomDuration('') }}
                  className={`py-2 rounded-xl text-xs font-medium transition-smooth border ${
                    durationGoal === preset.value && !customDuration
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                      : 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)] hover:bg-[var(--card)]'
                  }`}
                >
                  {preset.value === 0 ? 'None' : preset.value}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              placeholder="Custom minutes (optional)"
              value={customDuration}
              onChange={(event) => setCustomDuration(event.target.value)}
              className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
            />
          </div>

          <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/45 p-3">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Schedule For Later (optional)</label>
            <input
              type="datetime-local"
              value={scheduleFor}
              onChange={(event) => setScheduleFor(event.target.value)}
              className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--card-fg)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleStartSession} disabled={!subjectId} className="h-11 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110">
              <Play className="h-4 w-4 mr-2" />
              Start Now
            </Button>
            <Button
              variant="outline"
              onClick={handleScheduleSession}
              disabled={!subjectId || !scheduleFor || savingSchedule}
              className="h-11 rounded-xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)]"
            >
              <CalendarClock className="h-4 w-4 mr-2" />
              {savingSchedule ? 'Saving...' : 'Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <QuickLogModal
      open={quickLogOpen}
      onOpenChange={setQuickLogOpen}
      subjects={subjects}
      tasks={tasks}
    />
    </>
  )
}
