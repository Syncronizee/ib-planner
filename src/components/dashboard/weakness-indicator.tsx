'use client'

import { useState, useEffect } from 'react'
import { Subject, WeaknessTag, SUBJECT_COLORS } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Calendar,
  GraduationCap,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WeaknessIndicatorProps {
  subjects: Subject[]
}

function findWeakestSubject(subjects: Subject[]): { subject: Subject; reason: string } | null {
  if (subjects.length === 0) return null

  const byConfidence = [...subjects].sort((a, b) => a.confidence - b.confidence)
  const lowestConfidence = byConfidence[0]

  const withGrades = subjects.filter(s => s.current_grade !== null)
  const byGrade = [...withGrades].sort((a, b) => (a.current_grade || 0) - (b.current_grade || 0))
  const lowestGrade = byGrade[0]

  if (lowestGrade && lowestConfidence.id === lowestGrade.id) {
    return {
      subject: lowestConfidence,
      reason: `Lowest confidence (${lowestConfidence.confidence}/5) and lowest grade (${lowestGrade.current_grade}/7)`,
    }
  }

  if (lowestConfidence.confidence <= 3) {
    return {
      subject: lowestConfidence,
      reason: `Lowest confidence: ${lowestConfidence.confidence}/5`,
    }
  }

  if (lowestGrade && (lowestGrade.current_grade || 0) <= 5) {
    return {
      subject: lowestGrade,
      reason: `Lowest grade: ${lowestGrade.current_grade}/7`,
    }
  }

  return {
    subject: lowestConfidence,
    reason: `Lowest confidence: ${lowestConfidence.confidence}/5`,
  }
}

export function WeaknessIndicator({ subjects }: WeaknessIndicatorProps) {
  const [scheduling, setScheduling] = useState(false)
  const [schedulingTag, setSchedulingTag] = useState<string | null>(null)
  const [weaknesses, setWeaknesses] = useState<WeaknessTag[]>([])
  const [loadedSubjectId, setLoadedSubjectId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  const result = findWeakestSubject(subjects)
  const weakestSubjectId = result?.subject.id

  // Fetch weakness_tags for the weakest subject
  useEffect(() => {
    if (!weakestSubjectId) return

    const fetchWeaknesses = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('weakness_tags')
        .select('*')
        .eq('subject_id', weakestSubjectId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })

      setWeaknesses(data || [])
      setLoadedSubjectId(weakestSubjectId)
    }

    fetchWeaknesses()
  }, [weakestSubjectId])

  if (!result) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Weakness Focus</h2>
        </div>
        <div className="text-center py-6">
          <GraduationCap className="h-10 w-10 mx-auto text-[var(--muted-fg)] mb-3" />
          <p className="text-sm text-[var(--muted-fg)]">Add subjects to see your weakness indicator.</p>
        </div>
      </div>
    )
  }

  const { subject, reason } = result

  const handleScheduleStudy = (weaknessTag?: string) => {
    if (weaknessTag) {
      setSchedulingTag(weaknessTag)
    } else {
      setScheduling(true)
    }

    const objective = weaknessTag
      ? `Work on weakness: ${weaknessTag}`
      : `Study ${subject.name} weakness focus`
    const query = new URLSearchParams({
      intent: 'schedule-study',
      subject: subject.id,
      objective,
      source: 'weakness-focus',
    })

    router.push(`/dashboard/calendar?${query.toString()}`)
  }

  const subjectColors: Record<string, string> = {
    red: 'border-red-500/40', blue: 'border-blue-500/40', green: 'border-green-500/40',
    amber: 'border-amber-500/40', purple: 'border-purple-500/40', pink: 'border-pink-500/40',
    orange: 'border-orange-500/40', slate: 'border-slate-500/40',
  }

  const borderColor = subjectColors[subject.color] || 'border-[var(--border)]'
  const subjectColorClass = SUBJECT_COLORS.find((entry) => entry.name === subject.color)?.class || 'bg-slate-500'
  const loading = loadedSubjectId !== subject.id

  const unresolvedWeaknesses = weaknesses.filter(w => !w.is_resolved)
  const displayWeaknesses = expanded ? unresolvedWeaknesses : unresolvedWeaknesses.slice(0, 3)

  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Weakness Focus</h2>
      </div>

      <div className={`p-4 rounded-xl border-2 ${borderColor} bg-[var(--muted)]/40 space-y-3`}>
        {/* Subject header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${subjectColorClass}`} />
            <span className="font-semibold text-[var(--card-fg)]">{subject.name}</span>
            <span className="text-xs text-[var(--muted-fg)]">{subject.level}</span>
          </div>
        </div>

        <p className="text-xs text-amber-400">{reason}</p>

        {/* Specific weaknesses */}
        {loading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-3 w-3 animate-spin text-[var(--muted-fg)]" />
            <span className="text-xs text-[var(--muted-fg)]">Loading weaknesses...</span>
          </div>
        ) : unresolvedWeaknesses.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] text-[var(--muted-fg)] uppercase tracking-wider font-medium">
              Specific weaknesses ({unresolvedWeaknesses.length})
            </p>
            {displayWeaknesses.map(w => (
              <div
                key={w.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--card)]/60 border border-[var(--border)] group"
              >
                <div className="mt-0.5">
                  {w.weakness_type === 'content' ? (
                    <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                  ) : (
                    <Brain className="h-3.5 w-3.5 text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[var(--card-fg)]">{w.tag}</span>
                    <Badge className={`text-[9px] px-1.5 py-0 border-0 ${
                      w.weakness_type === 'content'
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-purple-500/15 text-purple-400'
                    }`}>
                      {w.weakness_type === 'content' ? 'Content' : 'Logic'}
                    </Badge>
                  </div>
                  {w.description && (
                    <p className="text-[10px] text-[var(--muted-fg)] mt-0.5 line-clamp-1">{w.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleScheduleStudy(w.tag)}
                  disabled={schedulingTag === w.tag}
                  className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-smooth text-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10"
                >
                  {schedulingTag === w.tag ? 'Opening...' : 'Study this'}
                </Button>
              </div>
            ))}

            {unresolvedWeaknesses.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[10px] text-[var(--muted-fg)] hover:text-[var(--card-fg)] transition-smooth w-full justify-center py-1"
              >
                {expanded ? (
                  <>Show less <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Show {unresolvedWeaknesses.length - 3} more <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            )}
          </div>
        ) : null}

        {/* Schedule study action */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted-fg)]">When are you studying this?</p>
          <Button
            size="sm"
            onClick={() => handleScheduleStudy()}
            disabled={scheduling}
            className="btn-glass rounded-xl text-xs"
          >
            <Calendar className="h-3 w-3 mr-1" />
            {scheduling ? 'Opening...' : 'Schedule Study'}
          </Button>
        </div>
      </div>
    </div>
  )
}
