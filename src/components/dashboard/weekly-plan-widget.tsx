'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Check, Circle, ClipboardList, Play, SquarePen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'
import type { Subject, WeeklyPriority } from '@/lib/types'
import { formatPrioritySchedule, getPriorityStatus, getWeekRangeLabel } from '@/lib/weekly-planning'
import { PriorityCompletionDialog } from './priority-completion-dialog'

type WeeklyPlanWidgetProps = {
  priorities: WeeklyPriority[]
  subjects: Subject[]
}

const SUBJECT_BADGE_STYLES: Record<string, string> = {
  slate: 'bg-slate-500/15 text-[var(--card-fg)] border-slate-500/25',
  red: 'bg-red-500/15 text-[var(--card-fg)] border-red-500/25',
  orange: 'bg-orange-500/15 text-[var(--card-fg)] border-orange-500/25',
  amber: 'bg-amber-500/15 text-[var(--card-fg)] border-amber-500/25',
  green: 'bg-green-500/15 text-[var(--card-fg)] border-green-500/25',
  blue: 'bg-blue-500/15 text-[var(--card-fg)] border-blue-500/25',
  purple: 'bg-purple-500/15 text-[var(--card-fg)] border-purple-500/25',
  pink: 'bg-pink-500/15 text-[var(--card-fg)] border-pink-500/25',
}

const SUBJECT_DOT_COLORS: Record<string, string> = {
  slate: '#64748b',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
}

function getSubjectBadgeClass(color?: string | null) {
  if (!color) {
    return 'bg-[var(--muted)] text-[var(--card-fg)] border-[var(--border)]'
  }

  return SUBJECT_BADGE_STYLES[color] ?? 'bg-[var(--muted)] text-[var(--card-fg)] border-[var(--border)]'
}

async function updatePriorityRecord(priority: WeeklyPriority, patch: Partial<WeeklyPriority>) {
  if (isElectronRuntime()) {
    const userId = await getDesktopUserId()
    if (!userId) {
      throw new Error('No local user session found.')
    }

    await invokeDesktopDb('updateTableRecords', [
      'weekly_priorities',
      userId,
      { id: priority.id },
      patch,
    ])

    if (priority.task_id) {
      await invokeDesktopDb('updateTask', [
        priority.task_id,
        userId,
        {
          is_completed: patch.is_completed,
          completed_at: patch.completed_at ?? null,
        },
      ])
    }
    return
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('weekly_priorities')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', priority.id)

  if (error) {
    throw error
  }

  if (priority.task_id) {
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        is_completed: patch.is_completed,
        completed_at: patch.completed_at ?? null,
      })
      .eq('id', priority.task_id)

    if (taskError) {
      throw taskError
    }
  }
}

export function WeeklyPlanWidget({ priorities, subjects }: WeeklyPlanWidgetProps) {
  const router = useRouter()
  const [localPriorities, setLocalPriorities] = useState(() => [...priorities].sort((a, b) => a.priority_number - b.priority_number))
  const [completionTarget, setCompletionTarget] = useState<WeeklyPriority | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const totalCount = localPriorities.length
  const completedCount = localPriorities.filter((priority) => priority.is_completed).length
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
  const weekLabel = localPriorities[0] ? getWeekRangeLabel(localPriorities[0].week_start) : null

  const subjectById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects]
  )

  const applyLocalPatch = (priorityId: string, patch: Partial<WeeklyPriority>) => {
    setLocalPriorities((current) => current.map((priority) => (
      priority.id === priorityId ? { ...priority, ...patch } : priority
    )))
  }

  const handleToggle = async (priority: WeeklyPriority) => {
    if (priority.is_completed) {
      await updatePriorityRecord(priority, {
        is_completed: false,
        completed_at: null,
        reflection_rating: null,
        reflection_notes: null,
      })
      applyLocalPatch(priority.id, {
        is_completed: false,
        completed_at: null,
        reflection_rating: null,
        reflection_notes: null,
      })
      window.dispatchEvent(new CustomEvent('weekly-priorities-updated'))
      return
    }

    setCompletionTarget(priority)
  }

  const handleComplete = async (reflection: { rating: number | null; notes: string }) => {
    if (!completionTarget) {
      return
    }

    setSubmitting(true)

    try {
      const patch = {
        is_completed: true,
        completed_at: new Date().toISOString(),
        reflection_rating: reflection.rating,
        reflection_notes: reflection.notes || null,
      }

      await updatePriorityRecord(completionTarget, patch)
      applyLocalPatch(completionTarget.id, patch)
      setCompletionTarget(null)
      window.dispatchEvent(new CustomEvent('weekly-priorities-updated'))
    } finally {
      setSubmitting(false)
    }
  }

  if (totalCount === 0) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60">
            <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-[var(--card-fg)]">This Week&apos;s Plan</h2>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 p-5 space-y-4">
          <p className="text-sm text-[var(--card-fg)]">You have not planned your week yet.</p>
          <p className="text-sm text-[var(--muted-fg)]">
            Taking two minutes to define your top priorities usually makes the rest of the week easier to steer.
          </p>
          <Link href="/dashboard/plan">
            <Button className="rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110">
              <CalendarDays className="mr-2 h-4 w-4" />
              Plan My Week
            </Button>
          </Link>
          <Link href="/dashboard/plan?week=next">
            <Button variant="outline" className="rounded-xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)]">
              Plan Next Week
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60">
            <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold uppercase tracking-wide text-[var(--card-fg)]">This Week&apos;s Plan</h2>
            <p className="text-xs text-[var(--muted-fg)]">{weekLabel}</p>
          </div>
        </div>
        <span className="text-xs text-[var(--muted-fg)]">{completedCount}/{totalCount} completed</span>
      </div>

      <div className="space-y-3">
        {localPriorities.map((priority) => {
          const subject = priority.subject_id ? subjectById.get(priority.subject_id) : null
          const status = getPriorityStatus(priority)
          const isToday = status.label === 'Today!' && !priority.is_completed
          const cardClass = priority.is_completed
            ? 'border-green-500/25 bg-green-500/8'
            : status.tone === 'today'
              ? 'border-amber-500/35 bg-amber-500/8'
              : status.tone === 'overdue'
                ? 'border-red-500/35 bg-red-500/8'
                : 'border-[var(--border)] bg-[var(--muted)]/28'

          return (
            <div key={priority.id} className={`rounded-2xl border p-4 transition-smooth ${cardClass}`}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => { void handleToggle(priority) }}
                  className="mt-0.5 rounded-full"
                >
                  {priority.is_completed ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-[var(--muted-fg)]" />
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${priority.is_completed ? 'line-through text-[var(--muted-fg)]' : 'text-[var(--card-fg)]'}`}>
                      {priority.title}
                    </p>
                    {subject ? (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getSubjectBadgeClass(subject.color)}`}>
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: SUBJECT_DOT_COLORS[subject.color] ?? 'var(--accent)' }}
                        />
                        <span>{subject.name}</span>
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        status.tone === 'today'
                          ? 'bg-amber-500/15 text-amber-300'
                          : status.tone === 'overdue'
                            ? 'bg-red-500/15 text-red-300'
                            : status.tone === 'completed'
                              ? 'bg-green-500/15 text-green-300'
                              : 'bg-[var(--muted)] text-[var(--muted-fg)]'
                      }`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--muted-fg)]">{formatPrioritySchedule(priority)}</p>

                  {isToday ? (
                    <Button
                      type="button"
                      onClick={() => router.push(`/dashboard/focus?priority=${priority.id}`)}
                      className="h-8 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110"
                    >
                      <Play className="mr-2 h-3.5 w-3.5" />
                      Start Focus Session
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/plan">
            <Button variant="outline" className="rounded-xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)]">
              <SquarePen className="mr-2 h-4 w-4" />
              Edit Plan
            </Button>
          </Link>
          <Link href="/dashboard/plan?week=next">
            <Button variant="outline" className="rounded-xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)]">
              Plan Next Week
            </Button>
          </Link>
        </div>
      </div>

      <PriorityCompletionDialog
        open={Boolean(completionTarget)}
        priorityTitle={completionTarget?.title ?? ''}
        submitting={submitting}
        onSkip={() => setCompletionTarget(null)}
        onComplete={handleComplete}
      />
    </div>
  )
}
