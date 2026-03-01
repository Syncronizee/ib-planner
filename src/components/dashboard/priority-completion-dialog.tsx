'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type PriorityCompletionDialogProps = {
  open: boolean
  priorityTitle: string
  submitting?: boolean
  onSkip: () => void
  onComplete: (reflection: { rating: number | null; notes: string }) => Promise<void> | void
}

const RATING_OPTIONS = [
  { value: 1, label: 'Struggled' },
  { value: 2, label: 'Okay' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Crushed it' },
]

export function PriorityCompletionDialog({
  open,
  priorityTitle,
  submitting = false,
  onSkip,
  onComplete,
}: PriorityCompletionDialogProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) {
      setRating(null)
      setNotes('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !submitting) onSkip() }}>
      <DialogContent className="sm:max-w-md bg-[var(--card)] border-[var(--border)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--card-fg)]">Priority Complete</DialogTitle>
          <p className="text-xs text-[var(--muted-fg)] leading-relaxed">&quot;{priorityTitle}&quot;</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-fg)]">How did it go?</p>
            <div className="grid grid-cols-2 gap-2">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRating(option.value)}
                  className={`rounded-xl border px-3 py-3 text-sm transition-smooth ${
                    rating === option.value
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
                      : 'border-[var(--border)] bg-[var(--muted)]/45 text-[var(--card-fg)] hover:bg-[var(--muted)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[var(--muted-fg)]">
              Quick notes (optional)
            </label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What worked? What should you do next?"
              className="resize-none bg-[var(--card)] border-[var(--border)] text-[var(--card-fg)] placeholder:text-[var(--muted-fg)]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onSkip}
              className="flex-1 bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] hover:bg-[var(--card)] rounded-xl"
            >
              Skip
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => onComplete({ rating, notes: notes.trim() })}
              className="flex-1 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110"
            >
              Mark Complete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
