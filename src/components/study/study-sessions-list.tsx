'use client'

import { useEffect, useState } from 'react'
import { StudySession, Subject, SESSION_TYPES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { formatDotoNumber } from '@/lib/utils'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Clock,
  Zap,
  Gauge,
  Battery,
  Trash2,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import { format, isThisWeek, isThisMonth } from 'date-fns'
import { SessionLoggerModal } from './session-logger-modal'

interface StudySessionsListProps {
  sessions: StudySession[]
  subjects: Subject[]
}

const ENERGY_ICONS = {
  high: Zap,
  medium: Gauge,
  low: Battery,
}

const ENERGY_COLORS = {
  high: 'text-green-400',
  medium: 'text-amber-400',
  low: 'text-blue-400',
}

export function StudySessionsList({ sessions: initialSessions, subjects }: StudySessionsListProps) {
  const [sessions, setSessions] = useState(initialSessions)
  const [logOpen, setLogOpen] = useState(false)

  useEffect(() => {
    setSessions(initialSessions)
  }, [initialSessions])

  const handleDelete = async (id: string) => {
    if (isElectronRuntime()) {
      const userId = await getDesktopUserId()
      if (!userId) {
        return
      }

      await invokeDesktopDb<number>('deleteTableRecords', [
        'study_sessions',
        userId,
        { id },
      ])
      setSessions((prev) => prev.filter((s) => s.id !== id))
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('study_sessions').delete().eq('id', id)
    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const getSubjectName = (id: string | null) => {
    if (!id) return 'General'
    return subjects.find(s => s.id === id)?.name || 'Unknown'
  }

  // Analytics
  const thisWeek = sessions.filter(s => isThisWeek(new Date(s.started_at), { weekStartsOn: 1 }))
  const thisMonth = sessions.filter(s => isThisMonth(new Date(s.started_at)))

  const totalMinutesWeek = thisWeek.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalMinutesMonth = thisMonth.reduce((sum, s) => sum + s.duration_minutes, 0)
  const avgDuration = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.duration_minutes, 0) / sessions.length)
    : 0

  // Subject distribution
  const subjectMinutes: Record<string, number> = {}
  for (const s of sessions) {
    const name = getSubjectName(s.subject_id)
    subjectMinutes[name] = (subjectMinutes[name] || 0) + s.duration_minutes
  }
  const sortedSubjects = Object.entries(subjectMinutes).sort((a, b) => b[1] - a[1])
  const maxMinutes = sortedSubjects[0]?.[1] || 1

  // Energy distribution
  const energyCounts = { high: 0, medium: 0, low: 0 }
  for (const s of sessions) {
    energyCounts[s.energy_level]++
  }

  // Neglected subjects: subjects with no sessions or very few
  const studiedSubjectIds = new Set(sessions.map(s => s.subject_id).filter(Boolean))
  const neglectedSubjects = subjects.filter(s => !studiedSubjectIds.has(s.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
              <BookOpen className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <h1 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Study Sessions</h1>
          </div>
          <Button onClick={() => setLogOpen(true)} className="btn-glass rounded-xl">
            <BookOpen className="h-4 w-4 mr-2" />
            Log Session
          </Button>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card-colored glass-blue p-5 hover-lift">
          <div className="flex items-center gap-2 token-muted mb-3">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">This Week</span>
          </div>
          <div className="flex items-baseline">
            <span className="dotted-number-sm">{formatDotoNumber(Math.round(totalMinutesWeek / 60 * 10) / 10)}</span>
            <span className="dotted-divider ml-1">hrs</span>
          </div>
        </div>

        <div className="glass-card-colored glass-purple p-5 hover-lift">
          <div className="flex items-center gap-2 token-muted mb-3">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">This Month</span>
          </div>
          <div className="flex items-baseline">
            <span className="dotted-number-sm">{formatDotoNumber(Math.round(totalMinutesMonth / 60 * 10) / 10)}</span>
            <span className="dotted-divider ml-1">hrs</span>
          </div>
        </div>

        <div className="glass-card-colored glass-cyan p-5 hover-lift">
          <div className="flex items-center gap-2 token-muted mb-3">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Avg Duration</span>
          </div>
          <div className="flex items-baseline">
            <span className="dotted-number-sm">{formatDotoNumber(avgDuration)}</span>
            <span className="dotted-divider ml-1">min</span>
          </div>
        </div>

        <div className="glass-card-colored glass-orange p-5 hover-lift">
          <div className="flex items-center gap-2 token-muted mb-3">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Sessions</span>
          </div>
          <p className="dotted-number-sm">{formatDotoNumber(sessions.length)}</p>
        </div>
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[var(--card-fg)] mb-4 uppercase tracking-wide">Subject Distribution</h3>
          {sortedSubjects.length > 0 ? (
            <div className="space-y-3">
              {sortedSubjects.slice(0, 6).map(([name, minutes]) => (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--card-fg)]">{name}</span>
                    <span className="text-[var(--muted-fg)]">{Math.round(minutes / 60 * 10) / 10}h</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${(minutes / maxMinutes) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-fg)] text-center py-4">No data yet.</p>
          )}

          {/* Neglected subjects warning */}
          {neglectedSubjects.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Neglected subjects</span>
              </div>
              <p className="text-[10px] text-[var(--muted-fg)]">
                {neglectedSubjects.map(s => s.name).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Energy distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[var(--card-fg)] mb-4 uppercase tracking-wide">Energy Distribution</h3>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {(['high', 'medium', 'low'] as const).map(level => {
                const Icon = ENERGY_ICONS[level]
                const count = energyCounts[level]
                const percent = sessions.length > 0 ? Math.round((count / sessions.length) * 100) : 0
                return (
                  <div key={level} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={`flex items-center gap-1.5 ${ENERGY_COLORS[level]}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </span>
                      <span className="text-[var(--muted-fg)]">{count} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--muted)]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          level === 'high' ? 'bg-green-500' : level === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-fg)] text-center py-4">No data yet.</p>
          )}
        </div>
      </div>

      {/* Session history */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[var(--card-fg)] mb-4 uppercase tracking-wide">Session History</h3>

        {sessions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl">
            <BookOpen className="h-10 w-10 mx-auto text-[var(--muted-fg)] mb-3" />
            <p className="text-sm text-[var(--muted-fg)]">No sessions logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {sessions.map(session => {
              const Icon = ENERGY_ICONS[session.energy_level]
              const sessionTypeLabel = SESSION_TYPES.find(t => t.value === session.session_type)?.label || session.session_type
              return (
                <div
                  key={session.id}
                  className="group flex items-start gap-3 p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] transition-smooth hover:bg-[var(--card)]"
                >
                  <div className={`p-1.5 rounded-lg bg-[var(--muted)] border border-[var(--border)] mt-0.5`}>
                    <Icon className={`h-3.5 w-3.5 ${ENERGY_COLORS[session.energy_level]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--card-fg)]">
                        {getSubjectName(session.subject_id)}
                      </p>
                      <Badge className="bg-[var(--muted)] text-[var(--muted-fg)] border-0 text-[10px]">
                        {sessionTypeLabel}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[var(--muted-fg)]">
                        {session.duration_minutes} min
                      </span>
                      <span className="text-[10px] text-[var(--muted-fg)]">
                        {format(new Date(session.started_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {session.notes && (
                      <p className="text-xs text-[var(--muted-fg)] mt-1 truncate">{session.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-[var(--muted-fg)] hover:text-red-500 hover:bg-red-500/10 transition-smooth"
                    onClick={() => handleDelete(session.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <SessionLoggerModal
        open={logOpen}
        onOpenChange={setLogOpen}
        subjects={subjects}
      />
    </div>
  )
}
