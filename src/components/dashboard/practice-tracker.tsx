'use client'

import { useState, useEffect, useMemo } from 'react'
import { differenceInDays } from 'date-fns'
import { Subject, SyllabusTopic, SUBJECT_COLORS } from '@/lib/types'
import { AddPracticeTopicDialog } from './add-practice-topic-dialog'
import { LogPracticeDialog } from './log-practice-dialog'
import {
  Dumbbell,
  Plus,
  ChevronDown,
  ChevronUp,
  Trophy,
  AlertCircle,
  RefreshCw,
  X,
  CircleDashed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'

interface PracticeTrackerProps {
  subjects: Subject[]
  syllabusTopics: SyllabusTopic[]
}

const DIFFICULTY_REMINDER_DAYS: Record<number, number> = {
  1: 30,
  2: 21,
  3: 14,
  4: 10,
  5: 7,
}

function shouldRemindRevisit(topic: SyllabusTopic): boolean {
  if (!topic.reminder_enabled) return false
  if (topic.practice_status !== 'mastered') return false
  if (!topic.mastered_at) return false
  const daysSinceMastery = differenceInDays(new Date(), new Date(topic.mastered_at))
  const threshold = DIFFICULTY_REMINDER_DAYS[topic.difficulty ?? 3]
  return daysSinceMastery >= threshold
}

function daysSinceLabel(lastPracticed: string | null): { label: string; color: string } {
  if (!lastPracticed) return { label: 'Never', color: 'text-red-400' }
  const days = differenceInDays(new Date(), new Date(lastPracticed))
  if (days >= 14) return { label: `${days}d ago`, color: 'text-red-400' }
  if (days >= 7) return { label: `${days}d ago`, color: 'text-amber-400' }
  if (days >= 4) return { label: `${days}d ago`, color: 'text-yellow-400' }
  if (days === 0) return { label: 'Today', color: 'text-green-400' }
  return { label: `${days}d ago`, color: 'text-green-400' }
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
  const color = colors[Math.min(confidence - 1, 4)] || 'bg-red-500'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${(confidence / 5) * 100}%` }}
        />
      </div>
      <span className="text-[10px] text-[var(--muted-fg)] w-6 text-right">{confidence}/5</span>
    </div>
  )
}

function TopicCard({
  topic,
  subject,
  onLogPractice,
}: {
  topic: SyllabusTopic
  subject: Subject | undefined
  onLogPractice: (topic: SyllabusTopic) => void
}) {
  const { label, color } = daysSinceLabel(topic.last_practiced_at)
  const colorDot = SUBJECT_COLORS.find(c => c.name === subject?.color)?.class || 'bg-slate-500'

  return (
    <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 space-y-2.5 hover:border-white/20 transition-smooth">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {subject && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colorDot}`} />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--card-fg)] leading-tight">{topic.topic_name}</p>
            {subject && <p className="text-[10px] text-[var(--muted-fg)]">{subject.name}</p>}
          </div>
        </div>
        <span className={`text-[10px] font-medium flex-shrink-0 ${color}`}>{label}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--muted-fg)] w-14 flex-shrink-0">Confidence</span>
          <ConfidenceBar confidence={topic.confidence} />
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => onLogPractice(topic)}
        className="btn-glass h-7 px-3 text-xs rounded-lg w-full"
      >
        <Dumbbell className="h-3 w-3 mr-1.5" />
        Log Practice
      </Button>
    </div>
  )
}

function ReviewCard({
  topic,
  subject,
  onLogPractice,
  onDismiss,
}: {
  topic: SyllabusTopic
  subject: Subject | undefined
  onLogPractice: (topic: SyllabusTopic) => void
  onDismiss: (topicId: string) => void
}) {
  const colorDot = SUBJECT_COLORS.find(c => c.name === subject?.color)?.class || 'bg-slate-500'
  const daysSinceMastery = topic.mastered_at
    ? differenceInDays(new Date(), new Date(topic.mastered_at))
    : null
  const difficultyLabels: Record<number, string> = {
    1: 'Easy', 2: 'Moderate', 3: 'Challenging', 4: 'Hard', 5: 'Very Hard',
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-500/30 bg-blue-500/5">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {subject && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colorDot}`} />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--card-fg)] truncate">{topic.topic_name}</p>
          <p className="text-[10px] text-[var(--muted-fg)]">
            {difficultyLabels[topic.difficulty ?? 3]} • Mastered {daysSinceMastery}d ago
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          size="sm"
          onClick={() => onLogPractice(topic)}
          className="btn-glass h-7 px-2.5 text-xs rounded-lg"
        >
          Review
        </Button>
        <button
          onClick={() => onDismiss(topic.id)}
          className="p-1.5 rounded-lg text-[var(--muted-fg)] hover:text-[var(--card-fg)] hover:bg-[var(--muted)] transition-smooth"
          title="Dismiss reminder"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function MasteredSubjectGroup({
  subject,
  topics,
  isExpanded,
  onToggle,
  onUnmaster,
  colorDot,
}: {
  subject: Subject
  topics: SyllabusTopic[]
  isExpanded: boolean
  onToggle: () => void
  onUnmaster: (topicId: string) => void
  colorDot: string
}) {
  return (
    <div className="space-y-1.5">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colorDot}`} />
        <span className="text-xs font-medium text-[var(--card-fg)] flex-1">
          {subject.name} ({topics.length})
        </span>
        {isExpanded
          ? <ChevronUp className="h-3.5 w-3.5 text-[var(--muted-fg)] group-hover:text-[var(--card-fg)]" />
          : <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-fg)] group-hover:text-[var(--card-fg)]" />
        }
      </button>
      {isExpanded && (
        <div className="flex flex-wrap gap-1.5 pl-4">
          {topics.map(topic => (
            <div
              key={topic.id}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400"
            >
              <span className="font-medium">{topic.topic_name}</span>
              <button
                onClick={() => onUnmaster(topic.id)}
                title="Move back to tracking"
                className="ml-0.5 hover:text-white transition-smooth"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PracticeTracker({ subjects, syllabusTopics: initialTopics }: PracticeTrackerProps) {
  const [topics, setTopics] = useState<SyllabusTopic[]>(initialTopics)
  const [addOpen, setAddOpen] = useState(false)
  const [logTopic, setLogTopic] = useState<SyllabusTopic | null>(null)
  const [showOnTrack, setShowOnTrack] = useState(false)
  const [showMastered, setShowMastered] = useState(true)
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set())
  // Track which mastered subject groups are expanded (first 2 auto-expanded)
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())

  const subjectsById = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects])

  useEffect(() => {
    setTopics(initialTopics)
  }, [initialTopics])

  // Listen for cross-component updates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SyllabusTopic[]>).detail
      if (Array.isArray(detail)) setTopics(detail)
    }
    window.addEventListener('practice-topics-updated', handler as EventListener)
    return () => window.removeEventListener('practice-topics-updated', handler as EventListener)
  }, [])

  const trackedTopics = useMemo(() =>
    topics.filter(t => t.practice_status !== 'not_tracking'),
    [topics]
  )

  const tracking = useMemo(() =>
    trackedTopics.filter(t => t.practice_status === 'tracking'),
    [trackedTopics]
  )
  const onTrack = useMemo(() =>
    trackedTopics.filter(t => t.practice_status === 'on_track'),
    [trackedTopics]
  )
  const mastered = useMemo(() =>
    trackedTopics.filter(t => t.practice_status === 'mastered'),
    [trackedTopics]
  )
  const reviewDue = useMemo(() =>
    mastered.filter(t => shouldRemindRevisit(t) && !dismissedReminders.has(t.id)),
    [mastered, dismissedReminders]
  )

  // Group mastered by subject, auto-expand first 2
  const masteredBySubject = useMemo(() => {
    const grouped: Record<string, SyllabusTopic[]> = {}
    for (const topic of mastered) {
      if (!grouped[topic.subject_id]) grouped[topic.subject_id] = []
      grouped[topic.subject_id].push(topic)
    }
    return Object.entries(grouped).map(([subjectId, topics]) => ({
      subject: subjectsById.get(subjectId),
      subjectId,
      topics,
    }))
  }, [mastered, subjectsById])

  // Auto-expand first 2 subject groups when mastered list changes
  useEffect(() => {
    const firstTwo = masteredBySubject.slice(0, 2).map(g => g.subjectId)
    setExpandedSubjects(new Set(firstTwo))
  }, [masteredBySubject.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTopicAdded(newTopic: SyllabusTopic) {
    const updated = [...topics, newTopic]
    setTopics(updated)
    window.dispatchEvent(new CustomEvent('practice-topics-updated', { detail: updated }))
  }

  function handleLogged(updatedTopic: SyllabusTopic) {
    const updated = topics.map(t => t.id === updatedTopic.id ? updatedTopic : t)
    setTopics(updated)
    window.dispatchEvent(new CustomEvent('practice-topics-updated', { detail: updated }))
  }

  async function handleUnmaster(topicId: string) {
    let updatedTopic: SyllabusTopic | null = null

    if (isElectronRuntime()) {
      const userId = await getDesktopUserId()
      if (!userId) {
        return
      }

      const rows = await invokeDesktopDb<SyllabusTopic[]>('updateTableRecords', [
        'syllabus_topics',
        userId,
        { id: topicId },
        { practice_status: 'tracking', mastered_at: null },
      ])
      updatedTopic = rows[0] ?? null
    } else {
      const supabase = createClient()
      const { data } = await supabase
        .from('syllabus_topics')
        .update({ practice_status: 'tracking', mastered_at: null })
        .eq('id', topicId)
        .select()
        .single()

      updatedTopic = (data as SyllabusTopic | null) ?? null
    }

    if (updatedTopic) {
      const updated = topics.map(t => t.id === topicId ? updatedTopic as SyllabusTopic : t)
      setTopics(updated)
      window.dispatchEvent(new CustomEvent('practice-topics-updated', { detail: updated }))
    }
  }

  if (trackedTopics.length === 0) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
              <Dumbbell className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Practice Tracker</h2>
          </div>
        </div>
        <div className="text-center py-8">
          <Dumbbell className="h-10 w-10 mx-auto text-[var(--muted-fg)] mb-3" />
          <p className="text-sm text-[var(--muted-fg)] mb-1">No topics in practice yet</p>
          <p className="text-xs text-[var(--muted-fg)]">Add syllabus topics to track your practice on them.</p>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="mt-4 token-btn-accent rounded-xl"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Topic to Practice
          </Button>
        </div>
        <AddPracticeTopicDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          subjects={subjects}
          allSyllabusTopics={topics}
          onTopicAdded={handleTopicAdded}
        />
      </div>
    )
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <Dumbbell className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Practice Tracker</h2>
        </div>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          className="btn-glass h-8 px-3 text-xs rounded-xl"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Topic
        </Button>
      </div>

      <div className="space-y-4">
        {/* Review Suggested */}
        {reviewDue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
                Review Suggested ({reviewDue.length})
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted-fg)] mb-2 pl-5">
              These mastered topics are due for a quick revisit
            </p>
            <div className="space-y-2">
              {reviewDue.map(topic => (
                <ReviewCard
                  key={topic.id}
                  topic={topic}
                  subject={subjectsById.get(topic.subject_id)}
                  onLogPractice={setLogTopic}
                  onDismiss={id => setDismissedReminders(prev => new Set([...prev, id]))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Needs Practice (Tracking) */}
        {tracking.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                Needs Practice ({tracking.length})
              </span>
            </div>
            <div className="space-y-2">
              {tracking.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  subject={subjectsById.get(topic.subject_id)}
                  onLogPractice={setLogTopic}
                />
              ))}
            </div>
          </div>
        )}

        {/* On Track */}
        {onTrack.length > 0 && (
          <div>
            <button
              onClick={() => setShowOnTrack(v => !v)}
              className="flex items-center gap-2 w-full text-left mb-2 group"
            >
              <CircleDashed className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
              <span className="text-xs font-medium text-green-400 uppercase tracking-wider flex-1">
                On Track ({onTrack.length})
              </span>
              {showOnTrack
                ? <ChevronUp className="h-3.5 w-3.5 text-[var(--muted-fg)] group-hover:text-[var(--card-fg)]" />
                : <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-fg)] group-hover:text-[var(--card-fg)]" />
              }
            </button>
            {showOnTrack ? (
              <div className="space-y-2">
                {onTrack.map(topic => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    subject={subjectsById.get(topic.subject_id)}
                    onLogPractice={setLogTopic}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-fg)] pl-5 pb-1">
                {onTrack.map(t => t.topic_name).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Mastered - Grouped by Subject */}
        {mastered.length > 0 && (
          <div>
            <button
              onClick={() => setShowMastered(v => !v)}
              className="flex items-center gap-2 w-full text-left mb-2 group"
            >
              <Trophy className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider flex-1">
                Mastered ({mastered.length})
              </span>
              {showMastered
                ? <ChevronUp className="h-3.5 w-3.5 text-[var(--muted-fg)] group-hover:text-[var(--card-fg)]" />
                : <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-fg)] group-hover:text-[var(--card-fg)]" />
              }
            </button>
            {showMastered && (
              <div className="space-y-3 pl-1">
                {masteredBySubject.map(({ subject, subjectId, topics: subjectTopics }) => {
                  const colorDot = SUBJECT_COLORS.find(c => c.name === subject?.color)?.class || 'bg-slate-500'
                  const isExpanded = expandedSubjects.has(subjectId)
                  return (
                    <MasteredSubjectGroup
                      key={subjectId}
                      subject={subject ?? { id: subjectId, name: 'Unknown', color: '', confidence: 3, level: 'SL', user_id: '', current_grade: null, predicted_grade: null, target_grade: null, teacher_name: null, teacher_email: null, notes: null, created_at: '' }}
                      topics={subjectTopics}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedSubjects(prev => {
                        const next = new Set(prev)
                        if (next.has(subjectId)) next.delete(subjectId)
                        else next.add(subjectId)
                        return next
                      })}
                      onUnmaster={handleUnmaster}
                      colorDot={colorDot}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddPracticeTopicDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        subjects={subjects}
        allSyllabusTopics={topics}
        onTopicAdded={handleTopicAdded}
      />

      {logTopic && (
        <LogPracticeDialog
          open={!!logTopic}
          onOpenChange={open => { if (!open) setLogTopic(null) }}
          topic={logTopic}
          onLogged={updatedTopic => {
            handleLogged(updatedTopic)
            setLogTopic(null)
          }}
        />
      )}
    </div>
  )
}
