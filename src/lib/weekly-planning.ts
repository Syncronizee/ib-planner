import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  isSameDay,
  isTomorrow,
  parseISO,
  startOfWeek,
} from 'date-fns'
import type { WeeklyPriority } from '@/lib/types'

export const WEEKLY_PRIORITY_SLOTS = 3

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
  { value: 0, label: 'Sunday', shortLabel: 'Sun' },
] as const

export const TIME_PRESETS = [
  { label: 'Morning', start: '09:00', end: '11:00' },
  { label: 'Afternoon', start: '14:00', end: '16:00' },
  { label: 'Evening', start: '19:00', end: '21:00' },
] as const

export type PriorityStatus = {
  label: string
  tone: 'default' | 'today' | 'overdue' | 'completed'
}

export function normalizePriorityTimeValue(
  value: string | null | undefined,
  precision: 'minutes' | 'seconds' = 'minutes'
) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) {
    return null
  }

  const hours = Number.parseInt(match[1] ?? '', 10)
  const minutes = Number.parseInt(match[2] ?? '', 10)
  const seconds = Number.parseInt(match[3] ?? '0', 10)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null
  }

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  return precision === 'seconds' ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`
}

function parseWeekStart(weekStart: string) {
  return parseISO(`${weekStart}T00:00:00`)
}

function parseTimeToMinutes(value: string | null) {
  if (!value) {
    return null
  }

  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number.parseInt(hoursRaw ?? '', 10)
  const minutes = Number.parseInt(minutesRaw ?? '', 10)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return (hours * 60) + minutes
}

export function getCurrentWeekStart() {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function getRelativeWeekStart(weeksAhead = 0) {
  const base = startOfWeek(new Date(), { weekStartsOn: 1 })
  return format(addWeeks(base, weeksAhead), 'yyyy-MM-dd')
}

export function getWeekRangeLabel(weekStart: string) {
  const start = parseWeekStart(weekStart)
  const end = addDays(start, 6)
  return `Week of ${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`
}

export function getDateFromDayNumber(weekStart: string, dayNumber: number | null) {
  if (dayNumber === null) {
    return null
  }

  const monday = parseWeekStart(weekStart)
  const normalized = dayNumber === 0 ? 6 : dayNumber - 1
  return addDays(monday, normalized)
}

export function calculateScheduledDurationMinutes(priority: Pick<WeeklyPriority, 'scheduled_start_time' | 'scheduled_end_time'>) {
  const startMinutes = parseTimeToMinutes(priority.scheduled_start_time)
  const endMinutes = parseTimeToMinutes(priority.scheduled_end_time)

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null
  }

  return endMinutes - startMinutes
}

export function formatDurationLabel(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return ''
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  if (hours === 0) {
    return `${remainder} min`
  }

  const hourText = remainder === 30 ? `${hours}.5` : `${hours}h ${remainder}m`
  return hourText.includes('h') ? hourText : `${hourText} hours`
}

export function formatPrioritySchedule(priority: Pick<WeeklyPriority, 'week_start' | 'scheduled_day' | 'scheduled_start_time' | 'scheduled_end_time'>) {
  const scheduledDate = getDateFromDayNumber(priority.week_start, priority.scheduled_day)
  if (!scheduledDate) {
    return 'Not scheduled'
  }

  const weekday = WEEKDAY_OPTIONS.find((option) => option.value === priority.scheduled_day)?.shortLabel
    ?? format(scheduledDate, 'EEE')

  const normalizedStartTime = normalizePriorityTimeValue(priority.scheduled_start_time)
  const normalizedEndTime = normalizePriorityTimeValue(priority.scheduled_end_time)

  if (!normalizedStartTime || !normalizedEndTime) {
    return weekday
  }

  const start = parseISO(`${priority.week_start}T00:00:00`)
  const [startHour, startMinute] = normalizedStartTime.split(':').map((value) => Number.parseInt(value, 10))
  const [endHour, endMinute] = normalizedEndTime.split(':').map((value) => Number.parseInt(value, 10))

  const startDate = new Date(start)
  startDate.setHours(startHour || 0, startMinute || 0, 0, 0)
  const endDate = new Date(start)
  endDate.setHours(endHour || 0, endMinute || 0, 0, 0)

  return `${weekday} ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
}

export function getPriorityStatus(priority: WeeklyPriority): PriorityStatus {
  return getPriorityStatusForDate(priority, new Date())
}

export function getPriorityStatusForDate(priority: WeeklyPriority, referenceDate: Date): PriorityStatus {
  if (priority.is_completed) {
    return { label: 'Completed', tone: 'completed' }
  }

  const scheduledDate = getDateFromDayNumber(priority.week_start, priority.scheduled_day)
  if (!scheduledDate) {
    return { label: 'Unscheduled', tone: 'default' }
  }

  const today = referenceDate

  if (isSameDay(scheduledDate, today)) {
    return { label: 'Today!', tone: 'today' }
  }

  if (isTomorrow(scheduledDate)) {
    return { label: 'Tomorrow', tone: 'default' }
  }

  const daysUntil = differenceInCalendarDays(scheduledDate, today)

  if (daysUntil > 0) {
    return { label: `In ${daysUntil} day${daysUntil === 1 ? '' : 's'}`, tone: 'default' }
  }

  return { label: 'Overdue', tone: 'overdue' }
}

export function getPriorityCalendarMarker(priorityId: string) {
  return `[weekly-priority:${priorityId}]`
}

export function buildPriorityScheduledFor(weekStart: string, scheduledDay: number | null, scheduledStartTime: string | null) {
  const scheduledDate = getDateFromDayNumber(weekStart, scheduledDay)
  if (!scheduledDate) {
    return null
  }

  const normalizedStartTime = normalizePriorityTimeValue(scheduledStartTime, 'seconds') ?? '09:00:00'
  const [hours, minutes, seconds] = normalizedStartTime
    .split(':')
    .map((value) => Number.parseInt(value, 10))

  const scheduledAt = new Date(scheduledDate)
  scheduledAt.setHours(hours || 0, minutes || 0, seconds || 0, 0)

  return scheduledAt.toISOString()
}
