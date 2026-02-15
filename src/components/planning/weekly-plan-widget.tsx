'use client'

import { useState } from 'react'
import { WeeklyPlan, Task, Subject } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  CalendarDays,
  Check,
  Circle,
  ArrowRight,
} from 'lucide-react'
import { format, startOfWeek, isAfter, isBefore, addDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface WeeklyPlanWidgetProps {
  plan: WeeklyPlan | null
  tasks: Task[]
  subjects: Subject[]
}

export function WeeklyPlanWidget({ plan, tasks, subjects }: WeeklyPlanWidgetProps) {
  const [localPlan, setLocalPlan] = useState(plan)
  const router = useRouter()

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const isCurrentWeek = localPlan && localPlan.week_start_date === format(weekStart, 'yyyy-MM-dd')

  // Check if it's Sunday or Monday and no plan exists
  const today = new Date()
  const dayOfWeek = today.getDay()
  const shouldPrompt = !isCurrentWeek && (dayOfWeek === 0 || dayOfWeek === 1)

  const handleToggleComplete = async (field: 'hardest_task_completed' | 'weakest_subject_completed') => {
    if (!localPlan) return
    const supabase = createClient()
    const newValue = !localPlan[field]

    const { error } = await supabase
      .from('weekly_plans')
      .update({ [field]: newValue })
      .eq('id', localPlan.id)

    if (!error) {
      setLocalPlan({ ...localPlan, [field]: newValue })
    }
  }

  const hardestTask = localPlan?.hardest_task_id ? tasks.find(t => t.id === localPlan.hardest_task_id) : null
  const weakestSubject = localPlan?.weakest_subject_id ? subjects.find(s => s.id === localPlan.weakest_subject_id) : null

  // No plan prompt
  if (!isCurrentWeek) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Weekly Plan</h2>
        </div>

        <div className="text-center py-6 space-y-3">
          <CalendarDays className="h-10 w-10 mx-auto text-[var(--muted-fg)]" />
          <p className="text-sm text-[var(--muted-fg)]">
            {shouldPrompt
              ? "It's a new week! Plan your priorities."
              : "No plan for this week yet."}
          </p>
          <Link href="/dashboard/plan-week">
            <Button className="btn-glass rounded-xl">
              <Sparkles className="h-4 w-4 mr-2" />
              Plan Your Week
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Weekly Plan</h2>
        </div>
        <span className="text-xs text-[var(--muted-fg)]">
          Week of {format(new Date(localPlan!.week_start_date), 'MMM d')}
        </span>
      </div>

      <div className="space-y-3">
        {/* Hardest task */}
        {hardestTask && (
          <button
            onClick={() => handleToggleComplete('hardest_task_completed')}
            className={`w-full p-3 rounded-xl border transition-smooth text-left flex items-center gap-3 ${
              localPlan!.hardest_task_completed
                ? 'border-green-500/30 bg-green-500/10 opacity-70'
                : 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
            }`}
          >
            {localPlan!.hardest_task_completed ? (
              <Check className="h-4 w-4 text-green-400 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${localPlan!.hardest_task_completed ? 'line-through text-[var(--muted-fg)]' : 'text-[var(--card-fg)]'}`}>
                {hardestTask.title}
              </p>
              <p className="text-[10px] text-[var(--muted-fg)]">
                Hardest task
                {localPlan!.hardest_task_scheduled_time && ` · ${format(new Date(localPlan!.hardest_task_scheduled_time), 'EEE, MMM d')}`}
              </p>
            </div>
          </button>
        )}

        {/* Weakest subject */}
        {weakestSubject && (
          <button
            onClick={() => handleToggleComplete('weakest_subject_completed')}
            className={`w-full p-3 rounded-xl border transition-smooth text-left flex items-center gap-3 ${
              localPlan!.weakest_subject_completed
                ? 'border-green-500/30 bg-green-500/10 opacity-70'
                : 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
            }`}
          >
            {localPlan!.weakest_subject_completed ? (
              <Check className="h-4 w-4 text-green-400 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-amber-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${localPlan!.weakest_subject_completed ? 'line-through text-[var(--muted-fg)]' : 'text-[var(--card-fg)]'}`}>
                Study {weakestSubject.name}
              </p>
              <p className="text-[10px] text-[var(--muted-fg)]">
                Weakest subject
                {localPlan!.weakest_subject_scheduled_time && ` · ${format(new Date(localPlan!.weakest_subject_scheduled_time), 'EEE, MMM d')}`}
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
