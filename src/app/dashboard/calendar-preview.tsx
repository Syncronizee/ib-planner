'use client'

import { useMemo, useState } from 'react'
import { Task, Assessment, Subject, SUBJECT_COLORS, ScheduledStudySession, SchoolEvent } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  BookOpen,
  ArrowRight,
  CalendarClock,
  Building2,
  Plus,
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
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CalendarPreviewProps {
  tasks: Task[]
  assessments: Assessment[]
  subjects: Subject[]
  scheduledSessions: ScheduledStudySession[]
  schoolEvents: SchoolEvent[]
}

export function CalendarPreview({ tasks, assessments, subjects, scheduledSessions, schoolEvents }: CalendarPreviewProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [scheduleSubjectId, setScheduleSubjectId] = useState('')
  const [scheduleTaskId, setScheduleTaskId] = useState('')
  const [scheduleObjective, setScheduleObjective] = useState('')
  const [scheduleDuration, setScheduleDuration] = useState(45)
  const [scheduleDateTime, setScheduleDateTime] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [eventLocation, setEventLocation] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [savingEvent, setSavingEvent] = useState(false)

  const events = useMemo(() => {
    const allEvents: Array<{
      id: string
      title: string
      date: string
      type: 'task' | 'assessment' | 'scheduled_session' | 'school_event'
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

    scheduledSessions.forEach((session) => {
      if (session.scheduled_for && session.status === 'scheduled') {
        allEvents.push({
          id: session.id,
          title: session.task_suggestion || 'Scheduled study session',
          date: session.scheduled_for,
          type: 'scheduled_session',
          subjectId: session.subject_id,
          isCompleted: false,
        })
      }
    })

    schoolEvents.forEach((event) => {
      allEvents.push({
        id: event.id,
        title: event.title,
        date: event.event_date,
        type: 'school_event',
        subjectId: null,
        isCompleted: false,
      })
    })

    return allEvents
  }, [tasks, assessments, scheduledSessions, schoolEvents])

  const scheduleTaskOptions = useMemo(() => {
    if (!scheduleSubjectId) return tasks.filter((task) => !task.is_completed)
    return tasks.filter((task) => !task.is_completed && task.subject_id === scheduleSubjectId)
  }, [tasks, scheduleSubjectId])

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

  const handleCreateSchoolEvent = async () => {
    if (!eventTitle.trim() || !eventDate) return

    setSavingEvent(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSavingEvent(false)
      return
    }

    const { error } = await supabase
      .from('school_events')
      .insert({
        user_id: user.id,
        title: eventTitle.trim(),
        event_date: eventDate,
        location: eventLocation.trim() || null,
        description: eventDescription.trim() || null,
      })

    setSavingEvent(false)
    if (!error) {
      setEventDialogOpen(false)
      setEventTitle('')
      setEventLocation('')
      setEventDescription('')
      router.refresh()
    }
  }

  const handleScheduleStudySession = async () => {
    if (!scheduleSubjectId || !scheduleDateTime) return

    setSavingSchedule(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSavingSchedule(false)
      return
    }

    const { error } = await supabase
      .from('scheduled_study_sessions')
      .insert({
        user_id: user.id,
        subject_id: scheduleSubjectId,
        task_id: scheduleTaskId || null,
        task_suggestion: scheduleTaskId ? null : (scheduleObjective.trim() || null),
        duration_goal_minutes: scheduleDuration,
        energy_level: 'medium',
        session_type: 'practice',
        scheduled_for: new Date(scheduleDateTime).toISOString(),
        status: 'scheduled',
      })

    setSavingSchedule(false)
    if (!error) {
      setScheduleDialogOpen(false)
      setScheduleSubjectId('')
      setScheduleTaskId('')
      setScheduleObjective('')
      setScheduleDuration(45)
      setScheduleDateTime('')
      router.refresh()
    }
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleDialogOpen(true)}
            className="rounded-xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)]"
          >
            <CalendarClock className="h-4 w-4 mr-1.5" />
            Schedule
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEventDialogOpen(true)}
            className="rounded-xl bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Event
          </Button>
          <Link href="/dashboard/calendar">
            <Button variant="ghost" size="sm" className="text-[var(--muted-fg)] hover:text-[var(--card-fg)] hover:bg-[var(--muted)] rounded-xl">
              View Full
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-fg)] hover:text-[var(--card-fg)] hover:bg-[var(--muted)] rounded-xl" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-[var(--card-fg)]">{format(currentDate, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-fg)] hover:text-[var(--card-fg)] hover:bg-[var(--muted)] rounded-xl" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-[var(--muted-fg)] py-2 uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>

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
                  <div className="mt-0.5 hidden md:block w-full space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`w-full truncate rounded px-1 py-0.5 text-[10px] ${
                          event.type === 'assessment'
                            ? 'bg-red-500/20 text-red-600'
                            : event.type === 'task'
                              ? 'bg-blue-500/20 text-blue-600'
                              : event.type === 'scheduled_session'
                                ? 'bg-emerald-500/20 text-emerald-600'
                                : 'bg-violet-500/20 text-violet-600'
                        }`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>

                  {hasEvents && (
                    <div className="absolute bottom-1 flex gap-0.5 md:hidden">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${isToday(day) ? 'bg-[var(--accent-fg)]' : 'bg-[var(--accent)]'}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

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
                  ) : event.type === 'scheduled_session' ? (
                    <CalendarClock className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : event.type === 'school_event' ? (
                    <Building2 className="h-4 w-4 text-violet-400 shrink-0" />
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

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Study Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-fg)]">Subject</label>
              <Select value={scheduleSubjectId || 'none'} onValueChange={(value) => {
                setScheduleSubjectId(value === 'none' ? '' : value)
                setScheduleTaskId('')
              }}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select subject</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-fg)]">Task (optional)</label>
              <Select
                value={scheduleTaskId || 'none'}
                onValueChange={(value) => {
                  const next = value === 'none' ? '' : value
                  setScheduleTaskId(next)
                  if (next) setScheduleObjective('')
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific task</SelectItem>
                  {scheduleTaskOptions.map((task) => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!scheduleTaskId && (
              <div className="space-y-1">
                <label className="text-sm text-[var(--muted-fg)]">Objective / custom task (optional)</label>
                <input
                  type="text"
                  value={scheduleObjective}
                  onChange={(event) => setScheduleObjective(event.target.value)}
                  placeholder="e.g. Review IA rubric and write intro paragraph"
                  className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm text-[var(--muted-fg)]">Duration</label>
                <Select value={String(scheduleDuration)} onValueChange={(value) => setScheduleDuration(Number.parseInt(value, 10))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[var(--muted-fg)]">When</label>
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(event) => setScheduleDateTime(event.target.value)}
                  className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
                />
              </div>
            </div>

            <Button onClick={handleScheduleStudySession} disabled={!scheduleSubjectId || !scheduleDateTime || savingSchedule} className="w-full">
              {savingSchedule ? 'Saving...' : 'Save Scheduled Session'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add School Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-fg)]">Title</label>
              <input
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder="e.g. School assembly"
                className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-fg)]">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-fg)]">Location (optional)</label>
              <input
                value={eventLocation}
                onChange={(event) => setEventLocation(event.target.value)}
                placeholder="e.g. Auditorium"
                className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--card-fg)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--muted-fg)]">Description (optional)</label>
              <textarea
                value={eventDescription}
                onChange={(event) => setEventDescription(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--card-fg)]"
              />
            </div>
            <Button onClick={handleCreateSchoolEvent} disabled={!eventTitle.trim() || !eventDate || savingEvent} className="w-full">
              {savingEvent ? 'Saving...' : 'Save Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
