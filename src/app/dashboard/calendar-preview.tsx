'use client'

import { useState, useMemo } from 'react'
import { Task, Assessment, Subject, SUBJECT_COLORS } from '@/lib/types'
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

  const getEventsForDate = (date: Date) => {
    return events.filter(e => isSameDay(parseISO(e.date), date) && !e.isCompleted)
  }

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const selectedDateEvents = getEventsForDate(selectedDate)

  const getSubjectColor = (subjectId: string | null) => {
    if (!subjectId) return 'bg-gray-400'
    const subject = subjects.find(s => s.id === subjectId)
    if (!subject) return 'bg-gray-400'
    return SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-gray-400'
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <CalendarIcon className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Calendar</h2>
        </div>
        <Link href="/dashboard/calendar">
          <Button variant="ghost" size="sm" className="text-[var(--muted-fg)] hover:text-[var(--card-fg)] hover:bg-[var(--muted)] rounded-xl">
            View Full
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-fg)] hover:text-[var(--card-fg)] hover:bg-[var(--muted)] rounded-xl" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-[var(--card-fg)]">{format(currentDate, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-fg)] hover:text-[var(--card-fg)] hover:bg-[var(--muted)] rounded-xl" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-[var(--muted-fg)] py-2 uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
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
                    aspect-square p-1 flex flex-col items-center justify-start rounded-xl text-sm relative transition-smooth
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isToday(day) ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-bold' : ''}
                    ${isSelected && !isToday(day) ? 'bg-[var(--muted)] ring-2 ring-[var(--ring)]' : ''}
                    ${!isSelected && !isToday(day) ? 'text-[var(--card-fg)] hover:bg-[var(--muted)]' : ''}
                  `}
                >
                  <span className="mt-1">{format(day, 'd')}</span>
                  {hasEvents && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${isToday(day) ? 'bg-[var(--accent-fg)]' : 'bg-[var(--accent)]'}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Date Events */}
        <div className="bg-[var(--muted)]/45 rounded-2xl p-4 border border-[var(--border)]">
          <h4 className="font-medium text-[var(--card-fg)] mb-3">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, MMM d')}
            {selectedDateEvents.length > 0 && (
              <Badge className="ml-2 bg-[var(--accent)] text-[var(--accent-fg)] border-0 text-xs">{selectedDateEvents.length}</Badge>
            )}
          </h4>
          
          {selectedDateEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDateEvents.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--card)] text-sm border border-[var(--border)]">
                  {event.type === 'assessment' ? (
                    <FileText className="h-4 w-4 text-red-400 shrink-0" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-blue-400 shrink-0" />
                  )}
                  <span className="truncate flex-1 text-[var(--card-fg)]">{event.title}</span>
                  {event.subjectId && (
                    <div className={`w-2 h-2 rounded-full shrink-0 ${getSubjectColor(event.subjectId)}`} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-fg)] text-center py-4">No events scheduled</p>
          )}
        </div>
      </div>
    </div>
  )
}
