import type { ScheduledStudySession } from '@/lib/types'

export function buildFocusUrlForScheduledSession(session: ScheduledStudySession) {
  const query = new URLSearchParams({
    duration: String(session.duration_goal_minutes ?? 45),
    sessionType: session.session_type,
    energy: session.energy_level,
    autostart: '1',
    plannedSessionId: session.id,
  })

  if (session.subject_id) {
    query.set('subject', session.subject_id)
  }

  if (session.task_id) {
    query.set('task', session.task_id)
  }

  const suggestion = session.task_suggestion?.trim()
  if (suggestion) {
    query.set('objective', suggestion)
    query.set('taskSuggestion', suggestion)
  }

  return `/dashboard/focus?${query.toString()}`
}
