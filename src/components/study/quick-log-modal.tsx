'use client'

import { useMemo, useState } from 'react'
import { Subject, Task, EnergyLevel } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'

interface QuickLogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  tasks: Task[]
}

const DURATION_PRESETS = [15, 25, 45, 60, 90]

export function QuickLogModal({ open, onOpenChange, subjects, tasks }: QuickLogModalProps) {
  const [subjectId, setSubjectId] = useState('')
  const [duration, setDuration] = useState(25)
  const [customDuration, setCustomDuration] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const router = useRouter()

  const filteredTasks = useMemo(() => {
    if (!subjectId) return tasks.filter((task) => !task.is_completed)
    return tasks.filter((task) => task.subject_id === subjectId && !task.is_completed)
  }, [tasks, subjectId])

  const finalDuration = customDuration.trim() ? Number.parseInt(customDuration, 10) : duration
  const canSubmit = Boolean(subjectId) && Number.isFinite(finalDuration) && finalDuration > 0

  const resetForm = () => {
    setSubjectId('')
    setDuration(25)
    setCustomDuration('')
    setExpanded(false)
    setTaskId('')
    setEnergyLevel('medium')
    setNotes('')
  }

  const handleSave = async () => {
    if (!canSubmit) return

    setSaving(true)
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const electronRuntime = isElectronRuntime()
    const localUserId = electronRuntime ? await getDesktopUserId() : null
    const userId = electronRuntime ? (localUserId ?? authUser?.id) : authUser?.id

    if (!userId) {
      setSaving(false)
      return
    }

    const minutes = customDuration.trim() ? Number.parseInt(customDuration, 10) : duration

    const startedAt = new Date(Date.now() - minutes * 60 * 1000).toISOString()

    const payload = {
      user_id: userId,
      subject_id: subjectId,
      task_id: expanded && taskId ? taskId : null,
      duration_minutes: minutes,
      duration_goal_minutes: minutes,
      actual_duration_minutes: minutes,
      energy_level: expanded ? energyLevel : 'medium',
      session_type: 'practice',
      productivity_rating: null,
      session_status: 'completed',
      notes: expanded && notes.trim() ? notes.trim() : null,
      started_at: startedAt,
    }

    let error: { message?: string } | null = null
    if (electronRuntime) {
      try {
        await invokeDesktopDb('createTableRecord', ['study_sessions', userId, payload])
      } catch (cause) {
        error = { message: cause instanceof Error ? cause.message : 'Unable to log session' }
      }
    } else {
      const response = await supabase.from('study_sessions').insert(payload)
      error = response.error
    }

    setSaving(false)

    if (!error) {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2200)
      resetForm()
      onOpenChange(false)
      if (!electronRuntime) {
        router.refresh()
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card border-[var(--border)] bg-[var(--card)] max-w-md p-0 gap-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-lg font-semibold text-[var(--card-fg)]">Quick Log Session</DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Subject (required)</label>
              <Select value={subjectId || 'none'} onValueChange={(value) => { setSubjectId(value === 'none' ? '' : value); setTaskId('') }}>
                <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                  <SelectValue placeholder="Select subject..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose a subject</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Duration (required)</label>
              <div className="grid grid-cols-5 gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { setDuration(preset); setCustomDuration('') }}
                    className={`py-2 rounded-xl text-xs font-medium transition-smooth border ${
                      duration === preset && !customDuration
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                        : 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)] hover:bg-[var(--card)]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                placeholder="Custom minutes"
                value={customDuration}
                onChange={(event) => setCustomDuration(event.target.value)}
                className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
              />
            </div>

            <button
              onClick={() => setExpanded((value) => !value)}
              className="w-full flex items-center justify-between text-xs font-medium uppercase tracking-wider text-[var(--muted-fg)] border border-[var(--border)] rounded-xl px-3 py-2 hover:bg-[var(--muted)] transition-smooth"
            >
              <span>Optional Details</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {expanded && (
              <div className="space-y-3 p-3 rounded-xl bg-[var(--muted)]/35 border border-[var(--border)]">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Task</label>
                  <Select value={taskId || 'none'} onValueChange={(value) => setTaskId(value === 'none' ? '' : value)}>
                    <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                      <SelectValue placeholder="Select task..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific task</SelectItem>
                      {filteredTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          <span className="block max-w-[280px] truncate">{task.title}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Energy Level</label>
                  <Select value={energyLevel} onValueChange={(value: EnergyLevel) => setEnergyLevel(value)}>
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
                  <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="What did you work on?"
                    rows={2}
                    className="bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)] resize-none"
                  />
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={!canSubmit || saving} className="w-full h-11 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110">
              {saving ? 'Logging...' : 'Log Session'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showToast && (
        <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm text-[var(--card-fg)]">Session logged</span>
        </div>
      )}
    </>
  )
}
