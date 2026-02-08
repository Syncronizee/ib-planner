'use client'

import { useState, useMemo } from 'react'
import { Task, Assessment, Subject, TASK_CATEGORIES, SUBJECT_COLORS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  FileText,
  BookOpen,
  Clock,
  List,
  Grid3X3,
  AlertCircle,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isPast,
} from 'date-fns'
import { createClient } from '@/lib/supabase/client'

interface CalendarViewProps {
  initialTasks: Task[]
  initialAssessments: Assessment[]
  subjects: Subject[]
}

type CalendarEvent = {
  id: string
  title: string
  date: string
  type: 'task' | 'assessment'
  category?: string
  subjectId?: string | null
  isCompleted: boolean
  priority?: string
  percentage?: number | null
  original: Task | Assessment
}

export function CalendarView({ initialTasks, initialAssessments, subjects }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState(true)

  // Combine tasks and assessments into calendar events
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = []

    tasks.forEach(task => {
      if (task.due_date) {
        allEvents.push({
          id: task.id,
          title: task.title,
          date: task.due_date,
          type: 'task',
          category: task.category,
          subjectId: task.subject_id,
          isCompleted: task.is_completed,
          priority: task.priority,
          original: task,
        })
      }
    })

    assessments.forEach(assessment => {
      if (assessment.date) {
        allEvents.push({
          id: assessment.id,
          title: assessment.title,
          date: assessment.date,
          type: 'assessment',
          subjectId: assessment.subject_id,
          isCompleted: assessment.is_completed,
          percentage: assessment.percentage,
          original: assessment,
        })
      }
    })

    return allEvents
  }, [tasks, assessments])

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (!showCompleted && event.isCompleted) return false
      if (filterSubject !== 'all' && event.subjectId !== filterSubject) return false
      if (filterType === 'tasks' && event.type !== 'task') return false
      if (filterType === 'assessments' && event.type !== 'assessment') return false
      return true
    })
  }, [events, showCompleted, filterSubject, filterType])

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => isSameDay(parseISO(event.date), date))
  }

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  // Get subject info
  const getSubjectColor = (subjectId: string | null | undefined) => {
    if (!subjectId) return 'bg-gray-400'
    const subject = subjects.find(s => s.id === subjectId)
    if (!subject) return 'bg-gray-400'
    return SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-gray-400'
  }

  const getSubjectName = (subjectId: string | null | undefined) => {
    if (!subjectId) return null
    return subjects.find(s => s.id === subjectId)?.name || null
  }

  // Handle task toggle
  const handleToggleTask = async (task: Task) => {
    const supabase = createClient()
    const newState = !task.is_completed

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: newState })
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: newState } : t))
      
      if (task.linked_assessment_id) {
        await supabase
          .from('assessments')
          .update({ is_completed: newState })
          .eq('id', task.linked_assessment_id)
        
        setAssessments(assessments.map(a => 
          a.id === task.linked_assessment_id ? { ...a, is_completed: newState } : a
        ))
      }
    }
  }

  // Handle assessment toggle
  const handleToggleAssessment = async (assessment: Assessment) => {
    const supabase = createClient()
    const newState = !assessment.is_completed

    const { error } = await supabase
      .from('assessments')
      .update({ is_completed: newState })
      .eq('id', assessment.id)

    if (!error) {
      setAssessments(assessments.map(a => a.id === assessment.id ? { ...a, is_completed: newState } : a))
      
      if (assessment.linked_task_id) {
        await supabase
          .from('tasks')
          .update({ is_completed: newState })
          .eq('id', assessment.linked_task_id)
        
        setTasks(tasks.map(t => 
          t.id === assessment.linked_task_id ? { ...t, is_completed: newState } : t
        ))
      }
    }
  }

  // Get selected date events
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // Upcoming events for list view
  const upcomingEvents = filteredEvents
    .filter(e => !isPast(parseISO(e.date)) || isToday(parseISO(e.date)) || !e.isCompleted)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Group upcoming events by date for list view
  const groupedUpcoming = useMemo(() => {
    const groups: { [key: string]: CalendarEvent[] } = {}
    upcomingEvents.forEach(event => {
      const dateKey = event.date
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(event)
    })
    return Object.entries(groups).slice(0, 10)
  }, [upcomingEvents])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground text-sm">View all your tasks and assessments</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('month')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" onClick={() => {
            setCurrentDate(new Date())
            setSelectedDate(new Date())
          }}>
            Today
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="tasks">Tasks Only</SelectItem>
            <SelectItem value="assessments">Assessments Only</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Checkbox
            id="show-completed"
            checked={showCompleted}
            onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
          />
          <label htmlFor="show-completed" className="text-sm">Show completed</label>
        </div>

        <Badge variant="secondary" className="ml-auto">
          {filteredEvents.filter(e => !e.isCompleted).length} pending
        </Badge>
      </div>

      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Large Calendar Grid */}
          <Card className="xl:col-span-3">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-xl">{format(currentDate, 'MMMM yyyy')}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2 border-b">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-3">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 3)}</span>
                  </div>
                ))}
              </div>

              {/* Calendar Days - Large */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDate(day)
                  const incompleteEvents = dayEvents.filter(e => !e.isCompleted)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const hasOverdue = incompleteEvents.some(e => isPast(parseISO(e.date)) && !isToday(day))

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        min-h-[120px] p-2 border-b border-r text-left transition-colors relative
                        ${index % 7 === 0 ? 'border-l' : ''}
                        ${index < 7 ? 'border-t' : ''}
                        ${!isCurrentMonth ? 'bg-muted/30' : 'bg-background'}
                        ${isToday(day) ? 'bg-primary/5' : ''}
                        ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                        hover:bg-muted/50
                      `}
                    >
                      <div className={`
                        text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full
                        ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}
                        ${!isCurrentMonth ? 'text-muted-foreground' : ''}
                      `}>
                        {format(day, 'd')}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, 4).map(event => (
                          <div
                            key={event.id}
                            className={`
                              text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1
                              ${event.type === 'assessment' 
                                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' 
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'}
                              ${event.isCompleted ? 'opacity-50 line-through' : ''}
                            `}
                          >
                            {event.type === 'assessment' ? (
                              <FileText className="h-3 w-3 shrink-0" />
                            ) : (
                              <BookOpen className="h-3 w-3 shrink-0" />
                            )}
                            <span className="truncate">{event.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 4 && (
                          <div className="text-xs text-muted-foreground px-1.5">
                            +{dayEvents.length - 4} more
                          </div>
                        )}
                      </div>

                      {/* Overdue indicator */}
                      {hasOverdue && (
                        <div className="absolute top-2 right-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          <Card className="xl:col-span-1 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {selectedDate ? (
                  isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d')
                ) : 'Select a date'}
              </CardTitle>
              {selectedDate && selectedDateEvents.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedDateEvents.filter(e => !e.isCompleted).length} pending, {selectedDateEvents.filter(e => e.isCompleted).length} completed
                </p>
              )}
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                selectedDateEvents.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {selectedDateEvents.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        getSubjectColor={getSubjectColor}
                        getSubjectName={getSubjectName}
                        onToggle={() => {
                          if (event.type === 'task') {
                            handleToggleTask(event.original as Task)
                          } else {
                            handleToggleAssessment(event.original as Assessment)
                          }
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No events on this day
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click on a date to see details
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {groupedUpcoming.length > 0 ? (
              <div className="space-y-6">
                {groupedUpcoming.map(([dateStr, dateEvents]) => (
                  <div key={dateStr}>
                    <h3 className={`text-sm font-medium mb-2 flex items-center gap-2 ${
                      isToday(parseISO(dateStr)) ? 'text-primary' : 
                      isPast(parseISO(dateStr)) ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr)) && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {isToday(parseISO(dateStr)) && <Clock className="h-4 w-4" />}
                      {isToday(parseISO(dateStr)) ? 'Today' : format(parseISO(dateStr), 'EEEE, MMMM d')}
                    </h3>
                    <div className="space-y-2 pl-4 border-l-2">
                      {dateEvents.map(event => (
                        <EventCard
                          key={event.id}
                          event={event}
                          getSubjectColor={getSubjectColor}
                          getSubjectName={getSubjectName}
                          onToggle={() => {
                            if (event.type === 'task') {
                              handleToggleTask(event.original as Task)
                            } else {
                              handleToggleAssessment(event.original as Assessment)
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming events
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Event Card Component
function EventCard({
  event,
  getSubjectColor,
  getSubjectName,
  onToggle,
}: {
  event: CalendarEvent
  getSubjectColor: (id: string | null | undefined) => string
  getSubjectName: (id: string | null | undefined) => string | null
  onToggle: () => void
}) {
  const subjectName = getSubjectName(event.subjectId)
  const subjectColor = getSubjectColor(event.subjectId)

  return (
    <div className={`flex items-start gap-2 p-2 border rounded-lg ${event.isCompleted ? 'opacity-60 bg-muted/30' : 'bg-background'}`}>
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        {event.isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${event.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge 
            variant={event.type === 'assessment' ? 'destructive' : 'secondary'} 
            className="text-[10px] h-5 px-1.5"
          >
            {event.type === 'assessment' ? 'Assessment' : TASK_CATEGORIES.find(c => c.value === event.category)?.label || 'Task'}
          </Badge>
          {subjectName && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              <div className={`w-2 h-2 rounded-full mr-1 ${subjectColor}`} />
              {subjectName}
            </Badge>
          )}
          {event.type === 'assessment' && event.isCompleted && event.percentage !== null && (
            <Badge className="text-[10px] h-5 px-1.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {event.percentage}%
            </Badge>
          )}
          {event.type === 'task' && event.priority && (
            <Badge className={`text-[10px] h-5 px-1.5 ${
              event.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
              event.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
              'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            }`}>
              {event.priority}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
