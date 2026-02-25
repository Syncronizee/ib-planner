'use client'

import { useState, useEffect } from 'react'
import { Subject, Task } from '@/lib/types'
import { formatDotoNumber } from '@/lib/utils'
import {
  TrendingUp,
  Flame,
  Clock,
} from 'lucide-react'
import { differenceInDays } from 'date-fns'

interface ProactiveScoreProps {
  tasks: Task[]
  subjects: Subject[]
}

type CompletionTiming = 'proactive' | 'on_time' | 'reactive'

const SET_TASK_CATEGORIES = new Set<Task['category']>(['homework', 'assessment'])

function getSubjectMultiplier(task: Task, subjectsById: Map<string, Subject>): number {
  if (!task.subject_id) return 1
  const subject = subjectsById.get(task.subject_id)
  if (!subject) return 1

  const isWeak = (subject.current_grade !== null && subject.current_grade <= 4) || subject.confidence <= 2
  const isStrong = (subject.current_grade !== null && subject.current_grade >= 6) && subject.confidence >= 4

  if (isWeak) return 1.2
  if (isStrong) return 0.9
  return 1
}

function getTimingMultiplier(timing: CompletionTiming): number {
  if (timing === 'proactive') return 1.15
  if (timing === 'on_time') return 1
  return 0.8
}

function getTaskTypeMultiplier(task: Task, timing: CompletionTiming): number {
  const isSetTask = SET_TASK_CATEGORIES.has(task.category)

  if (!isSetTask) {
    if (timing === 'proactive') return 1.25
    if (timing === 'on_time') return 1.1
    return 0.95
  }

  if (timing === 'proactive') return 1.05
  if (timing === 'on_time') return 0.85
  return 0.65
}

function getTaskScore(task: Task, timing: CompletionTiming, subjectsById: Map<string, Subject>): number {
  return getTimingMultiplier(timing) * getTaskTypeMultiplier(task, timing) * getSubjectMultiplier(task, subjectsById)
}

function classifyCompletion(task: Task): CompletionTiming | null {
  if (!task.is_completed || !task.due_date || !task.completed_at) return null

  const dueDate = new Date(task.due_date)
  const completedDate = new Date(task.completed_at)
  const daysEarly = differenceInDays(dueDate, completedDate)

  if (daysEarly >= 2) return 'proactive'
  if (daysEarly >= 0) return 'on_time'
  return 'reactive'
}

function calculateStreak(tasks: Task[]): number {
  // Sort completed tasks by completion date descending
  const completed = tasks
    .filter(t => t.is_completed && t.due_date && t.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

  let streak = 0
  for (const task of completed) {
    const timing = classifyCompletion(task)
    if (timing === 'proactive') {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function ProactiveScore({ tasks: initialTasks, subjects }: ProactiveScoreProps) {
  const [tasks, setTasks] = useState(initialTasks)

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Task[] | null | undefined>).detail
      if (Array.isArray(detail)) {
        setTasks(detail)
      }
    }
    window.addEventListener('tasks-updated', handler as EventListener)
    return () => window.removeEventListener('tasks-updated', handler as EventListener)
  }, [])

  const safeTasks = Array.isArray(tasks) ? tasks : []
  const completedWithDue = safeTasks.filter(t => t.is_completed && t.due_date && t.completed_at)
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))

  const proactive = completedWithDue.filter(t => classifyCompletion(t) === 'proactive').length
  const onTime = completedWithDue.filter(t => classifyCompletion(t) === 'on_time').length
  const reactive = completedWithDue.filter(t => classifyCompletion(t) === 'reactive').length
  const total = completedWithDue.length

  const proactiveWeighted = completedWithDue.reduce((sum, task) => {
    const timing = classifyCompletion(task)
    if (timing !== 'proactive') return sum
    return sum + getTaskScore(task, timing, subjectsById)
  }, 0)
  const onTimeWeighted = completedWithDue.reduce((sum, task) => {
    const timing = classifyCompletion(task)
    if (timing !== 'on_time') return sum
    return sum + getTaskScore(task, timing, subjectsById)
  }, 0)
  const reactiveWeighted = completedWithDue.reduce((sum, task) => {
    const timing = classifyCompletion(task)
    if (timing !== 'reactive') return sum
    return sum + getTaskScore(task, timing, subjectsById)
  }, 0)
  const totalWeighted = proactiveWeighted + onTimeWeighted + reactiveWeighted

  const proactivePercent = totalWeighted > 0 ? Math.round((proactiveWeighted / totalWeighted) * 100) : 0
  const onTimePercent = totalWeighted > 0 ? Math.round((onTimeWeighted / totalWeighted) * 100) : 0
  const reactivePercent = totalWeighted > 0 ? Math.round((reactiveWeighted / totalWeighted) * 100) : 0

  const streak = calculateStreak(safeTasks)

  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
          <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Proactive Score</h2>
      </div>

      {total === 0 ? (
        <div className="text-center py-6">
          <Clock className="h-10 w-10 mx-auto text-[var(--muted-fg)] mb-3" />
          <p className="text-sm text-[var(--muted-fg)]">Complete tasks with due dates to see your score.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main percentage */}
          <div className="flex items-baseline gap-2">
            <span className="dotted-number-md">{formatDotoNumber(proactivePercent)}</span>
            <span className="dotted-divider">%</span>
            <span className="text-xs text-[var(--muted-fg)] ml-1">proactive</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 rounded-full bg-[var(--muted)] overflow-hidden flex">
            {proactivePercent > 0 && (
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${proactivePercent}%` }}
              />
            )}
            {onTimePercent > 0 && (
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${onTimePercent}%` }}
              />
            )}
            {reactivePercent > 0 && (
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${reactivePercent}%` }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-[var(--muted-fg)]">Early ({proactive})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-[var(--muted-fg)]">On time ({onTime})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-[var(--muted-fg)]">Late ({reactive})</span>
            </div>
          </div>

          <p className="text-xs text-[var(--muted-fg)]">
            Independent work scores higher, set tasks score lower unless done early, and weak-subject progress gets a bonus.
          </p>

          {/* Streak */}
          {streak > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
              <Flame className="h-4 w-4 text-green-400" />
              <span className="text-xs font-medium text-green-400">
                {streak} task{streak > 1 ? 's' : ''} proactive streak!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
