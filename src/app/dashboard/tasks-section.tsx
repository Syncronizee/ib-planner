'use client'

import { useEffect, useState } from 'react'
import { Task, Subject, TASK_CATEGORIES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  MoreHorizontal
} from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { useRouter } from 'next/navigation'

interface TasksSectionProps {
  initialTasks: Task[]
  subjects: Subject[]
}

export function TasksSection({ initialTasks, subjects }: TasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [subjectId, setSubjectId] = useState<string>('')
  const [category, setCategory] = useState<Task['category']>('homework')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState(false)

  const router = useRouter()

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const handleAdd = async () => {
    if (!title.trim()) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user?.id,
        title: title.trim(),
        description: description.trim() || null,
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
      setDescription('')
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

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: newState })
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: newState } : t))

      // If task is linked to an assessment, update that too
      if (task.linked_assessment_id) {
        await supabase
          .from('assessments')
          .update({ is_completed: newState })
          .eq('id', task.linked_assessment_id)
      }
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

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return null
    return subjects.find(s => s.id === subjectId)?.name || null
  }

  const getSubjectColor = (subjectId: string | null) => {
    if (!subjectId) return null
    const subject = subjects.find(s => s.id === subjectId)
    if (!subject) return null
    const colors: Record<string, string> = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
      indigo: 'bg-indigo-500',
      orange: 'bg-orange-500',
    }
    return colors[subject.color] || 'bg-gray-500'
  }

  const getCategoryIcon = (cat: Task['category']) => {
    switch (cat) {
      case 'homework': return <BookOpen className="h-3 w-3" />
      case 'assessment': return <FileText className="h-3 w-3" />
      case 'college_prep': return <GraduationCap className="h-3 w-3" />
      case 'personal': return <User className="h-3 w-3" />
      case 'project': return <Folder className="h-3 w-3" />
      case 'revision': return <RotateCcw className="h-3 w-3" />
      default: return <MoreHorizontal className="h-3 w-3" />
    }
  }

  const getCategoryColor = (cat: Task['category']) => {
    return TASK_CATEGORIES.find(c => c.value === cat)?.color || 'bg-gray-500'
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-950'
      case 'medium': return 'text-amber-600 bg-amber-50 dark:bg-amber-950'
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-950'
    }
  }

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    if (isPast(date) && !isToday(date)) return 'overdue'
    if (isToday(date)) return 'today'
    if (isTomorrow(date)) return 'tomorrow'
    return 'upcoming'
  }

  // Filter tasks
  let filteredTasks = tasks
  if (filterCategory !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.category === filterCategory)
  }

  const incompleteTasks = filteredTasks.filter(t => !t.is_completed)
  const completedTasks = filteredTasks.filter(t => t.is_completed)

  // Sort incomplete tasks: overdue first, then by due date
  const sortedIncompleteTasks = incompleteTasks.sort((a, b) => {
    const aStatus = getDueDateStatus(a.due_date)
    const bStatus = getDueDateStatus(b.due_date)
    
    // Overdue first
    if (aStatus === 'overdue' && bStatus !== 'overdue') return -1
    if (bStatus === 'overdue' && aStatus !== 'overdue') return 1
    
    // Then by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tasks</CardTitle>
          <Button size="sm" onClick={() => setAdding(!adding)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-1 flex-wrap mt-2">
          <Badge 
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
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
                variant={filterCategory === cat.value ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setFilterCategory(cat.value)}
              >
                {getCategoryIcon(cat.value as Task['category'])}
                <span className="ml-1">{cat.label} ({count})</span>
              </Badge>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add Task Form */}
        {adding && (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
            <Input
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                <SelectTrigger className="h-9 text-xs">
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
                <SelectTrigger className="h-9 text-xs">
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
                  <Button variant="outline" className="h-9 justify-start text-xs">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dueDate ? format(dueDate, 'MMM d') : 'Due date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                </PopoverContent>
              </Popover>

              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="h-9 text-xs">
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
              <Button size="sm" onClick={handleAdd} disabled={!title.trim()}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No tasks yet. Add one to get started!
          </p>
        ) : (
          <div className="space-y-3">
            {/* Overdue */}
            {overdueTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Overdue ({overdueTasks.length})
                </h4>
                {overdueTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    getSubjectName={getSubjectName}
                    getSubjectColor={getSubjectColor}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryColor={getCategoryColor}
                    getPriorityColor={getPriorityColor}
                    isOverdue
                  />
                ))}
              </div>
            )}

            {/* Today */}
            {todayTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-amber-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Today ({todayTasks.length})
                </h4>
                {todayTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    getSubjectName={getSubjectName}
                    getSubjectColor={getSubjectColor}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryColor={getCategoryColor}
                    getPriorityColor={getPriorityColor}
                    isToday
                  />
                ))}
              </div>
            )}

            {/* Upcoming */}
            {upcomingTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Upcoming ({upcomingTasks.length})
                </h4>
                {upcomingTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    getSubjectName={getSubjectName}
                    getSubjectColor={getSubjectColor}
                    getCategoryIcon={getCategoryIcon}
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
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    getSubjectName={getSubjectName}
                    getSubjectColor={getSubjectColor}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryColor={getCategoryColor}
                    getPriorityColor={getPriorityColor}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Task Item Component
function TaskItem({
  task,
  onToggle,
  onDelete,
  getSubjectName,
  getSubjectColor,
  getCategoryIcon,
  getCategoryColor,
  getPriorityColor,
  isOverdue = false,
  isToday = false,
}: {
  task: Task
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
  getSubjectName: (id: string | null) => string | null
  getSubjectColor: (id: string | null) => string | null
  getCategoryIcon: (cat: Task['category']) => React.ReactNode
  getCategoryColor: (cat: Task['category']) => string
  getPriorityColor: (priority: Task['priority']) => string
  isOverdue?: boolean
  isToday?: boolean
}) {
  const subjectName = getSubjectName(task.subject_id)
  const subjectColor = getSubjectColor(task.subject_id)
  const categoryInfo = TASK_CATEGORIES.find(c => c.value === task.category)

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${
      isOverdue ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' :
      isToday ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' :
      task.is_completed ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/50'
    }`}>
      <button onClick={() => onToggle(task)} className="mt-0.5">
        {task.is_completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Category Badge */}
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {getCategoryIcon(task.category)}
            <span className="ml-1">{categoryInfo?.label}</span>
          </Badge>
          
          {/* Subject Badge */}
          {subjectName && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              <div className={`w-2 h-2 rounded-full mr-1 ${subjectColor}`} />
              {subjectName}
            </Badge>
          )}
          
          {/* Priority Badge */}
          <Badge className={`text-[10px] h-5 px-1.5 ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
          
          {/* Due Date */}
          {task.due_date && (
            <span className={`text-[10px] ${
              isOverdue ? 'text-red-600 font-medium' : 
              isToday ? 'text-amber-600 font-medium' : 'text-muted-foreground'
            }`}>
              {isOverdue ? 'Overdue: ' : isToday ? 'Today' : ''}
              {!isToday && format(new Date(task.due_date), 'MMM d')}
            </span>
          )}

          {/* Linked Assessment Badge */}
          {task.linked_assessment_id && task.category !== 'assessment' && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              <FileText className="h-2 w-2 mr-1" />
              Assessment
            </Badge>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => onDelete(task)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}
