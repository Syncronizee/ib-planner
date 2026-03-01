'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  calculateFocusAreas,
  getWeekStart,
  readLocalFocusAreaProgress,
  writeLocalFocusAreaProgress,
} from '@/lib/focus-areas'
import { Subject, Assessment, Task, WeaknessTag, FocusArea, EnergyCheckin } from '@/lib/types'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'
import {
  Target, CheckCircle2, Loader2, BookOpen,
  Zap, Clock, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { WeaknessReflectionDialog } from './weakness-reflection-dialog'

interface FocusAreasProps {
  subjects: Subject[]
  assessments: Assessment[]
  tasks: Task[]
  weaknesses: WeaknessTag[]
  energyCheckins?: EnergyCheckin[]
}

// ── Subject color map (uses subject.color name → Tailwind classes) ─────────────

const SUBJECT_COLOR_MAP: Record<string, { card: string; dot: string; text: string }> = {
  slate:  { card: 'border-slate-500/30 bg-slate-500/10',  dot: 'bg-slate-500',  text: 'text-slate-400'  },
  red:    { card: 'border-red-500/30 bg-red-500/10',      dot: 'bg-red-500',    text: 'text-red-400'    },
  orange: { card: 'border-orange-500/30 bg-orange-500/10',dot: 'bg-orange-500', text: 'text-orange-400' },
  amber:  { card: 'border-amber-500/30 bg-amber-500/10',  dot: 'bg-amber-500',  text: 'text-amber-400'  },
  green:  { card: 'border-green-500/30 bg-green-500/10',  dot: 'bg-green-500',  text: 'text-green-400'  },
  blue:   { card: 'border-blue-500/30 bg-blue-500/10',    dot: 'bg-blue-500',   text: 'text-blue-400'   },
  purple: { card: 'border-purple-500/30 bg-purple-500/10',dot: 'bg-purple-500', text: 'text-purple-400' },
  pink:   { card: 'border-pink-500/30 bg-pink-500/10',    dot: 'bg-pink-500',   text: 'text-pink-400'   },
}
const DEFAULT_SUBJECT_STYLE = { card: 'border-[var(--border)] bg-[var(--muted)]/40', dot: 'bg-slate-500', text: 'text-[var(--muted-fg)]' }

function getSubjectStyle(subject: Subject) {
  return SUBJECT_COLOR_MAP[subject.color] ?? DEFAULT_SUBJECT_STYLE
}

// ── Urgency dot ───────────────────────────────────────────────────────────────

function UrgencyDot({ urgency }: { urgency: 'high' | 'medium' | 'low' }) {
  if (urgency === 'high') return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="High urgency" />
  if (urgency === 'medium') return <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Medium urgency" />
  return <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" title="Low urgency" />
}

// ── Compact focus area card ───────────────────────────────────────────────────

function FocusAreaCard({
  area,
  rank,
  onStudy,
  onOpenWeakness,
}: {
  area: FocusArea
  rank: number
  onStudy: (area: FocusArea) => void
  onOpenWeakness: (area: FocusArea) => void
}) {
  const style = getSubjectStyle(area.subject)

  if (area.addressed) {
    return (
      <button
        type="button"
        onClick={() => onOpenWeakness(area)}
        className={`flex items-center gap-3 p-4 rounded-2xl border w-full text-left opacity-70 hover:opacity-100 transition-smooth ${style.card}`}
        title="View weakness in subject tile"
      >
        <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium line-through truncate ${style.text}`}>{area.title}</p>
          <p className="text-xs text-[var(--muted-fg)]">{area.subject.name} · Done this week</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-[var(--muted-fg)] flex-shrink-0" />
      </button>
    )
  }

  return (
    <div className={`p-4 rounded-2xl border transition-smooth ${style.card}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-[var(--muted-fg)] w-4">{rank}</span>
        <UrgencyDot urgency={area.urgency} />
        <button
          type="button"
          onClick={() => onOpenWeakness(area)}
          className={`text-xs truncate flex-1 text-left hover:underline font-semibold ${style.text}`}
          title="Open in subjects"
        >
          {area.subject.name}
        </button>
        <ExternalLink
          className={`h-3 w-3 flex-shrink-0 ${style.text} opacity-50`}
        />
      </div>
      <button
        type="button"
        onClick={() => onOpenWeakness(area)}
        className="w-full text-left mb-1.5"
        title="Open in subjects"
      >
        <p className="text-sm font-semibold text-[var(--card-fg)] leading-snug line-clamp-3 hover:underline">{area.title}</p>
      </button>
      <p className="text-xs mb-3 leading-snug text-[var(--muted-fg)] line-clamp-2">{area.reason}</p>
      <Button
        size="sm"
        onClick={() => onStudy(area)}
        className="btn-glass h-8 px-3 text-xs rounded-xl w-full"
      >
        Study
      </Button>
    </div>
  )
}

// ── Study Choice Dialog ───────────────────────────────────────────────────────

function StudyChoiceDialog({
  area,
  open,
  onClose,
  onQuickLog,
  onFocusSession,
}: {
  area: FocusArea | null
  open: boolean
  onClose: () => void
  onQuickLog: (area: FocusArea) => void
  onFocusSession: (area: FocusArea) => void
}) {
  if (!area) return null
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm bg-[var(--card)] border-[var(--border)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--card-fg)] text-sm">How do you want to study?</DialogTitle>
          <p className="text-xs text-[var(--muted-fg)]">{area.subject.name} — {area.title}</p>
        </DialogHeader>
        <div className="space-y-2 mt-1">
          <button
            onClick={() => { onFocusSession(area); onClose() }}
            className="flex items-start gap-3 w-full p-3.5 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 hover:border-white/20 hover:bg-[var(--muted)]/70 transition-smooth text-left"
          >
            <div className="p-1.5 rounded-lg bg-[var(--accent)] flex-shrink-0">
              <Zap className="h-3.5 w-3.5 text-[var(--accent-fg)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--card-fg)]">Start Focus Session</p>
              <p className="text-[10px] text-[var(--muted-fg)] mt-0.5">Dedicated timer + focus page</p>
            </div>
          </button>
          <button
            onClick={() => { onQuickLog(area); onClose() }}
            className="flex items-start gap-3 w-full p-3.5 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 hover:border-white/20 hover:bg-[var(--muted)]/70 transition-smooth text-left"
          >
            <div className="p-1.5 rounded-lg bg-[var(--muted)] border border-[var(--border)] flex-shrink-0">
              <Clock className="h-3.5 w-3.5 text-[var(--muted-fg)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--card-fg)]">Quick Log</p>
              <p className="text-[10px] text-[var(--muted-fg)] mt-0.5">Just log the study time</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Quick Log Dialog ──────────────────────────────────────────────────────────

const PRESET_DURATIONS = [15, 25, 45, 60]

function QuickLogDialog({
  area,
  open,
  onClose,
  onLogged,
}: {
  area: FocusArea | null
  open: boolean
  onClose: () => void
  onLogged: (weaknessId: string) => void
}) {
  const [duration, setDuration] = useState<number>(25)
  const [customDuration, setCustomDuration] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveDuration = useCustom ? (parseInt(customDuration) || 25) : duration

  async function upsertElectronFocusAreaProgress(userId: string, areaId: string, type: string, addressedAt: string) {
    const existing = await invokeDesktopDb<Array<{ id: string }>>('queryTable', [
      'focus_area_progress',
      {
        userId,
        filters: {
          week_start: getWeekStart(),
          focus_area_id: areaId,
        },
        limit: 1,
      },
    ])

    if (existing[0]?.id) {
      await invokeDesktopDb('updateTableRecords', [
        'focus_area_progress',
        userId,
        { id: existing[0].id },
        {
          focus_area_type: type,
          addressed_at: addressedAt,
          deleted_at: null,
        },
      ])
      return
    }

    await invokeDesktopDb('createTableRecord', [
      'focus_area_progress',
      userId,
      {
        user_id: userId,
        week_start: getWeekStart(),
        focus_area_id: areaId,
        focus_area_type: type,
        addressed_at: addressedAt,
      },
    ])
  }

  async function handleSubmit() {
    if (!area) return
    setSaving(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const weaknessId = area.action.weaknessId!
      if (isElectronRuntime()) {
        const userId = await getDesktopUserId()
        if (!userId) {
          throw new Error('No local user session found.')
        }

        const currentWeakness = await invokeDesktopDb<WeaknessTag[]>('queryTable', [
          'weakness_tags',
          {
            userId,
            filters: { id: weaknessId },
            limit: 1,
          },
        ])

        await invokeDesktopDb('createTableRecord', [
          'study_sessions',
          userId,
          {
            user_id: userId,
            subject_id: area.subject.id,
            task_id: null,
            duration_minutes: effectiveDuration,
            duration_goal_minutes: effectiveDuration,
            actual_duration_minutes: effectiveDuration,
            energy_level: 'medium',
            session_type: 'practice',
            productivity_rating: null,
            session_status: 'completed',
            notes: `Quick log: ${area.title}`,
            started_at: now,
          },
        ])

        await invokeDesktopDb('updateTableRecords', [
          'weakness_tags',
          userId,
          { id: weaknessId },
          {
            last_addressed_at: now,
            address_count: ((currentWeakness[0]?.address_count as number | undefined) ?? 0) + 1,
          },
        ])

        await upsertElectronFocusAreaProgress(userId, area.id, 'weakness', now)
      } else {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        await supabase.from('practice_logs').insert({
          user_id: user.id,
          topic_id: null,
          syllabus_topic_id: null,
          subject_id: area.subject.id,
          duration_minutes: effectiveDuration,
          notes: null,
          practiced_at: now,
        })

        const { data: currentWeakness } = await supabase
          .from('weakness_tags')
          .select('address_count')
          .eq('id', weaknessId)
          .single()

        await supabase.from('weakness_tags').update({
          last_addressed_at: now,
          address_count: ((currentWeakness?.address_count as number) ?? 0) + 1,
        }).eq('id', weaknessId)

        await supabase.from('focus_area_progress').upsert({
          week_start: getWeekStart(),
          focus_area_id: area.id,
          focus_area_type: 'weakness',
          addressed_at: now,
        })
      }

      setDuration(25)
      setCustomDuration('')
      setUseCustom(false)
      setError(null)
      onLogged(weaknessId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log')
    } finally {
      setSaving(false)
    }
  }

  if (!area) return null

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm bg-[var(--card)] border-[var(--border)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--card-fg)] text-sm">Quick Log</DialogTitle>
          <p className="text-xs text-[var(--muted-fg)]">{area.subject.name} — {area.title}</p>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Duration</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDuration(d); setUseCustom(false) }}
                  className={`py-2 rounded-lg text-xs font-medium border transition-smooth ${
                    !useCustom && duration === d
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                      : 'bg-[var(--muted)] text-[var(--card-fg)] border-[var(--border)] hover:border-white/20'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseCustom(v => !v)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-smooth ${
                  useCustom
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                    : 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)]'
                }`}
              >
                <Clock className="h-3 w-3 inline mr-1" />
                Custom
              </button>
              {useCustom && (
                <Input
                  type="number"
                  min={1}
                  max={300}
                  value={customDuration}
                  onChange={e => setCustomDuration(e.target.value)}
                  placeholder="minutes"
                  className="h-7 w-24 text-xs bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)]"
                />
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 btn-glass" disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 token-btn-accent">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Log & Reflect
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FocusAreas({
  subjects,
  assessments,
  tasks,
  weaknesses: initialWeaknesses,
}: FocusAreasProps) {
  const router = useRouter()
  const [weaknesses, setWeaknesses] = useState<WeaknessTag[]>(initialWeaknesses)
  const [addressedIds, setAddressedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Study flow state
  const [studyChoiceArea, setStudyChoiceArea] = useState<FocusArea | null>(null)
  const [quickLogArea, setQuickLogArea] = useState<FocusArea | null>(null)
  const [reflectionWeakness, setReflectionWeakness] = useState<{ weakness: WeaknessTag; subjectName: string } | null>(null)

  const weekStart = getWeekStart()

  const persistAddressedIds = useCallback((updater: (prev: Set<string>) => Set<string>) => {
    setAddressedIds((prev) => {
      const next = updater(prev)
      writeLocalFocusAreaProgress(weekStart, next)
      return next
    })
  }, [weekStart])

  const loadAddressed = useCallback(async () => {
    const localProgress = new Set(readLocalFocusAreaProgress(weekStart))

    if (isElectronRuntime()) {
      const userId = await getDesktopUserId()
      if (!userId) {
        setAddressedIds(localProgress)
        setLoading(false)
        return
      }

      const data = await invokeDesktopDb<Array<{ focus_area_id: string }>>('queryTable', [
        'focus_area_progress',
        {
          userId,
          filters: { week_start: weekStart },
        },
      ])
      const dbProgress = (data || []).map((row) => row.focus_area_id)
      setAddressedIds(new Set([...localProgress, ...dbProgress]))
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('focus_area_progress')
      .select('focus_area_id')
      .eq('week_start', weekStart)
    const remoteProgress = (data || []).map((r: { focus_area_id: string }) => r.focus_area_id)
    setAddressedIds(new Set([...localProgress, ...remoteProgress]))
    setLoading(false)
  }, [weekStart])

  useEffect(() => { loadAddressed() }, [loadAddressed])

  useEffect(() => {
    setWeaknesses(initialWeaknesses)
  }, [initialWeaknesses])

  useEffect(() => {
    const handler = () => loadAddressed()
    window.addEventListener('focus-areas-updated', handler)
    return () => window.removeEventListener('focus-areas-updated', handler)
  }, [loadAddressed])

  const focusAreas = calculateFocusAreas({ subjects, weaknesses, assessments, tasks }, addressedIds)
  const maxItems = 6
  const addressedCount = focusAreas.filter(a => a.addressed).length
  const progressPercent = focusAreas.length > 0 ? Math.round((addressedCount / focusAreas.length) * 100) : 0

  function handleStudyClick(area: FocusArea) {
    setStudyChoiceArea(area)
  }

  function handleFocusSession(area: FocusArea) {
    const params = new URLSearchParams({ subject: area.subject.id })
    if (area.action.weaknessId) {
      params.set('weakness', area.action.weaknessId)
      params.set('objective', `Address weakness: ${area.title}`)
    }
    router.push(`/dashboard/focus?${params.toString()}`)
  }

  function handleQuickLog(area: FocusArea) {
    setQuickLogArea(area)
  }

  function handleQuickLogComplete(weaknessId: string) {
    // Mark addressed locally
    persistAddressedIds(prev => new Set([...prev, `weakness-${weaknessId}`]))

    // Update weakness last_addressed_at locally
    setWeaknesses(prev => prev.map(w =>
      w.id === weaknessId
        ? { ...w, last_addressed_at: new Date().toISOString(), address_count: (w.address_count ?? 0) + 1 }
        : w
    ))

    // Find the weakness for reflection
    const weakness = weaknesses.find(w => w.id === weaknessId)
    const area = focusAreas.find(a => a.action.weaknessId === weaknessId)

    // Close the quick log dialog first, then open reflection after a short delay
    // to avoid Radix UI portal timing conflicts between two simultaneous dialogs
    setQuickLogArea(null)
    if (weakness && area) {
      setTimeout(() => {
        setReflectionWeakness({ weakness, subjectName: area.subject.name })
      }, 200)
    }
    window.dispatchEvent(new CustomEvent('focus-areas-updated'))
    // Signal the subject detail modal to refresh weaknesses
    window.dispatchEvent(new CustomEvent('weaknesses-updated', { detail: { weaknessId } }))
  }

  function handleReflectionComplete(resolved: boolean) {
    if (reflectionWeakness) {
      persistAddressedIds((prev) => new Set([...prev, `weakness-${reflectionWeakness.weakness.id}`]))
    }

    if (resolved && reflectionWeakness) {
      setWeaknesses(prev => prev.map(w =>
        w.id === reflectionWeakness.weakness.id ? { ...w, is_resolved: true } : w
      ))
    }
    setReflectionWeakness(null)
    window.dispatchEvent(new CustomEvent('focus-areas-updated'))
    window.dispatchEvent(new CustomEvent('weaknesses-updated'))
  }

  // Open the subject detail modal on the weaknesses tab for this weakness
  function handleOpenWeakness(area: FocusArea) {
    window.dispatchEvent(new CustomEvent('open-subject-weakness', {
      detail: { subjectId: area.subject.id, weaknessId: area.action.weaknessId },
    }))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-5">
        <Header count={0} max={maxItems} />
        <div className="flex items-center gap-2 py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-fg)]" />
          <span className="text-sm text-[var(--muted-fg)]">Loading...</span>
        </div>
      </div>
    )
  }

  if (focusAreas.length === 0) {
    return (
      <div className="p-5">
        <Header count={0} max={maxItems} />
        <div className="text-center py-8">
          <BookOpen className="h-10 w-10 mx-auto text-[var(--muted-fg)] mb-3" />
          <p className="text-sm text-[var(--muted-fg)]">Add weaknesses in your subjects to see focus areas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5">
      <Header count={addressedCount} max={focusAreas.length} />

      {/* 2-column responsive grid */}
      <div
        className="grid gap-3 mb-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        {focusAreas.map((area, idx) => (
          <FocusAreaCard
            key={area.id}
            area={area}
            rank={idx + 1}
            onStudy={handleStudyClick}
            onOpenWeakness={handleOpenWeakness}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2 rounded-full bg-[var(--muted)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-[var(--muted-fg)]">
          {addressedCount === focusAreas.length && focusAreas.length > 0
            ? 'All focus areas addressed this week!'
            : `${addressedCount}/${focusAreas.length} addressed — resets Monday`}
        </p>
      </div>

      {/* Study Choice Dialog */}
      <StudyChoiceDialog
        area={studyChoiceArea}
        open={!!studyChoiceArea}
        onClose={() => setStudyChoiceArea(null)}
        onQuickLog={handleQuickLog}
        onFocusSession={handleFocusSession}
      />

      {/* Quick Log Dialog */}
      <QuickLogDialog
        area={quickLogArea}
        open={!!quickLogArea}
        onClose={() => setQuickLogArea(null)}
        onLogged={handleQuickLogComplete}
      />

      {/* Reflection Dialog */}
      {reflectionWeakness && (
        <WeaknessReflectionDialog
          open={!!reflectionWeakness}
          onOpenChange={o => { if (!o) setReflectionWeakness(null) }}
          weakness={reflectionWeakness.weakness}
          subjectName={reflectionWeakness.subjectName}
          onComplete={handleReflectionComplete}
        />
      )}
    </div>
  )
}

function Header({ count, max }: { count: number; max: number }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
          <Target className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Focus Areas</h2>
      </div>
      {max > 0 && (
        <span className="text-sm text-[var(--muted-fg)] bg-[var(--muted)] px-3 py-1 rounded-full border border-[var(--border)]">
          This week: {count}/{max}
        </span>
      )}
    </div>
  )
}
