'use client'

import { useState, useMemo } from 'react'
import { Task, Assessment, Subject, SUBJECT_COLORS } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  BookOpen,
  ArrowRight,
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
} from 'date-fns'
import Link from 'next/link'

interface CalendarPreviewProps {
  tasks: Task[]
  assessments: Assessment[]
  subjects: Subject[]
}

export function CalendarPreview({ tasks, assessments, subjects }: CalendarPreviewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Combine events
  const events = useMemo(() => {
    const allEvents: Array<{
      id: string
      title: string
      date: string
      type: 'task' | 'assessment'
      subjectId: string | null
      isCompleted: boolean
    }> = []

    tasks.forEach(task => {
      if (task.due_date) {
        allEvents.push({
          id: task.id,
          title: task.title,
          date: task.due_date,
          type: 'task',
          subjectId: task.subject_id,
          isCompleted: task.is_completed,
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
        })
      }
    })

    return allEvents
  }, [tasks, assessments])

  // Get events for a date
  const getEventsForDate = (date: Date) => {
    return events.filter(e => isSameDay(parseISO(e.date), date) && !e.isCompleted)
  }

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  // Selected date events
  const selectedDateEvents = getEventsForDate(selectedDate)

  // Get subject color
  const getSubjectColor = (subjectId: string | null) => {
    if (!subjectId) return 'bg-gray-400'
    const subject = subjects.find(s => s.id === subjectId)
    if (!subject) return 'bg-gray-400'
    return SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-gray-400'
  }

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return null
    return subjects.find(s => s.id === subjectId)?.name || null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar
          </CardTitle>
          <Link href="/dashboard/calendar">
            <Button variant="ghost" size="sm" className="text-xs">
              View Full
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Calendar */}
        <div>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{format(currentDate, 'MMMM yyyy')}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map(day => {
              const dayEvents = getEventsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelected = isSameDay(day, selectedDate)
              const hasEvents = dayEvents.length > 0

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-md text-xs relative
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isToday(day) ? 'bg-primary text-primary-foreground font-bold' : ''}
                    ${isSelected && !isToday(day) ? 'bg-muted ring-1 ring-primary' : ''}
                    ${!isSelected && !isToday(day) ? 'hover:bg-muted' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {hasEvents && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${isToday(day) ? 'bg-primary-foreground' : 'bg-primary'}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Date Events */}
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, MMM d')}
            {selectedDateEvents.length > 0 && ` (${selectedDateEvents.length})`}
          </h4>
          
          {selectedDateEvents.length > 0 ? (
            <div className="space-y-1.5">
              {selectedDateEvents.slice(0, 4).map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 p-1.5 rounded-md bg-muted/50 text-xs"
                >
                  {event.type === 'assessment' ? (
                    <FileText className="h-3 w-3 text-red-500 shrink-0" />
                  ) : (
                    <BookOpen className="h-3 w-3 text-blue-500 shrink-0" />
                  )}
                  <span className="truncate flex-1">{event.title}</span>
                  {event.subjectId && (
                    <div className={`w-2 h-2 rounded-full shrink-0 ${getSubjectColor(event.subjectId)}`} />
                  )}
                </div>
              ))}
              {selectedDateEvents.length > 4 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{selectedDateEvents.length - 4} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No events
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}