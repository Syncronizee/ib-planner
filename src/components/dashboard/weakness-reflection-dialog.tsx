'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeaknessTag } from '@/lib/types'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react'

interface WeaknessReflectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weakness: WeaknessTag
  subjectName: string
  /** Called after reflection is submitted or skipped, with whether the weakness was resolved */
  onComplete: (resolved: boolean) => void
}

const RATINGS = [
  { value: 1, emoji: '😟', label: 'Not really' },
  { value: 2, emoji: '🙂', label: 'Somewhat' },
  { value: 3, emoji: '😊', label: 'Yes!' },
  { value: 4, emoji: '🎯', label: 'Mastered it!' },
] as const

export function WeaknessReflectionDialog({
  open,
  onOpenChange,
  weakness,
  subjectName,
  onComplete,
}: WeaknessReflectionDialogProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [markResolved, setMarkResolved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setRating(null)
    setNotes('')
    setMarkResolved(false)
    setError(null)
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  async function handleSubmit() {
    if (!rating) {
      setError('Please rate your improvement.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      if (isElectronRuntime()) {
        const userId = await getDesktopUserId()
        if (!userId) {
          throw new Error('No local user session found.')
        }

        await invokeDesktopDb('updateTableRecords', [
          'weakness_tags',
          userId,
          { id: weakness.id },
          {
            improvement_rating: rating,
            reflection_notes: notes.trim() || null,
            ...(markResolved ? { is_resolved: true } : {}),
          },
        ])
      } else {
        const supabase = createClient()
        await supabase
          .from('weakness_tags')
          .update({
            improvement_rating: rating,
            reflection_notes: notes.trim() || null,
            ...(markResolved ? { is_resolved: true } : {}),
          })
          .eq('id', weakness.id)
      }

      onComplete(markResolved)
      handleClose(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reflection')
    } finally {
      setSaving(false)
    }
  }

  function handleSkip() {
    reset()
    onOpenChange(false)
    onComplete(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[var(--card)] border-[var(--border)]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <DialogTitle className="text-[var(--card-fg)]">Reflection</DialogTitle>
              <p className="text-xs text-[var(--muted-fg)] mt-0.5">
                {subjectName} — {weakness.tag}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-[var(--muted-fg)]">
            Great work studying this topic! Take a moment to reflect. 🎉
          </p>

          {/* Improvement Rating */}
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Did you improve your understanding?</p>
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRating(r.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-smooth ${
                    rating === r.value
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                      : 'bg-[var(--muted)] text-[var(--card-fg)] border-[var(--border)] hover:border-white/20'
                  }`}
                >
                  <span className="text-xl leading-none">{r.emoji}</span>
                  <span className="text-[9px] font-medium leading-tight text-center">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Notes for next time (optional)</p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What do you still need to work on? Key takeaways?"
              rows={2}
              className="bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] resize-none"
            />
          </div>

          {/* Mark Resolved */}
          <button
            type="button"
            onClick={() => setMarkResolved(v => !v)}
            className={`flex items-start gap-3 w-full text-left p-3 rounded-xl border transition-smooth ${
              markResolved
                ? 'border-green-500/40 bg-green-500/10'
                : 'border-[var(--border)] bg-[var(--muted)]/40 hover:border-white/20'
            }`}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 transition-smooth ${
              markResolved ? 'bg-green-500 border-green-500' : 'border-[var(--muted-fg)]'
            }`}>
              {markResolved && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            <div>
              <p className={`text-xs font-medium ${markResolved ? 'text-green-400' : 'text-[var(--card-fg)]'}`}>
                I&apos;ve overcome this weakness - mark as resolved
              </p>
              <p className="text-[10px] text-[var(--muted-fg)] mt-0.5">
                Removes it from Focus Areas and marks it resolved in {subjectName} → Weaknesses
              </p>
            </div>
          </button>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="flex-1 btn-glass text-xs"
              disabled={saving}
            >
              Skip
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !rating}
              className="flex-1 token-btn-accent"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save & Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
