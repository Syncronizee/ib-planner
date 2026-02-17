'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Play, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EnergyLevel, SessionType, Subject, Task } from '@/lib/types'
import { getTaskBankSuggestions } from '@/lib/study-task-bank'
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

interface StudySessionSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  tasks: Task[]
  title?: string
  description?: string
  initialSubjectId?: string
  initialObjective?: string
  lockSubject?: boolean
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

export function StudySessionSetupDialog({
  open,
  onOpenChange,
  subjects,
  tasks,
  title = 'Start Study Session',
  description = 'Quick setup before entering focus mode.',
  initialSubjectId,
  initialObjective,
  lockSubject = false,
}: StudySessionSetupDialogProps) {
  const router = useRouter()
  const [latestEnergy, setLatestEnergy] = useState<EnergyLevel>('medium')
  const [subjectId, setSubjectId] = useState(initialSubjectId || '')
  const [taskId, setTaskId] = useState('')
  const [durationGoal, setDurationGoal] = useState(45)
  const [customDuration, setCustomDuration] = useState('')
  const [energyCheck, setEnergyCheck] = useState<EnergyLevel>('medium')
  const [sessionType, setSessionType] = useState<SessionType>('practice')
  const [taskSuggestion, setTaskSuggestion] = useState(initialObjective || '')
  const [scheduleFor, setScheduleFor] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)

  useEffect(() => {
    const loadLatestEnergy = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

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
        setLatestEnergy(energy)
      }
    }

    loadLatestEnergy()
  }, [])

   
  useEffect(() => {
    if (!open) return

    setSubjectId(initialSubjectId || '')
    setTaskId('')
    setDurationGoal(45)
    setCustomDuration('')
    setEnergyCheck(latestEnergy)
    setSessionType('practice')
    setTaskSuggestion(initialObjective || '')
    setScheduleFor('')
    setSavingSchedule(false)
  }, [open, initialObjective, initialSubjectId, latestEnergy])
   

  const filteredTasks = useMemo(() => {
    if (!subjectId) return tasks.filter((task) => !task.is_completed)
    return tasks.filter((task) => task.subject_id === subjectId && !task.is_completed)
  }, [tasks, subjectId])

  const suggestedTasks = useMemo(() => {
    return getSuggestedTasksForEnergy(tasks, energyCheck, subjectId || undefined)
  }, [tasks, energyCheck, subjectId])

  const taskBankSuggestions = useMemo(() => getTaskBankSuggestions(energyCheck, 4), [energyCheck])
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

    onOpenChange(false)
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
      onOpenChange(false)
      router.refresh()
    }
  }

  const lockedSubject = lockSubject ? subjects.find((subject) => subject.id === subjectId) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-[var(--border)] bg-[var(--card)] w-[min(96vw,56rem)] max-w-[56rem] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-[var(--card-fg)]">{title}</DialogTitle>
          <p className="text-xs text-[var(--muted-fg)] mt-1">{description}</p>
        </DialogHeader>

        <div className="px-5 sm:px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Subject</label>
            {lockSubject ? (
              <div className="h-9 rounded-xl border border-[var(--border)] bg-[var(--muted)]/60 px-3 text-sm text-[var(--card-fg)] flex items-center">
                {lockedSubject?.name || 'No subject selected'}
              </div>
            ) : (
              <Select value={subjectId || 'none'} onValueChange={(value) => {
                setSubjectId(value === 'none' ? '' : value)
                setTaskId('')
              }}>
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
            )}
          </div>

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

          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Task (optional)</label>
              <span className="text-[10px] text-[var(--muted-fg)] flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {energyCheck} energy suggestions
              </span>
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
            <div className="space-y-1.5 sm:col-span-2">
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
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/45 p-3 sm:col-span-2">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                Task Bank Suggestions
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
            <div className="grid grid-cols-3 gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setDurationGoal(preset.value)
                    setCustomDuration('')
                  }}
                  className={`h-11 rounded-xl text-xs font-medium transition-smooth border ${
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

          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <Button onClick={handleStartSession} disabled={!subjectId} className="h-14 rounded-2xl bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110 flex-col gap-1">
              <Play className="h-4 w-4" />
              Start Now
            </Button>
            <Button
              variant="outline"
              onClick={handleScheduleSession}
              disabled={!subjectId || !scheduleFor || savingSchedule}
              className="h-14 rounded-2xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)] flex-col gap-1"
            >
              <CalendarClock className="h-4 w-4" />
              {savingSchedule ? 'Saving...' : 'Schedule'}
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
