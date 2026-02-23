'use client'

import { useState } from 'react'
import { Subject, EnergyLevel, SessionType, ENERGY_LEVELS, SESSION_TYPES } from '@/lib/types'
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
import { BookOpen, Zap, Gauge, Battery } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'

interface SessionLoggerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
}

const DURATION_PRESETS = [25, 45, 60, 90]

const ENERGY_ICONS: Record<string, typeof Zap> = {
  high: Zap,
  medium: Gauge,
  low: Battery,
}

export function SessionLoggerModal({ open, onOpenChange, subjects }: SessionLoggerModalProps) {
  const [subjectId, setSubjectId] = useState<string>('')
  const [duration, setDuration] = useState<number>(45)
  const [customDuration, setCustomDuration] = useState<string>('')
  const [energy, setEnergy] = useState<EnergyLevel>('medium')
  const [sessionType, setSessionType] = useState<SessionType>('practice')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSave = async () => {
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

    const finalDuration = customDuration ? parseInt(customDuration) : duration

    const payload = {
      user_id: userId,
      subject_id: subjectId || null,
      duration_minutes: finalDuration,
      energy_level: energy,
      session_type: sessionType,
      notes: notes.trim() || null,
      started_at: new Date().toISOString(),
    }

    if (electronRuntime) {
      await invokeDesktopDb('createTableRecord', ['study_sessions', userId, payload])
      // Reset form
      setSubjectId('')
      setDuration(45)
      setCustomDuration('')
      setEnergy('medium')
      setSessionType('practice')
      setNotes('')
      onOpenChange(false)
      setSaving(false)
      return
    }

    const { error } = await supabase.from('study_sessions').insert(payload)

    if (!error) {
      // Reset form
      setSubjectId('')
      setDuration(45)
      setCustomDuration('')
      setEnergy('medium')
      setSessionType('practice')
      setNotes('')
      onOpenChange(false)
      router.refresh()
    }

    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-[var(--border)] bg-[var(--card)] max-w-md p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-[var(--card-fg)]">
            Log Study Session
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Subject</label>
            <Select value={subjectId || 'none'} onValueChange={(v) => setSubjectId(v === 'none' ? '' : v)}>
              <SelectTrigger className="bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                <SelectValue placeholder="Select subject..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General / No subject</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Duration (minutes)</label>
            <div className="flex gap-2">
              {DURATION_PRESETS.map(d => (
                <button
                  key={d}
                  onClick={() => { setDuration(d); setCustomDuration('') }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-smooth border ${
                    duration === d && !customDuration
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                      : 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)] hover:bg-[var(--card)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Custom minutes..."
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
            />
          </div>

          {/* Energy Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Energy Level</label>
            <div className="flex gap-2">
              {ENERGY_LEVELS.map(level => {
                const Icon = ENERGY_ICONS[level.value]
                return (
                  <button
                    key={level.value}
                    onClick={() => setEnergy(level.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-smooth border flex items-center justify-center gap-1.5 ${
                      energy === level.value
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                        : 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)] hover:bg-[var(--card)]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {level.value.charAt(0).toUpperCase() + level.value.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Session Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Session Type</label>
            <Select value={sessionType} onValueChange={(v: SessionType) => setSessionType(v)}>
              <SelectTrigger className="bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Notes (optional)</label>
            <Textarea
              placeholder="What did you work on?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)] resize-none"
            />
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full btn-glass rounded-xl">
            <BookOpen className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Log Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
