'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Lightbulb, Save, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'
import { TASK_CATEGORIES } from '@/lib/types'
import type { ScheduledStudySession, Subject, Task, WeeklyPriority } from '@/lib/types'
import {
  buildPriorityScheduledFor,
  calculateScheduledDurationMinutes,
  getDateFromDayNumber,
  getPriorityCalendarMarker,
  getWeekRangeLabel,
  TIME_PRESETS,
  WEEKDAY_OPTIONS,
  WEEKLY_PRIORITY_SLOTS,
} from '@/lib/weekly-planning'

type WeeklyPriorityPlannerProps = {
  subjects: Subject[]
  initialPriorities: WeeklyPriority[]
  weekStart: string
  weekVariant: 'current' | 'next'
}

type DraftPriority = {
  id: string | null
  task_id: string | null
  task_category: Task['category']
  title: string
  subject_id: string | null
  scheduled_day: number | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  is_completed: boolean
  completed_at: string | null
  reflection_rating: number | null
  reflection_notes: string | null
}

function formatSaveError(cause: unknown) {
  if (cause instanceof Error) {
    return cause.message
  }

  if (cause && typeof cause === 'object') {
    const message = 'message' in cause && typeof cause.message === 'string' ? cause.message : null
    const details = 'details' in cause && typeof cause.details === 'string' ? cause.details : null
    const hint = 'hint' in cause && typeof cause.hint === 'string' ? cause.hint : null
    return [message, details, hint].filter(Boolean).join(' ').trim() || 'Unable to save this week plan'
  }

  return 'Unable to save this week plan'
}

function buildInitialDraft(priorities: WeeklyPriority[]) {
  const bySlot = new Map(priorities.map((priority) => [priority.priority_number, priority]))

  return Array.from({ length: WEEKLY_PRIORITY_SLOTS }, (_, index) => {
    const priority = bySlot.get((index + 1) as 1 | 2 | 3)
    return {
      id: priority?.id ?? null,
      task_id: priority?.task_id ?? null,
      task_category: priority?.task_category ?? 'project',
      title: priority?.title ?? '',
      subject_id: priority?.subject_id ?? null,
      scheduled_day: priority?.scheduled_day ?? null,
      scheduled_start_time: priority?.scheduled_start_time ?? null,
      scheduled_end_time: priority?.scheduled_end_time ?? null,
      is_completed: priority?.is_completed ?? false,
      completed_at: priority?.completed_at ?? null,
      reflection_rating: priority?.reflection_rating ?? null,
      reflection_notes: priority?.reflection_notes ?? null,
    } satisfies DraftPriority
  })
}

async function resolveDesktopUserId() {
  const userId = await getDesktopUserId()
  if (!userId) {
    throw new Error('No local user session found.')
  }

  return userId
}

export function WeeklyPriorityPlanner({
  subjects,
  initialPriorities,
  weekStart,
  weekVariant,
}: WeeklyPriorityPlannerProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [drafts, setDrafts] = useState<DraftPriority[]>(() => buildInitialDraft(initialPriorities))
  const [addToCalendar, setAddToCalendar] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCount = drafts.filter((draft) => draft.title.trim().length > 0).length
  const hasInvalidDuration = drafts.some((draft) => {
    if (!draft.title.trim()) {
      return false
    }

    const duration = calculateScheduledDurationMinutes(draft)
    return Boolean(draft.scheduled_start_time && draft.scheduled_end_time && duration === null)
  })

  const setDraft = (index: number, patch: Partial<DraftPriority>) => {
    setDrafts((current) => current.map((draft, draftIndex) => (
      draftIndex === index ? { ...draft, ...patch } : draft
    )))
  }

  const switchWeek = (nextVariant: 'current' | 'next') => {
    router.push(nextVariant === 'next' ? '/dashboard/plan?week=next' : '/dashboard/plan')
  }

  const syncLinkedTask = async (draft: DraftPriority) => {
    const scheduledDate = getDateFromDayNumber(weekStart, draft.scheduled_day)
    const dueDate = scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null
    const taskPayload = {
      title: draft.title.trim(),
      subject_id: draft.subject_id,
      due_date: dueDate,
      is_completed: draft.is_completed,
      completed_at: draft.is_completed ? (draft.completed_at ?? new Date().toISOString()) : null,
    }

    if (isElectronRuntime()) {
      const userId = await resolveDesktopUserId()

      if (draft.task_id) {
        return invokeDesktopDb('updateTask', [draft.task_id, userId, taskPayload])
      }

      return invokeDesktopDb('createTask', [
        userId,
        {
          ...taskPayload,
          priority: 'high',
          category: draft.task_category,
          description: null,
        },
      ])
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    if (draft.task_id) {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskPayload)
        .eq('id', draft.task_id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        ...taskPayload,
        priority: 'high',
        category: draft.task_category,
        description: null,
        linked_assessment_id: null,
        energy_level: null,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return data
  }

  const persistCalendarEvent = async (priority: WeeklyPriority, enabled: boolean) => {
    const marker = getPriorityCalendarMarker(priority.id)
    const scheduledFor = buildPriorityScheduledFor(priority.week_start, priority.scheduled_day, priority.scheduled_start_time)
    const duration = calculateScheduledDurationMinutes(priority)

    if (isElectronRuntime()) {
      const userId = await resolveDesktopUserId()
      const existing = await invokeDesktopDb<ScheduledStudySession[]>('queryTable', [
        'scheduled_study_sessions',
        {
          userId,
          filters: { notes: marker },
          limit: 1,
        },
      ])

      if (!enabled || !scheduledFor) {
        if (existing[0]?.id) {
          await invokeDesktopDb('updateTableRecords', [
            'scheduled_study_sessions',
            userId,
            { id: existing[0].id },
            { status: 'cancelled' },
          ])
        }
        return
      }

      const payload = {
        subject_id: priority.subject_id,
        task_id: null,
        objective: priority.title,
        task_suggestion: priority.title,
        duration_goal_minutes: duration,
        energy_level: 'medium',
        session_type: 'practice',
        scheduled_for: scheduledFor,
        status: existing[0]?.status === 'completed' ? 'completed' : 'scheduled',
        notes: marker,
      }

      if (existing[0]?.id) {
        await invokeDesktopDb('updateTableRecords', [
          'scheduled_study_sessions',
          userId,
          { id: existing[0].id },
          payload,
        ])
      } else {
        await invokeDesktopDb('createTableRecord', [
          'scheduled_study_sessions',
          userId,
          {
            user_id: userId,
            ...payload,
          },
        ])
      }

      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const { data: existing } = await supabase
      .from('scheduled_study_sessions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('notes', marker)
      .limit(1)

    const existingRow = existing?.[0] as ScheduledStudySession | undefined

    if (!enabled || !scheduledFor) {
      if (existingRow?.id) {
        await supabase
          .from('scheduled_study_sessions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRow.id)
      }
      return
    }

    const payload = {
      user_id: user.id,
      subject_id: priority.subject_id,
      task_id: null,
      objective: priority.title,
      task_suggestion: priority.title,
      duration_goal_minutes: duration,
      energy_level: 'medium',
      session_type: 'practice',
      scheduled_for: scheduledFor,
      status: existingRow?.status === 'completed' ? 'completed' : 'scheduled',
      notes: marker,
      updated_at: new Date().toISOString(),
    }

    if (existingRow?.id) {
      await supabase
        .from('scheduled_study_sessions')
        .update(payload)
        .eq('id', existingRow.id)
    } else {
      await supabase.from('scheduled_study_sessions').insert(payload)
    }
  }

  const deletePriority = async (draft: DraftPriority) => {
    if (!draft.id) {
      return
    }

    if (isElectronRuntime()) {
      const userId = await resolveDesktopUserId()
      await invokeDesktopDb('deleteTableRecords', ['weekly_priorities', userId, { id: draft.id }])
      if (draft.task_id) {
        await invokeDesktopDb('deleteTask', [draft.task_id, userId])
      }
      return
    }

    const supabase = createClient()
    await supabase.from('weekly_priorities').delete().eq('id', draft.id)
    if (draft.task_id) {
      await supabase.from('tasks').delete().eq('id', draft.task_id)
    }
  }

  const savePriority = async (slot: number, draft: DraftPriority) => {
    const linkedTask = await syncLinkedTask(draft)
    const commonPayload = {
      week_start: weekStart,
      priority_number: slot as 1 | 2 | 3,
      title: draft.title.trim(),
      task_id: typeof linkedTask?.id === 'string' ? linkedTask.id : draft.task_id,
      task_category: draft.task_category,
      subject_id: draft.subject_id,
      scheduled_day: draft.scheduled_day,
      scheduled_start_time: draft.scheduled_start_time,
      scheduled_end_time: draft.scheduled_end_time,
      is_completed: draft.is_completed,
      completed_at: draft.completed_at,
      reflection_rating: draft.reflection_rating,
      reflection_notes: draft.reflection_notes,
    }

    if (isElectronRuntime()) {
      const userId = await resolveDesktopUserId()
      if (draft.id) {
        const rows = await invokeDesktopDb<WeeklyPriority[]>('updateTableRecords', [
          'weekly_priorities',
          userId,
          { id: draft.id },
          commonPayload,
        ])
        return rows[0]
      }

      return invokeDesktopDb<WeeklyPriority>('createTableRecord', [
        'weekly_priorities',
        userId,
        {
          user_id: userId,
          ...commonPayload,
        },
      ])
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    if (draft.id) {
      const { data, error: updateError } = await supabase
        .from('weekly_priorities')
        .update({
          ...commonPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft.id)
        .select('*')
        .single()

      if (updateError) {
        throw updateError
      }

      return data as WeeklyPriority
    }

    const { data, error: insertError } = await supabase
      .from('weekly_priorities')
      .insert({
        user_id: user.id,
        ...commonPayload,
      })
      .select('*')
      .single()

    if (insertError) {
      throw insertError
    }

    return data as WeeklyPriority
  }

  const handleSkip = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`weekly-plan-skipped:${weekStart}`, '1')
    }
    router.push('/dashboard')
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const nextDrafts = [...drafts]

      for (let index = 0; index < nextDrafts.length; index += 1) {
        const draft = nextDrafts[index]
        const hasTitle = draft.title.trim().length > 0

        if (!hasTitle) {
          if (draft.id) {
            await deletePriority(draft)
          }
          nextDrafts[index] = { ...draft, id: null, task_id: null }
          continue
        }

        const savedPriority = await savePriority(index + 1, draft)
        await persistCalendarEvent(savedPriority, addToCalendar)
        nextDrafts[index] = { ...draft, id: savedPriority.id, task_id: savedPriority.task_id }
      }

      setDrafts(nextDrafts)
      window.dispatchEvent(new CustomEvent('weekly-priorities-updated'))
      window.dispatchEvent(new CustomEvent('scheduled-sessions-updated'))
      router.push('/dashboard')
      router.refresh()
    } catch (cause) {
      setError(formatSaveError(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold uppercase tracking-wide text-[var(--card-fg)]">Plan Your Week</h1>
            <p className="text-xs text-[var(--muted-fg)]">{getWeekRangeLabel(weekStart)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => switchWeek('current')}
            className={`rounded-xl px-3 py-2 text-sm transition-smooth ${
              weekVariant === 'current'
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'bg-[var(--muted)] text-[var(--card-fg)]'
            }`}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => switchWeek('next')}
            className={`rounded-xl px-3 py-2 text-sm transition-smooth ${
              weekVariant === 'next'
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'bg-[var(--muted)] text-[var(--card-fg)]'
            }`}
          >
            Next Week
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          {[1, 2].map((segment) => (
            <div
              key={segment}
              className={`h-1.5 flex-1 rounded-full ${segment <= step ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'}`}
            />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <div className="glass-card p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--card-fg)]">What are the most important things this week?</h2>
            <p className="text-sm text-[var(--muted-fg)]">
              Think about deadlines, exam prep, things you have been avoiding, or areas you need to improve.
            </p>
          </div>

          <div className="space-y-4">
            {drafts.map((draft, index) => (
              <div key={index} className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/35 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--muted-fg)]">{index + 1}.</span>
                  <Input
                    value={draft.title}
                    onChange={(event) => setDraft(index, { title: event.target.value })}
                    placeholder="Write your priority..."
                    className="bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-fg)]">
                    Link to subject (optional)
                  </label>
                  <select
                    value={draft.subject_id ?? ''}
                    onChange={(event) => setDraft(index, { subject_id: event.target.value || null })}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
                  >
                    <option value="">None</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-fg)]">
                    Task type
                  </label>
                  <select
                    value={draft.task_category}
                    onChange={(event) => setDraft(index, { task_category: event.target.value as Task['category'] })}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
                  >
                    {TASK_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent)]/10 p-4 text-sm text-[var(--muted-fg)]">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
              <p>Keep it narrow. A few concrete priorities is enough to give the week direction.</p>
            </div>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              className="rounded-xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)]"
            >
              Skip This Week
            </Button>
            <Button
              type="button"
              disabled={activeCount === 0}
              onClick={() => setStep(2)}
              className="rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110"
            >
              Next: Schedule
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--card-fg)]">When will you tackle these?</h2>
            <p className="text-sm text-[var(--muted-fg)]">Give each active priority a focus block so it has a place in the week.</p>
          </div>

          <div className="space-y-4">
            {drafts
              .map((draft, index) => ({ draft, index }))
              .filter(({ draft }) => draft.title.trim().length > 0)
              .map(({ draft, index }) => {
                const duration = calculateScheduledDurationMinutes(draft)

                return (
                  <div key={index} className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/35 p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--card-fg)]">{index + 1}. {draft.title.trim()}</p>
                        {draft.subject_id ? (
                          <p className="text-xs text-[var(--muted-fg)]">
                            {subjects.find((subject) => subject.id === draft.subject_id)?.name ?? 'Linked subject'}
                          </p>
                        ) : null}
                      </div>
                      {duration ? (
                        <div className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] text-[var(--muted-fg)]">
                          {duration} min
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-fg)]">Day</label>
                        <select
                          value={draft.scheduled_day ?? ''}
                          onChange={(event) => setDraft(index, {
                            scheduled_day: event.target.value === '' ? null : Number.parseInt(event.target.value, 10),
                          })}
                          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
                        >
                          <option value="">Unscheduled</option>
                          {WEEKDAY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-fg)]">Start</label>
                        <input
                          type="time"
                          value={draft.scheduled_start_time ?? ''}
                          onChange={(event) => setDraft(index, { scheduled_start_time: event.target.value || null })}
                          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-fg)]">End</label>
                        <input
                          type="time"
                          value={draft.scheduled_end_time ?? ''}
                          onChange={(event) => setDraft(index, { scheduled_end_time: event.target.value || null })}
                          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {TIME_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setDraft(index, {
                            scheduled_start_time: preset.start,
                            scheduled_end_time: preset.end,
                          })}
                          className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-fg)] hover:bg-[var(--muted)]"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/35 px-4 py-3 text-sm text-[var(--card-fg)]">
            <input
              type="checkbox"
              checked={addToCalendar}
              onChange={(event) => setAddToCalendar(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
            Add these to my calendar
          </label>

          {hasInvalidDuration ? (
            <p className="text-sm text-amber-400">End time must be after start time.</p>
          ) : null}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="rounded-xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              disabled={saving || hasInvalidDuration}
              onClick={handleSave}
              className="rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110"
            >
              {saving ? (
                <>
                  <Clock3 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Week Plan
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
