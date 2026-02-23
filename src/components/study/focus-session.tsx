'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Subject,
  Task,
  EnergyLevel,
  SessionType,
  ProductivityRating,
  PRODUCTIVITY_RATINGS,
  SESSION_TYPES,
} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Play,
  Pause,
  Square,
  Clock,
  ArrowLeft,
  Music,
  ThumbsUp,
  Minus,
  ThumbsDown,
  Check,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getTaskBankSuggestions } from '@/lib/study-task-bank'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'

interface FocusSessionProps {
  subjects: Subject[]
  tasks: Task[]
  initialSubjectId?: string
  initialTaskId?: string
  initialDurationGoal?: number
  initialSessionType?: SessionType
  initialEnergyLevel?: EnergyLevel
  initialTaskSuggestion?: string
  autoStart?: boolean
  plannedSessionId?: string
}

type FocusPhase = 'setup' | 'active' | 'summary'

const DURATION_PRESETS = [
  { label: '25 min', value: 25 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
  { label: 'No timer', value: 0 },
]

const DEFAULT_PLAYLISTS = [
  { name: 'Lo-fi Beats', url: 'https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM' },
  { name: 'Deep Focus', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ' },
  { name: 'Peaceful Piano', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO' },
]

const SUBJECT_DOT_COLORS: Record<string, string> = {
  slate: '#64748b',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#a855f7',
  pink: '#ec4899',
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function extractSpotifyEmbedUrl(input: string): string | null {
  if (input.includes('/embed/')) return input
  const match = input.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/)
  if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}`
  return null
}

export function FocusSession({
  subjects,
  tasks,
  initialSubjectId = '',
  initialTaskId = '',
  initialDurationGoal = 45,
  initialSessionType = 'practice',
  initialEnergyLevel = 'medium',
  initialTaskSuggestion = '',
  autoStart = false,
  plannedSessionId,
}: FocusSessionProps) {
  const router = useRouter()

  const [phase, setPhase] = useState<FocusPhase>(autoStart ? 'active' : 'setup')
  const [subjectId, setSubjectId] = useState<string>(initialSubjectId)
  const [taskId, setTaskId] = useState<string>(initialTaskId)
  const [durationGoal, setDurationGoal] = useState<number>(initialDurationGoal)
  const [sessionType, setSessionType] = useState<SessionType>(initialSessionType)
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(initialEnergyLevel)
  const [taskSuggestion, setTaskSuggestion] = useState(initialTaskSuggestion)

  const [isRunning, setIsRunning] = useState(autoStart)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(autoStart ? new Date() : null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [ambientMode, setAmbientMode] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const clockRef = useRef<NodeJS.Timeout | null>(null)

  const [showSpotify, setShowSpotify] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState(DEFAULT_PLAYLISTS[0].url)
  const [customUrl, setCustomUrl] = useState('')

  const [rating, setRating] = useState<ProductivityRating | null>(null)
  const [summaryNotes, setSummaryNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [discarded, setDiscarded] = useState(false)

  useEffect(() => {
    clockRef.current = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1
          if (durationGoal > 0 && next >= durationGoal * 60) {
            setIsRunning(false)
            setPhase('summary')
            return durationGoal * 60
          }
          return next
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, durationGoal])

  const handleStart = () => {
    if (!taskId && !taskSuggestion && taskBankSuggestions.length > 0) {
      setTaskSuggestion(taskBankSuggestions[0])
    }
    setPhase('active')
    setIsRunning(true)
    setStartTime(new Date())
    setElapsedSeconds(0)
  }

  const handlePauseResume = () => {
    setIsRunning((prev) => !prev)
  }

  const handleEndSession = (abandoned = false) => {
    setIsRunning(false)
    if (abandoned && elapsedSeconds < 60) {
      router.push('/dashboard')
      return
    }
    setPhase('summary')
  }

  const handleSaveCompleted = async () => {
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    const electronRuntime = isElectronRuntime()
    const desktopUserId = electronRuntime ? await getDesktopUserId() : null
    const userId = electronRuntime ? (desktopUserId ?? authUser?.id) : authUser?.id

    if (!userId) {
      setSaving(false)
      return
    }

    const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60))

    const objectiveNote = taskSuggestion.trim() ? `Objective: ${taskSuggestion.trim()}` : null
    const combinedNotes = [objectiveNote, summaryNotes.trim()].filter(Boolean).join('\n\n') || null

    const sessionPayload = {
      user_id: userId,
      subject_id: subjectId || null,
      task_id: taskId || null,
      duration_minutes: actualMinutes,
      duration_goal_minutes: durationGoal > 0 ? durationGoal : null,
      actual_duration_minutes: actualMinutes,
      energy_level: energyLevel,
      session_type: sessionType,
      productivity_rating: rating,
      session_status: 'completed' as const,
      notes: combinedNotes,
      started_at: startTime?.toISOString() || new Date().toISOString(),
    }

    if (electronRuntime) {
      await invokeDesktopDb('createTableRecord', ['study_sessions', userId, sessionPayload])

      if (plannedSessionId) {
        await invokeDesktopDb('updateTableRecords', [
          'scheduled_study_sessions',
          userId,
          { id: plannedSessionId },
          { status: 'completed' },
        ])
      }
    } else {
      const { error: sessionError } = await supabase.from('study_sessions').insert(sessionPayload)

      if (sessionError) {
        setSaving(false)
        return
      }

      if (plannedSessionId) {
        await supabase
          .from('scheduled_study_sessions')
          .update({ status: 'completed' })
          .eq('id', plannedSessionId)
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('study-sessions-updated'))
      if (plannedSessionId) {
        window.dispatchEvent(new CustomEvent('scheduled-sessions-updated'))
      }
    }

    setSaving(false)
    setSaved(true)
  }

  const handleDiscard = () => {
    setDiscarded(true)
  }

  const resetForNewSession = () => {
    setPhase('setup')
    setSaved(false)
    setDiscarded(false)
    setElapsedSeconds(0)
    setRating(null)
    setSummaryNotes('')
    setIsRunning(false)
  }

  const filteredTasks = subjectId ? tasks.filter((task) => task.subject_id === subjectId) : tasks
  const taskBankSuggestions = getTaskBankSuggestions(energyLevel, 4)

  const selectedSubject = subjects.find((subject) => subject.id === subjectId)
  const selectedTask = tasks.find((task) => task.id === taskId)
  const selectedSubjectDotColor = selectedSubject
    ? SUBJECT_DOT_COLORS[selectedSubject.color] || '#64748b'
    : '#64748b'

  const goalSeconds = durationGoal * 60
  const isCountdown = durationGoal > 0
  const displaySeconds = isCountdown ? Math.max(0, goalSeconds - elapsedSeconds) : elapsedSeconds
  const progress = isCountdown && goalSeconds > 0 ? Math.min(1, elapsedSeconds / goalSeconds) : 0
  const circumference = 2 * Math.PI * 140
  const timerTextClass = displaySeconds >= 3600 ? 'text-5xl sm:text-6xl' : 'text-6xl sm:text-7xl'
  const liveClock = format(currentTime, 'HH:mm:ss')

  const focusPrimaryTextClass = ambientMode ? 'text-slate-100' : 'text-[var(--card-fg)]'
  const focusMutedTextClass = ambientMode ? 'text-slate-300' : 'text-[var(--muted-fg)]'
  const focusSurfaceClass = ambientMode
    ? 'bg-slate-900/70 border-slate-500/35'
    : 'bg-[var(--card)]/80 border-[var(--border)]'
  const focusPanelClass = ambientMode
    ? 'bg-slate-950/85 border-slate-600/35'
    : 'bg-[var(--card)]/85 border-[var(--border)]'

  if (phase === 'setup') {
    return (
      <div className="min-h-screen app-bg">
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="text-[var(--muted-fg)] hover:text-[var(--card-fg)]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-[var(--card-fg)]">Start Study Session</h1>
              <p className="text-xs text-[var(--muted-fg)]">Set up your focus session</p>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Subject</label>
              <Select value={subjectId || 'none'} onValueChange={(value) => { setSubjectId(value === 'none' ? '' : value); setTaskId('') }}>
                <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                  <SelectValue placeholder="Select subject..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General / No subject</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name} ({subject.level})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Task to work on (optional)</label>
              <Select value={taskId || 'none'} onValueChange={(value) => {
                const next = value === 'none' ? '' : value
                setTaskId(next)
                if (next) setTaskSuggestion('')
              }}>
                <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                  <SelectValue placeholder="Select task..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific task</SelectItem>
                  {filteredTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      <span className="block max-w-[280px] truncate">{task.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Energy check</label>
              <Select value={energyLevel} onValueChange={(value: EnergyLevel) => setEnergyLevel(value)}>
                <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High energy</SelectItem>
                  <SelectItem value="medium">Medium energy</SelectItem>
                  <SelectItem value="low">Low energy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Session type</label>
              <Select value={sessionType} onValueChange={(value: SessionType) => setSessionType(value)}>
                <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!taskId && (
              <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/45 p-3">
                <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                  Objective / custom task
                </label>
                <input
                  type="text"
                  placeholder="e.g. Understand enzyme kinetics deeply"
                  value={taskSuggestion}
                  onChange={(event) => setTaskSuggestion(event.target.value)}
                  className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
                />
                <div className="space-y-1.5">
                  {taskBankSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setTaskSuggestion(suggestion)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs transition-smooth ${
                        taskSuggestion === suggestion
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                          : 'bg-[var(--card)] text-[var(--card-fg)] border-[var(--border)] hover:bg-[var(--muted)]'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-card p-5 space-y-3">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Duration</label>
            <div className="grid grid-cols-5 gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setDurationGoal(preset.value)}
                  className={`py-2.5 rounded-xl text-xs font-medium transition-smooth border ${
                    durationGoal === preset.value
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                      : 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)] hover:bg-[var(--card)]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleStart} className="w-full h-12 rounded-xl text-base font-semibold bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110 transition-smooth">
            <Play className="h-5 w-5 mr-2" />
            Start Session
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'summary') {
    const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60))

    if (saved) {
      return (
        <div className="min-h-screen app-bg flex items-center justify-center">
          <div className="glass-card p-8 max-w-sm w-full text-center space-y-4">
            <div className="p-4 rounded-full bg-green-500/10 border border-green-500/30 w-fit mx-auto">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--card-fg)]">Session Logged!</h2>
            <p className="text-sm text-[var(--muted-fg)]">{actualMinutes} minutes of focused study.</p>
            <div className="flex gap-3">
              <Button onClick={resetForNewSession} className="flex-1 btn-glass rounded-xl">
                New Session
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl hover:brightness-110">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )
    }

    if (discarded) {
      return (
        <div className="min-h-screen app-bg flex items-center justify-center">
          <div className="glass-card p-8 max-w-sm w-full text-center space-y-4">
            <div className="p-4 rounded-full bg-[var(--muted)] border border-[var(--border)] w-fit mx-auto">
              <X className="h-8 w-8 text-[var(--muted-fg)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--card-fg)]">Session Discarded</h2>
            <p className="text-sm text-[var(--muted-fg)]">This session was not saved.</p>
            <div className="flex gap-3">
              <Button onClick={resetForNewSession} className="flex-1 btn-glass rounded-xl">
                New Session
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl hover:brightness-110">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="glass-card p-6 max-w-sm w-full space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-[var(--card-fg)]">Session Complete</h2>
            <p className="dotted-number-md">{formatTime(elapsedSeconds)}</p>
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted-fg)]">
              {selectedSubject && (
                <>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedSubjectDotColor }} />
                  <span>{selectedSubject.name}</span>
                </>
              )}
              {selectedTask ? (
                <span className="max-w-[200px] truncate">· {selectedTask.title}</span>
              ) : taskSuggestion ? (
                <span className="max-w-[200px] truncate">· {taskSuggestion}</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">How productive was this session?</label>
            <div className="flex gap-2">
              {PRODUCTIVITY_RATINGS.map((item) => {
                const icons = { good: ThumbsUp, okay: Minus, poor: ThumbsDown }
                const Icon = icons[item.value]
                const colors = {
                  good: rating === item.value ? 'bg-green-500/20 border-green-500/50 text-green-400' : '',
                  okay: rating === item.value ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : '',
                  poor: rating === item.value ? 'bg-red-500/20 border-red-500/50 text-red-400' : '',
                }
                return (
                  <button
                    key={item.value}
                    onClick={() => setRating(item.value)}
                    className={`flex-1 py-3 rounded-xl text-xs font-medium transition-smooth border flex flex-col items-center gap-1.5 ${
                      colors[item.value] || 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)] hover:bg-[var(--card)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">Notes (optional)</label>
            <Textarea
              placeholder="What did you accomplish?"
              value={summaryNotes}
              onChange={(event) => setSummaryNotes(event.target.value)}
              rows={2}
              className="bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)] resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleDiscard}
              disabled={saving}
              variant="outline"
              className="flex-1 bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)] rounded-xl"
            >
              Discard
            </Button>
            <Button
              onClick={handleSaveCompleted}
              disabled={saving}
              className="flex-1 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl hover:brightness-110"
            >
              {saving ? 'Saving...' : 'Save Session'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen app-bg relative flex flex-col transition-colors duration-500 ${
        ambientMode
          ? 'bg-[radial-gradient(ellipse_at_top,_#374151_0%,_#1f2937_38%,_#0f172a_68%,_#020617_100%)]'
          : ''
      }`}
    >
      {ambientMode && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-black/25 z-0 transition-opacity duration-500" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.30)_0%,_rgba(79,70,229,0.22)_34%,_transparent_66%)] z-0" />
        </>
      )}

      <div className={`relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 transition-opacity duration-500 ${ambientMode ? 'opacity-80' : 'opacity-100'}`}>
        <button
          onClick={() => handleEndSession(true)}
          className={`flex items-center gap-2 text-sm ${focusMutedTextClass} transition-smooth ${
            ambientMode ? 'hover:text-slate-100' : 'hover:text-[var(--card-fg)]'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">End Session</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAmbientMode((prev) => !prev)}
            className={`p-2 rounded-lg ${focusMutedTextClass} hover:bg-[var(--muted)] transition-smooth ${
              ambientMode ? 'hover:text-slate-100' : 'hover:text-[var(--card-fg)]'
            }`}
            title={ambientMode ? 'Normal mode' : 'Ambient mode'}
          >
            {ambientMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setShowSpotify((prev) => !prev)}
            className={`px-3 py-2 rounded-lg transition-smooth border flex items-center gap-1.5 ${
              showSpotify
                ? 'text-green-400 bg-green-500/10 border-green-500/40'
                : `${focusMutedTextClass} border-[var(--border)] hover:bg-[var(--muted)] ${ambientMode ? 'hover:text-slate-100' : 'hover:text-[var(--card-fg)]'}`
            }`}
            title="Toggle music"
          >
            <Music className="h-4 w-4" />
            <span className="text-xs font-medium">Music</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4">
        <div className={`mb-5 px-5 py-3 rounded-2xl border ${focusSurfaceClass} backdrop-blur text-center transition-opacity duration-500 ${ambientMode ? 'opacity-95' : 'opacity-100'}`}>
          <div className={`flex items-center justify-center gap-2 ${focusMutedTextClass} text-xs uppercase tracking-[0.15em]`}>
            <Clock className="h-3.5 w-3.5" />
            Current Time
          </div>
          <p className={`font-doto text-3xl sm:text-4xl ${focusPrimaryTextClass} mt-1 tabular-nums`}>{liveClock}</p>
        </div>

        <div className={`max-w-xl w-full flex items-center justify-center gap-2 mb-6 text-sm ${focusMutedTextClass} transition-opacity duration-500 ${ambientMode ? 'opacity-95' : 'opacity-100'}`}>
          {selectedSubject && (
            <>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedSubjectDotColor }} />
              <span className={`font-medium ${focusPrimaryTextClass}`}>{selectedSubject.name}</span>
            </>
          )}
          {(selectedTask || taskSuggestion) && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className="truncate max-w-[220px] sm:max-w-[420px]">{selectedTask?.title || taskSuggestion}</span>
            </>
          )}
        </div>

        <div className="relative w-72 h-72 sm:w-[21rem] sm:h-[21rem] mb-7">
          {ambientMode && (
            <div className="absolute inset-0 rounded-full blur-3xl bg-[var(--accent)]/35 animate-pulse" />
          )}

          <svg className="w-full h-full -rotate-90" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="var(--border)" strokeWidth="4" />
            {isCountdown && (
              <circle
                cx="150"
                cy="150"
                r="140"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                className="transition-all duration-1000 ease-linear"
              />
            )}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-doto font-black ${timerTextClass} ${focusPrimaryTextClass} tracking-wider tabular-nums leading-none`}>
              {formatTime(displaySeconds)}
            </span>
            {isCountdown ? (
              <span className={`text-xs ${focusMutedTextClass} mt-2`}>
                {Math.round(progress * 100)}% complete
              </span>
            ) : (
              <span className={`text-xs ${focusMutedTextClass} mt-2`}>Elapsed</span>
            )}
          </div>
        </div>

        <div className={`mb-6 px-4 py-2 rounded-xl border ${focusSurfaceClass} text-[11px] ${focusMutedTextClass} uppercase tracking-wide transition-opacity duration-500 ${ambientMode ? 'opacity-85' : 'opacity-100'}`}>
          One thing at a time. Quiet effort compounds.
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handlePauseResume}
            className={`p-4 rounded-full transition-smooth ${
              isRunning
                ? 'bg-[var(--muted)] text-[var(--card-fg)] hover:bg-[var(--card)] border border-[var(--border)]'
                : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110'
            }`}
          >
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>

          <button
            onClick={() => handleEndSession(false)}
            className="p-4 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-smooth"
            title="End session"
          >
            <Square className="h-6 w-6" />
          </button>
        </div>

        {startTime && (
          <p className={`text-[10px] mt-6 ${focusMutedTextClass} uppercase tracking-wider transition-opacity duration-500 ${ambientMode ? 'opacity-90' : 'opacity-100'}`}>
            Started at {format(startTime, 'h:mm a')}
          </p>
        )}
      </div>

      {showSpotify && (
        <div className={`relative z-10 border-t ${focusPanelClass} backdrop-blur-lg transition-opacity duration-500 ${ambientMode ? 'opacity-90' : 'opacity-100'}`}>
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-green-400" />
                <span className={`text-xs font-medium ${focusPrimaryTextClass}`}>Music</span>
              </div>
              <button
                onClick={() => setShowSpotify(false)}
                className={`${focusMutedTextClass} ${ambientMode ? 'hover:text-slate-100' : 'hover:text-[var(--card-fg)]'}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              {DEFAULT_PLAYLISTS.map((playlist) => (
                <button
                  key={playlist.name}
                  onClick={() => setSpotifyUrl(playlist.url)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-smooth border ${
                    spotifyUrl === playlist.url
                      ? 'bg-green-500/20 border-green-500/40 text-green-400'
                      : 'bg-[var(--muted)] border-[var(--border)] text-[var(--muted-fg)] hover:bg-[var(--card)]'
                  }`}
                >
                  {playlist.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste Spotify playlist URL..."
                value={customUrl}
                onChange={(event) => setCustomUrl(event.target.value)}
                className="flex-1 h-8 px-3 rounded-lg text-xs bg-[var(--muted)] border border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
              />
              <Button
                size="sm"
                onClick={() => {
                  const url = extractSpotifyEmbedUrl(customUrl)
                  if (url) {
                    setSpotifyUrl(url)
                    setCustomUrl('')
                  }
                }}
                disabled={!customUrl.trim()}
                className="h-8 px-3 text-xs btn-glass rounded-lg"
              >
                Load
              </Button>
            </div>

            <div className="rounded-xl overflow-hidden">
              <iframe
                src={`${spotifyUrl}?theme=0`}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="border-0 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
