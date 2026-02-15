'use client'

import { useState } from 'react'
import { Task, Subject } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Target,
  AlertTriangle,
  CalendarIcon,
  Check,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { format, startOfWeek } from 'date-fns'
import { useRouter } from 'next/navigation'

interface PlanWeekFlowProps {
  subjects: Subject[]
  tasks: Task[]
}

export function PlanWeekFlow({ subjects, tasks }: PlanWeekFlowProps) {
  const [step, setStep] = useState(1)
  const [hardestTaskId, setHardestTaskId] = useState<string>('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [weakestSubjectId, setWeakestSubjectId] = useState<string>(() => {
    // Pre-populate with lowest confidence subject
    if (subjects.length === 0) return ''
    const weakest = subjects.reduce((min, s) => s.confidence < min.confidence ? s : min, subjects[0])
    return weakest.id
  })
  const [hardestDate, setHardestDate] = useState<Date | undefined>(undefined)
  const [weakestDate, setWeakestDate] = useState<Date | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    let taskId = hardestTaskId

    // Create new task if user typed one
    if (!taskId && newTaskTitle.trim()) {
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: newTaskTitle.trim(),
          is_completed: false,
          priority: 'high',
          category: 'homework',
          due_date: hardestDate ? format(hardestDate, 'yyyy-MM-dd') : null,
        })
        .select()
        .single()

      if (newTask) taskId = newTask.id
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday

    await supabase.from('weekly_plans').insert({
      user_id: user.id,
      week_start_date: format(weekStart, 'yyyy-MM-dd'),
      hardest_task_id: taskId || null,
      weakest_subject_id: weakestSubjectId || null,
      hardest_task_scheduled_time: hardestDate ? hardestDate.toISOString() : null,
      weakest_subject_scheduled_time: weakestDate ? weakestDate.toISOString() : null,
      hardest_task_completed: false,
      weakest_subject_completed: false,
    })

    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  if (saved) {
    return (
      <div className="glass-card p-8 text-center space-y-4">
        <div className="p-4 rounded-full bg-green-500/10 border border-green-500/30 w-fit mx-auto">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--card-fg)]">Week Planned!</h2>
        <p className="text-sm text-[var(--muted-fg)]">Your plan is saved. You&apos;ll see it on your dashboard.</p>
        <Button onClick={() => router.push('/dashboard')} className="btn-glass rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Plan Your Week</h1>
            <p className="text-xs text-[var(--muted-fg)]">Step {step} of 3</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-smooth ${
                s <= step ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Hardest Task */}
      {step === 1 && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <Target className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--card-fg)]">What&apos;s the hardest task this week?</h2>
              <p className="text-xs text-[var(--muted-fg)]">Tackling the hardest thing first builds momentum.</p>
            </div>
          </div>

          {tasks.length > 0 && (
            <Select value={hardestTaskId} onValueChange={setHardestTaskId}>
              <SelectTrigger className="bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                <SelectValue placeholder="Select from existing tasks..." />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-xs text-[var(--muted-fg)]">or create new</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <Input
            placeholder="Type a new task..."
            value={newTaskTitle}
            onChange={e => { setNewTaskTitle(e.target.value); setHardestTaskId('') }}
            className="bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
          />

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!hardestTaskId && !newTaskTitle.trim()}
              className="btn-glass rounded-xl"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Weakest Subject */}
      {step === 2 && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--card-fg)]">What&apos;s your weakest subject?</h2>
              <p className="text-xs text-[var(--muted-fg)]">Focus on what needs the most improvement.</p>
            </div>
          </div>

          {subjects.length > 0 ? (
            <div className="space-y-2">
              {subjects
                .sort((a, b) => a.confidence - b.confidence)
                .map(subject => (
                  <button
                    key={subject.id}
                    onClick={() => setWeakestSubjectId(subject.id)}
                    className={`w-full p-3 rounded-xl border transition-smooth text-left flex items-center justify-between ${
                      weakestSubjectId === subject.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--card)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full bg-${subject.color}-500`} />
                      <span className="text-sm font-medium text-[var(--card-fg)]">{subject.name}</span>
                      <span className="text-xs text-[var(--muted-fg)]">{subject.level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted-fg)]">Confidence: {subject.confidence}/5</span>
                      {weakestSubjectId === subject.id && (
                        <Check className="h-4 w-4 text-[var(--accent)]" />
                      )}
                    </div>
                  </button>
                ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-fg)] text-center py-4">
              Add subjects on the dashboard first.
            </p>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)] rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setStep(3)} className="btn-glass rounded-xl">
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Schedule */}
      {step === 3 && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <CalendarIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--card-fg)]">When will you work on these?</h2>
              <p className="text-xs text-[var(--muted-fg)]">Scheduling makes it real.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Hardest task schedule */}
            <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] space-y-2">
              <p className="text-sm font-medium text-[var(--card-fg)]">
                Hardest task: {hardestTaskId ? tasks.find(t => t.id === hardestTaskId)?.title : newTaskTitle}
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-sm bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--muted)]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {hardestDate ? format(hardestDate, 'EEEE, MMM d') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={hardestDate} onSelect={setHardestDate} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Weakest subject schedule */}
            {weakestSubjectId && (
              <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] space-y-2">
                <p className="text-sm font-medium text-[var(--card-fg)]">
                  Weakest subject: {subjects.find(s => s.id === weakestSubjectId)?.name}
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-sm bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--muted)]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {weakestDate ? format(weakestDate, 'EEEE, MMM d') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={weakestDate} onSelect={setWeakestDate} />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} className="bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)] rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-glass rounded-xl">
              {saving ? 'Saving...' : 'Save Plan'}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
