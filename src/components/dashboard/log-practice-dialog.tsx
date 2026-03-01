'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SyllabusTopic } from '@/lib/types'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Loader2, Dumbbell, Clock, Trophy } from 'lucide-react'
import { Input } from '../ui/input'

const PRESET_DURATIONS = [15, 25, 45, 60]

interface LogPracticeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  topic: SyllabusTopic
  onLogged: (updatedTopic: SyllabusTopic) => void
}

/**
 * Mastery logic:
 * - confidence = 5 AND topic was already at 5 → mastered (consolidation session)
 * - confidence = 5 AND topic was below 5 → on_track (one more session to consolidate)
 * - practiced recently (≤3 days) AND confidence ≥ 3 → on_track
 * - otherwise → tracking (needs practice)
 */
function computeNewStatus(
  topic: SyllabusTopic,
  newConfidence: number,
): SyllabusTopic['practice_status'] {
  // Consolidation mastery: was already at 5, practice session confirms it
  if (newConfidence === 5 && topic.confidence === 5) {
    return 'mastered'
  }
  // Just reached 5: one more session needed to consolidate
  if (newConfidence === 5 && topic.confidence < 5) {
    return 'on_track'
  }
  // Good confidence + will be marked as just practiced → on_track
  if (newConfidence >= 3) {
    return 'on_track'
  }
  return 'tracking'
}

export function LogPracticeDialog({
  open,
  onOpenChange,
  topic,
  onLogged,
}: LogPracticeDialogProps) {
  const [duration, setDuration] = useState<number | null>(25)
  const [customDuration, setCustomDuration] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [notes, setNotes] = useState('')
  const [updateConfidence, setUpdateConfidence] = useState(false)
  const [newConfidence, setNewConfidence] = useState(topic.confidence)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setDuration(25)
    setCustomDuration('')
    setUseCustom(false)
    setNotes('')
    setUpdateConfidence(false)
    setNewConfidence(topic.confidence)
    setError(null)
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  const effectiveDuration = useCustom
    ? (parseInt(customDuration) || null)
    : duration

  const finalConfidence = updateConfidence ? newConfidence : topic.confidence
  const newStatus = computeNewStatus(topic, finalConfidence)
  const willMaster = newStatus === 'mastered'
  const willReachFive = finalConfidence === 5 && topic.confidence < 5

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const now = new Date().toISOString()
      const newPracticeCount = topic.practice_count + 1
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      if (weekStart.getDay() === 0) weekStart.setDate(weekStart.getDate() - 6)
      const weekStartStr = weekStart.toISOString().split('T')[0]
      let updatedTopic: SyllabusTopic

      if (isElectronRuntime()) {
        const userId = await getDesktopUserId()
        if (!userId) throw new Error('No local user session found.')

        updatedTopic = await invokeDesktopDb<SyllabusTopic[]>('updateTableRecords', [
          'syllabus_topics',
          userId,
          { id: topic.id },
          {
            practice_count: newPracticeCount,
            last_practiced_at: now,
            confidence: finalConfidence,
            practice_status: newStatus,
            mastered_at: newStatus === 'mastered' ? now : null,
          },
        ]).then((rows) => rows[0] as SyllabusTopic)

        const existingProgress = await invokeDesktopDb<Array<{ id: string }>>('queryTable', [
          'focus_area_progress',
          {
            userId,
            filters: {
              week_start: weekStartStr,
              focus_area_id: `syllabus-${topic.id}`,
            },
            limit: 1,
          },
        ])

        if (existingProgress[0]?.id) {
          await invokeDesktopDb('updateTableRecords', [
            'focus_area_progress',
            userId,
            { id: existingProgress[0].id },
            {
              focus_area_type: 'confidence',
              addressed_at: now,
              deleted_at: null,
            },
          ])
        } else {
          await invokeDesktopDb('createTableRecord', [
            'focus_area_progress',
            userId,
            {
              user_id: userId,
              week_start: weekStartStr,
              focus_area_id: `syllabus-${topic.id}`,
              focus_area_type: 'confidence',
              addressed_at: now,
            },
          ])
        }
      } else {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        await supabase.from('practice_logs').insert({
          user_id: user.id,
          topic_id: null,
          syllabus_topic_id: topic.id,
          subject_id: topic.subject_id,
          duration_minutes: effectiveDuration,
          notes: notes.trim() || null,
          practiced_at: now,
        })

        const { data, error: updateError } = await supabase
          .from('syllabus_topics')
          .update({
            practice_count: newPracticeCount,
            last_practiced_at: now,
            confidence: finalConfidence,
            practice_status: newStatus,
            mastered_at: newStatus === 'mastered' ? now : null,
          })
          .eq('id', topic.id)
          .select()
          .single()

        if (updateError) throw updateError
        updatedTopic = data as SyllabusTopic

        await supabase.from('focus_area_progress').upsert({
          week_start: weekStartStr,
          focus_area_id: `syllabus-${topic.id}`,
          focus_area_type: 'confidence',
          addressed_at: now,
        })
      }
      onLogged(updatedTopic)

      window.dispatchEvent(new CustomEvent('practice-topics-updated'))
      window.dispatchEvent(new CustomEvent('focus-areas-updated'))

      handleClose(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log practice')
    } finally {
      setSaving(false)
    }
  }

  const confidenceColors: Record<number, string> = {
    1: 'text-red-400', 2: 'text-orange-400', 3: 'text-yellow-400',
    4: 'text-lime-400', 5: 'text-green-400',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[var(--card)] border-[var(--border)]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
              <Dumbbell className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <DialogTitle className="text-[var(--card-fg)]">Log Practice</DialogTitle>
              <p className="text-xs text-[var(--muted-fg)] mt-0.5">{topic.topic_name}</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Duration Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Duration</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDuration(d); setUseCustom(false) }}
                  className={`py-2 rounded-lg text-sm font-medium border transition-smooth ${
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
                  className="h-7 w-28 text-xs bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)]"
                />
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What did you work on? Any breakthroughs or stumbling blocks?"
              rows={2}
              className="bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] resize-none"
            />
          </div>

          {/* Update confidence toggle */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setUpdateConfidence(v => !v)}
              className="flex items-center gap-2 text-xs text-[var(--muted-fg)] hover:text-[var(--card-fg)] transition-smooth"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-smooth ${
                updateConfidence ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)]'
              }`}>
                {updateConfidence && <span className="text-[8px] text-white font-bold">✓</span>}
              </div>
              Update confidence after this session?
            </button>
            {updateConfidence && (
              <div className="pl-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--muted-fg)]">Confidence</span>
                  <span className={`text-sm font-semibold ${confidenceColors[newConfidence]}`}>{newConfidence}/5</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[newConfidence]}
                  onValueChange={([v]) => setNewConfidence(v)}
                  className="py-1"
                />
                {willMaster && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-xs text-emerald-400">
                      You&apos;ll master this topic! (Confidence 5 → consolidation session)
                    </p>
                  </div>
                )}
                {willReachFive && (
                  <p className="text-[10px] text-green-400">
                    Almost mastered! One more session at confidence 5 to confirm mastery.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Session Preview */}
          <div className="p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] space-y-1.5">
            <p className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Session preview</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--card-fg)]">Practice sessions</span>
              <span className="text-[var(--muted-fg)]">
                {topic.practice_count} → <span className="text-green-400 font-medium">{topic.practice_count + 1}</span>
              </span>
            </div>
            {updateConfidence && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--card-fg)]">Confidence</span>
                <span className="text-[var(--muted-fg)]">
                  {topic.confidence} → <span className={`font-medium ${confidenceColors[newConfidence]}`}>{newConfidence}</span>/5
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--card-fg)]">Status</span>
              <span className={`font-medium capitalize ${
                newStatus === 'mastered' ? 'text-emerald-400'
                  : newStatus === 'on_track' ? 'text-green-400'
                  : 'text-amber-400'
              }`}>
                {newStatus === 'tracking' ? 'Needs Practice' : newStatus === 'on_track' ? 'On Track' : 'Mastered!'}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              className="flex-1 btn-glass"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 token-btn-accent"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Log Practice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
