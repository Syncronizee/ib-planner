'use client'

import { useState } from 'react'
import { Task, Subject, EnergyLevel, ENERGY_LEVELS } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, Gauge, Battery, X, CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface EnergyCheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  subjects: Subject[]
}

const ENERGY_ICONS = {
  high: Zap,
  medium: Gauge,
  low: Battery,
}

const ENERGY_COLORS = {
  high: 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20',
  medium: 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20',
  low: 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20',
}

const ENERGY_ICON_COLORS = {
  high: 'text-green-400',
  medium: 'text-amber-400',
  low: 'text-blue-400',
}

function getTasksForEnergy(tasks: Task[], energy: EnergyLevel, subjects: Subject[]): Task[] {
  const incompleteTasks = tasks.filter(t => !t.is_completed)

  // If task has an explicit energy_level, use that
  const explicitMatch = incompleteTasks.filter(t => t.energy_level === energy)

  // Otherwise, infer from priority and category
  const inferredMatch = incompleteTasks.filter(t => {
    if (t.energy_level) return false // already matched above
    switch (energy) {
      case 'high':
        return t.priority === 'high' || t.category === 'assessment' || t.category === 'project'
      case 'medium':
        return t.priority === 'medium' || t.category === 'homework' || t.category === 'revision'
      case 'low':
        return t.priority === 'low' || t.category === 'personal' || t.category === 'other'
      default:
        return false
    }
  })

  return [...explicitMatch, ...inferredMatch].slice(0, 8)
}

export function EnergyCheckinModal({ open, onOpenChange, tasks, subjects }: EnergyCheckinModalProps) {
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSelect = async (level: EnergyLevel) => {
    setSelectedEnergy(level)
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('energy_checkins').insert({
        user_id: user.id,
        energy_level: level,
        timestamp: new Date().toISOString(),
      })
    }

    setSaving(false)
  }

  const handleClose = () => {
    setSelectedEnergy(null)
    onOpenChange(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('energy-checkin-dismissed', new Date().toISOString())
    handleClose()
  }

  const suggestedTasks = selectedEnergy ? getTasksForEnergy(tasks, selectedEnergy, subjects) : []

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return null
    return subjects.find(s => s.id === subjectId)?.name || null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-[var(--border)] bg-[var(--card)] max-w-lg p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-[var(--card-fg)]">
              {selectedEnergy ? 'Suggested Tasks' : "What's your energy level right now?"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-8 w-8 text-[var(--muted-fg)] hover:text-[var(--card-fg)]">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {!selectedEnergy && (
            <p className="text-sm text-[var(--muted-fg)] mt-1">
              Pick your current energy to get matched with the right tasks.
            </p>
          )}
        </DialogHeader>

        <div className="px-6 pb-6">
          {!selectedEnergy ? (
            <div className="space-y-3">
              {ENERGY_LEVELS.map((level) => {
                const Icon = ENERGY_ICONS[level.value]
                return (
                  <button
                    key={level.value}
                    onClick={() => handleSelect(level.value)}
                    disabled={saving}
                    className={`w-full p-4 rounded-xl border transition-smooth text-left ${ENERGY_COLORS[level.value]}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-[var(--muted)] border border-[var(--border)]`}>
                        <Icon className={`h-5 w-5 ${ENERGY_ICON_COLORS[level.value]}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--card-fg)]">{level.label}</p>
                        <p className="text-xs text-[var(--muted-fg)] mt-0.5">{level.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[var(--muted-fg)]" />
                    </div>
                  </button>
                )
              })}

              <button
                onClick={handleDismiss}
                className="w-full text-center text-xs text-[var(--muted-fg)] hover:text-[var(--card-fg)] transition-smooth py-2"
              >
                Skip for now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected energy badge */}
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = ENERGY_ICONS[selectedEnergy]
                  return (
                    <Badge className={`${ENERGY_COLORS[selectedEnergy]} border text-xs`}>
                      <Icon className={`h-3 w-3 mr-1 ${ENERGY_ICON_COLORS[selectedEnergy]}`} />
                      {ENERGY_LEVELS.find(l => l.value === selectedEnergy)?.label}
                    </Badge>
                  )
                })()}
                <button
                  onClick={() => setSelectedEnergy(null)}
                  className="text-xs text-[var(--muted-fg)] hover:text-[var(--card-fg)] transition-smooth"
                >
                  Change
                </button>
              </div>

              {/* Suggested tasks */}
              {suggestedTasks.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {suggestedTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] transition-smooth hover:bg-[var(--card)]"
                    >
                      <Circle className="h-4 w-4 mt-0.5 text-[var(--muted-fg)]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--card-fg)]">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getSubjectName(task.subject_id) && (
                            <span className="text-[10px] text-[var(--muted-fg)]">
                              {getSubjectName(task.subject_id)}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-[10px] text-[var(--muted-fg)]">
                              Due {format(new Date(task.due_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-[var(--muted-fg)] mb-2" />
                  <p className="text-sm text-[var(--muted-fg)]">No matching tasks found.</p>
                  <p className="text-xs text-[var(--muted-fg)] mt-1">Add tasks with priorities to get suggestions.</p>
                </div>
              )}

              <Button onClick={handleClose} className="w-full btn-glass rounded-xl">
                Got it, let&apos;s go
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
