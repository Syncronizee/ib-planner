'use client'

import { useState } from 'react'
import { Task, Subject, TASK_CATEGORIES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Plus, 
  CalendarIcon, 
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  BookOpen,
  FileText,
  GraduationCap,
  User,
  Folder,
  RotateCcw,
  MoreHorizontal,
  CheckSquare,
} from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { getDesktopUserId, invokeDesktopDb, isManualOfflineMode } from '@/lib/electron/offline'

interface TasksSectionProps {
  initialTasks: Task[]
  subjects: Subject[]
}

export function TasksSection({ initialTasks, subjects }: TasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [subjectId, setSubjectId] = useState<string>('')
  const [category, setCategory] = useState<Task['category']>('homework')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState(false)

  const router = useRouter()

  const handleAdd = async () => {
    if (!title.trim()) return

    if (await isManualOfflineMode()) {
      const userId = await getDesktopUserId()
      if (!userId) {
        return
      }

      const localTask = await invokeDesktopDb<Task>('createTask', [
        userId,
        {
          title: title.trim(),
          due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
          priority,
          subject_id: subjectId || null,
          category,
          is_completed: false,
        },
      ])

      setTasks((prev) => [...prev, localTask])
      setTitle('')
      setDueDate(undefined)
      setPriority('medium')
      setSubjectId('')
      setCategory('homework')
      setAdding(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user?.id,
        title: title.trim(),
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        priority,
        subject_id: subjectId || null,
        category,
        is_completed: false,
      })
      .select()
      .single()

    if (!error && data) {
      setTasks([...tasks, data])
      setTitle('')
      setDueDate(undefined)
      setPriority('medium')
      setSubjectId('')
      setCategory('homework')
      setAdding(false)
    }

    router.refresh()
  }

  const handleToggle = async (task: Task) => {
    const supabase = createClient()
    const newState = !task.is_completed

    const updateData: Record<string, unknown> = { is_completed: newState }
    if (newState) {
      updateData.completed_at = new Date().toISOString()
    } else {
      updateData.completed_at = null
    }

    if (await isManualOfflineMode()) {
      const userId = await getDesktopUserId()
      if (!userId) {
        return
      }

      const updatedTask = await invokeDesktopDb<Task>('updateTask', [
        task.id,
        userId,
        updateData,
      ])

      const updatedTasks = tasks.map((t) => (t.id === task.id ? updatedTask : t))
      setTasks(updatedTasks)
      window.dispatchEvent(new CustomEvent('tasks-updated', { detail: updatedTasks }))

      if (task.linked_assessment_id) {
        await invokeDesktopDb('updateAssessment', [
          task.linked_assessment_id,
          userId,
          { is_completed: newState },
        ])
      }

      return
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', task.id)

    if (!error) {
      const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, is_completed: newState, completed_at: newState ? new Date().toISOString() : null } : t)
      setTasks(updatedTasks)
      window.dispatchEvent(new CustomEvent('tasks-updated', { detail: updatedTasks }))

      if (task.linked_assessment_id) {
        await supabase
          .from('assessments')
          .update({ is_completed: newState })
          .eq('id', task.linked_assessment_id)
      }
    }
  }

  const handleDelete = async (task: Task) => {
    if (await isManualOfflineMode()) {
      const userId = await getDesktopUserId()
      if (!userId) {
        return
      }

      await invokeDesktopDb('deleteTask', [task.id, userId])
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (!error) setTasks(tasks.filter(t => t.id !== task.id))
  }

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return null
    return subjects.find(s => s.id === subjectId)?.name || null
  }

  const getSubjectColor = (subjectId: string | null) => {
    if (!subjectId) return null
    const subject = subjects.find(s => s.id === subjectId)
    if (!subject) return null
    const colors: Record<string, string> = {
      red: 'bg-red-500', blue: 'bg-blue-500', green: 'bg-green-500',
      yellow: 'bg-yellow-500', purple: 'bg-purple-500', pink: 'bg-pink-500',
      indigo: 'bg-indigo-500', orange: 'bg-orange-500',
    }
    return colors[subject.color] || 'bg-gray-500'
  }

  const getCategoryIcon = (cat: Task['category']) => {
    const icons = {
      homework: <BookOpen className="h-3 w-3" />,
      assessment: <FileText className="h-3 w-3" />,
      college_prep: <GraduationCap className="h-3 w-3" />,
      personal: <User className="h-3 w-3" />,
      project: <Folder className="h-3 w-3" />,
      revision: <RotateCcw className="h-3 w-3" />,
      other: <MoreHorizontal className="h-3 w-3" />,
    }
    return icons[cat] || icons.other
  }

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    if (isPast(date) && !isToday(date)) return 'overdue'
    if (isToday(date)) return 'today'
    if (isTomorrow(date)) return 'tomorrow'
    return 'upcoming'
  }

  let filteredTasks = tasks
  if (filterCategory !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.category === filterCategory)
  }

  const incompleteTasks = filteredTasks.filter(t => !t.is_completed)
  const completedTasks = filteredTasks.filter(t => t.is_completed)

  const sortedIncompleteTasks = incompleteTasks.sort((a, b) => {
    const aStatus = getDueDateStatus(a.due_date)
    const bStatus = getDueDateStatus(b.due_date)
    if (aStatus === 'overdue' && bStatus !== 'overdue') return -1
    if (bStatus === 'overdue' && aStatus !== 'overdue') return 1
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })

  const overdueTasks = sortedIncompleteTasks.filter(t => getDueDateStatus(t.due_date) === 'overdue')
  const todayTasks = sortedIncompleteTasks.filter(t => getDueDateStatus(t.due_date) === 'today')
  const upcomingTasks = sortedIncompleteTasks.filter(t => 
    getDueDateStatus(t.due_date) !== 'overdue' && getDueDateStatus(t.due_date) !== 'today'
  )

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <CheckSquare className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Tasks</h2>
        </div>
        <Button size="sm" onClick={() => setAdding(!adding)} className="btn-glass rounded-xl">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        <Badge 
          className={`cursor-pointer text-xs transition-smooth border ${filterCategory === 'all' ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]' : 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)] hover:bg-[var(--card)]'}`}
          onClick={() => setFilterCategory('all')}
        >
          All ({tasks.filter(t => !t.is_completed).length})
        </Badge>
        {TASK_CATEGORIES.map(cat => {
          const count = tasks.filter(t => t.category === cat.value && !t.is_completed).length
          if (count === 0) return null
          return (
            <Badge 
              key={cat.value}
              className={`cursor-pointer text-xs transition-smooth border ${filterCategory === cat.value ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]' : 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)] hover:bg-[var(--card)]'}`}
              onClick={() => setFilterCategory(cat.value)}
            >
              {getCategoryIcon(cat.value as Task['category'])}
              <span className="ml-1">{cat.label} ({count})</span>
            </Badge>
          )
        })}
      </div>

      {/* Add Task Form */}
      {adding && (
        <div className="space-y-3 p-4 mb-4 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)]">
          <Input
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
          />
          
          <div className="grid grid-cols-2 gap-2">
            <Select value={category} onValueChange={(v: Task['category']) => setCategory(v)}>
              <SelectTrigger className="h-10 text-xs bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {TASK_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(c.value as Task['category'])}
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subjectId || 'none'} onValueChange={(v) => setSubjectId(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-10 text-xs bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No subject</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 justify-start text-xs bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--muted)]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'MMM d') : 'Due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
              </PopoverContent>
            </Popover>

            <Select value={priority} onValueChange={(v: Task['priority']) => setPriority(v)}>
              <SelectTrigger className="h-10 text-xs bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!title.trim()} className="btn-glass rounded-xl">
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)] rounded-xl">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--muted)]/40">
          <CheckSquare className="h-12 w-12 mx-auto text-[var(--muted-fg)] mb-4" />
          <p className="text-sm text-[var(--muted-fg)]">No tasks yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-red-400 flex items-center gap-1 uppercase tracking-wide">
                <AlertCircle className="h-3 w-3" />
                Overdue ({overdueTasks.length})
              </h4>
              {overdueTasks.map(task => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} getSubjectName={getSubjectName} getSubjectColor={getSubjectColor} getCategoryIcon={getCategoryIcon} isOverdue />
              ))}
            </div>
          )}

          {/* Today */}
          {todayTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-amber-400 flex items-center gap-1 uppercase tracking-wide">
                <Clock className="h-3 w-3" />
                Today ({todayTasks.length})
              </h4>
              {todayTasks.map(task => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} getSubjectName={getSubjectName} getSubjectColor={getSubjectColor} getCategoryIcon={getCategoryIcon} isToday />
              ))}
            </div>
          )}

          {/* Upcoming */}
          {upcomingTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-[var(--muted-fg)] flex items-center gap-1 uppercase tracking-wide">
                <CalendarIcon className="h-3 w-3" />
                Upcoming ({upcomingTasks.length})
              </h4>
              {upcomingTasks.map(task => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} getSubjectName={getSubjectName} getSubjectColor={getSubjectColor} getCategoryIcon={getCategoryIcon} />
              ))}
            </div>
          )}

          {/* Completed */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <button onClick={() => setShowCompleted(!showCompleted)} className="text-xs font-medium text-[var(--muted-fg)] flex items-center gap-1 uppercase tracking-wide hover:text-[var(--card-fg)] transition-smooth">
                <CheckCircle2 className="h-3 w-3" />
                Completed ({completedTasks.length})
                <span className="text-[10px]">{showCompleted ? '▼' : '▶'}</span>
              </button>
              {showCompleted && completedTasks.map(task => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} getSubjectName={getSubjectName} getSubjectColor={getSubjectColor} getCategoryIcon={getCategoryIcon} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskItem({
  task, onToggle, onDelete, getSubjectName, getSubjectColor, getCategoryIcon, isOverdue = false, isToday = false,
}: {
  task: Task
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
  getSubjectName: (id: string | null) => string | null
  getSubjectColor: (id: string | null) => string | null
  getCategoryIcon: (cat: Task['category']) => React.ReactNode
  isOverdue?: boolean
  isToday?: boolean
}) {
  const subjectName = getSubjectName(task.subject_id)
  const subjectColor = getSubjectColor(task.subject_id)
  const categoryInfo = TASK_CATEGORIES.find(c => c.value === task.category)

  return (
    <div className={`group flex items-start gap-3 p-3 rounded-xl border transition-smooth ${
      isOverdue ? 'border-red-500/30 bg-red-500/10' :
      isToday ? 'border-amber-500/30 bg-amber-500/10' :
      task.is_completed ? 'opacity-50 bg-[var(--muted)]/40 border-[var(--border)]' : 'bg-[var(--muted)]/40 border-[var(--border)] hover:bg-[var(--card)]'
    }`}>
      <button onClick={() => onToggle(task)} className="mt-0.5 transition-smooth hover:scale-110">
        {task.is_completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        ) : (
          <Circle className="h-5 w-5 text-[var(--muted-fg)] hover:text-[var(--card-fg)]" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-[var(--muted-fg)]' : 'text-[var(--card-fg)]'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge className="bg-[var(--muted)] text-[var(--muted-fg)] border-0 text-[10px]">
            {getCategoryIcon(task.category)}
            <span className="ml-1">{categoryInfo?.label}</span>
          </Badge>
          
          {subjectName && (
            <Badge className="bg-[var(--muted)] text-[var(--muted-fg)] border-0 text-[10px]">
              <div className={`w-2 h-2 rounded-full mr-1 ${subjectColor}`} />
              {subjectName}
            </Badge>
          )}
          
          {task.due_date && (
            <span className={`text-[10px] ${
              isOverdue ? 'text-red-500' : isToday ? 'text-amber-500' : 'text-[var(--muted-fg)]'
            }`}>
              {isToday ? 'Today' : format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-[var(--muted-fg)] hover:text-red-500 hover:bg-red-500/10 transition-smooth" onClick={() => onDelete(task)}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}
