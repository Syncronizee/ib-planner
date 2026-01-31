'use client'

import { Task, Subject, SUBJECT_COLORS } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'

interface TaskItemProps {
  task: Task
  subject?: Subject
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskItem({ task, subject, onToggle, onEdit, onDelete }: TaskItemProps) {
  const colorClass = subject 
    ? SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-slate-500'
    : 'bg-slate-300'

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !task.is_completed

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${task.is_completed ? 'opacity-50' : ''}`}>
      <div className={`w-1 h-10 rounded-full ${colorClass}`} />
      
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={() => onToggle(task)}
      />

      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${task.is_completed ? 'line-through' : ''}`}>
          {task.title}
        </p>
        <div className="flex gap-2 text-sm text-muted-foreground">
          {subject && <span>{subject.name}</span>}
          {task.due_date && (
            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
              {isOverdue ? 'Overdue: ' : ''}{format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(task)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}