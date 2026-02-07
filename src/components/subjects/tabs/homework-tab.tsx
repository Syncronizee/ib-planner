'use client'

import { useState, useEffect } from 'react'
import { Subject, Task, TASK_CATEGORIES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  Pencil, 
  Trash2, 
  CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { useRouter } from 'next/navigation'

interface HomeworkTabProps {
  subject: Subject
}

export function HomeworkTab({ subject }: HomeworkTabProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [category, setCategory] = useState<Task['category']>('homework')
  const [priority, setPriority] = useState<Task['priority']>('medium')

  const router = useRouter()

  useEffect(() => {
    fetchTasks()
  }, [subject.id])

  const fetchTasks = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('subject_id', subject.id)
      .order('due_date', { ascending: true })

    setTasks(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDueDate(undefined)
    setCategory('homework')
    setPriority('medium')
    setEditing(null)
  }

  const handleAdd = () => {
    resetForm()
    setAdding(true)
  }

  const handleEdit = (task: Task) => {
    setEditing(task)
    setTitle(task.title)
    setDescription(task.description || '')
    setDueDate(task.due_date ? new Date(task.due_date) : undefined)
    setCategory(task.category)
    setPriority(task.priority)
    setAdding(true)
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const taskData = {
      title,
      description: description || null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      category,
      priority,
      subject_id: subject.id,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editing.id)
        .select()
        .single()

      if (!error && data) {
        setTasks(tasks.map(t => t.id === editing.id ? data : t))
      }
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          user_id: user?.id,
          is_completed: false,
        })
        .select()
        .single()

      if (!error && data) {
        setTasks([...tasks, data])
      }
    }

    resetForm()
    setAdding(false)
    router.refresh()
  }

  const handleToggleComplete = async (task: Task) => {
    const supabase = createClient()
    const newCompletedState = !task.is_completed

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: newCompletedState })
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.map(t => 
        t.id === task.id ? { ...t, is_completed: newCompletedState } : t
      ))
    }
  }

  const handleDelete = async (task: Task) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.filter(t => t.id !== task.id))
    }
  }

  const handleCancel = () => {
    resetForm()
    setAdding(false)
  }

  const incompleteTasks = tasks.filter(t => !t.is_completed)
  const completedTasks = tasks.filter(t => t.is_completed)
  const overdueTasks = incompleteTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)))

  const getCategoryColor = (cat: Task['category']) => {
    return TASK_CATEGORIES.find(c => c.value === cat)?.color || 'bg-gray-500'
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-amber-600'
      case 'low': return 'text-green-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground text-sm">Loading tasks...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-2">
            <p className="text-[10px] text-muted-foreground">Pending</p>
            <p className="text-lg font-bold">{incompleteTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <p className="text-[10px] text-muted-foreground">Overdue</p>
            <p className="text-lg font-bold text-red-600">{overdueTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <p className="text-[10px] text-muted-foreground">Completed</p>
            <p className="text-lg font-bold text-green-600">{completedTasks.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Form */}
      {adding ? (
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="font-semibold text-sm">{editing ? 'Edit Task' : 'Add Task'}</h3>
            
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                placeholder="e.g. Complete worksheet 5.2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs px-2">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dueDate ? format(dueDate, 'M/d') : 'Pick'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!title} size="sm" className="text-xs h-8">
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel} size="sm" className="text-xs h-8">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={handleAdd} size="sm" className="text-xs h-8">
          <Plus className="h-3 w-3 mr-1" />
          Add Task
        </Button>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">No tasks for this subject.</p>
          <p className="text-xs text-muted-foreground mt-1">Add homework and assignments here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Overdue ({overdueTasks.length})
              </h4>
              {overdueTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  getCategoryColor={getCategoryColor}
                  getPriorityColor={getPriorityColor}
                  isOverdue
                />
              ))}
            </div>
          )}

          {/* Pending */}
          {incompleteTasks.filter(t => !overdueTasks.includes(t)).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending ({incompleteTasks.length - overdueTasks.length})
              </h4>
              {incompleteTasks
                .filter(t => !overdueTasks.includes(t))
                .map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    getCategoryColor={getCategoryColor}
                    getPriorityColor={getPriorityColor}
                  />
                ))}
            </div>
          )}

          {/* Completed */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="text-xs font-medium text-muted-foreground flex items-center gap-1 hover:text-foreground"
              >
                <CheckCircle2 className="h-3 w-3" />
                Completed ({completedTasks.length})
                <span className="text-[10px]">{showCompleted ? '▼' : '▶'}</span>
              </button>
              {showCompleted && completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  getCategoryColor={getCategoryColor}
                  getPriorityColor={getPriorityColor}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Task Card Component
function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  getCategoryColor,
  getPriorityColor,
  isOverdue = false,
}: {
  task: Task
  onToggleComplete: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  getCategoryColor: (cat: Task['category']) => string
  getPriorityColor: (priority: Task['priority']) => string
  isOverdue?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors ${
        isOverdue ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : ''
      } ${task.is_completed ? 'opacity-60' : ''}`}
    >
      <button onClick={() => onToggleComplete(task)}>
        {task.is_completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className={`font-medium text-xs truncate ${task.is_completed ? 'line-through' : ''}`}>
            {task.title}
          </p>
          <div className={`w-2 h-2 rounded-full shrink-0 ${getCategoryColor(task.category)}`} />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          <span className={getPriorityColor(task.priority)}>{task.priority}</span>
          {task.due_date && (
            <span className={isOverdue ? 'text-red-600' : ''}>
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          <span>{TASK_CATEGORIES.find(c => c.value === task.category)?.label}</span>
        </div>
      </div>

      <div className="flex gap-0.5">
        <Button variant="ghost" size="icon" onClick={() => onEdit(task)} className="h-6 w-6">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(task)} className="h-6 w-6">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}