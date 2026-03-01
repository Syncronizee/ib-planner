'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject, SyllabusTopic, SUBJECT_COLORS } from '@/lib/types'
import { getDesktopUserId, invokeDesktopDb, isElectronRuntime } from '@/lib/electron/offline'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Dumbbell, Bell, BellOff, ChevronLeft } from 'lucide-react'

interface AddPracticeTopicDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  allSyllabusTopics: SyllabusTopic[]
  onTopicAdded: (topic: SyllabusTopic) => void
}

type Step = 1 | 2 | 3

const DIFFICULTY_OPTIONS = [
  { value: 1, emoji: '😊', label: 'Easy' },
  { value: 2, emoji: '🙂', label: 'Mod' },
  { value: 3, emoji: '😐', label: 'Medium' },
  { value: 4, emoji: '😓', label: 'Hard' },
  { value: 5, emoji: '😰', label: 'V.Hard' },
]

const DIFFICULTY_REMINDER_DAYS: Record<number, number> = { 1: 30, 2: 21, 3: 14, 4: 10, 5: 7 }

export function AddPracticeTopicDialog({
  open,
  onOpenChange,
  subjects,
  allSyllabusTopics,
  onTopicAdded,
}: AddPracticeTopicDialogProps) {
  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

  // Step 2
  const [selectedUnitNumber, setSelectedUnitNumber] = useState<number | null>(null)
  const [isCreatingUnit, setIsCreatingUnit] = useState(false)
  const [newUnitNumber, setNewUnitNumber] = useState('')

  // Step 3
  const [topicTitle, setTopicTitle] = useState('')
  const [topicDescription, setTopicDescription] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [reminderEnabled, setReminderEnabled] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derive unique units for selected subject
  const existingUnits = useMemo(() => {
    if (!selectedSubject) return []
    const unitNums = new Set<number>()
    for (const t of allSyllabusTopics) {
      if (t.subject_id === selectedSubject.id && t.unit_number !== null) {
        unitNums.add(t.unit_number)
      }
    }
    return Array.from(unitNums).sort((a, b) => a - b)
  }, [selectedSubject, allSyllabusTopics])

  // Auto-select first unit when subject changes
  useEffect(() => {
    setSelectedUnitNumber(null)
    setIsCreatingUnit(false)
    setNewUnitNumber('')
  }, [selectedSubject])

  function reset() {
    setStep(1)
    setSelectedSubject(null)
    setSelectedUnitNumber(null)
    setIsCreatingUnit(false)
    setNewUnitNumber('')
    setTopicTitle('')
    setTopicDescription('')
    setDifficulty(3)
    setReminderEnabled(true)
    setError(null)
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  function goToStep2() {
    if (!selectedSubject) return
    setError(null)
    setStep(2)
  }

  function goToStep3() {
    if (!isCreatingUnit && selectedUnitNumber === null) {
      setError('Please select a unit or create a new one.')
      return
    }
    if (isCreatingUnit && !newUnitNumber.trim()) {
      setError('Please enter a unit number.')
      return
    }
    setError(null)
    setStep(3)
  }

  async function handleSubmit() {
    if (!selectedSubject || !topicTitle.trim()) {
      setError('Topic title is required.')
      return
    }

    const unitNumber = isCreatingUnit
      ? parseInt(newUnitNumber)
      : selectedUnitNumber

    if (isCreatingUnit && isNaN(unitNumber!)) {
      setError('Please enter a valid unit number.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const topicPayload = {
        subject_id: selectedSubject.id,
        topic_name: topicTitle.trim(),
        notes: topicDescription.trim() || null,
        unit_number: unitNumber ?? null,
        is_completed: false,
        confidence: 3,
        practice_status: 'tracking',
        practice_count: 0,
        last_practiced_at: null,
        mastered_at: null,
        difficulty,
        reminder_enabled: reminderEnabled,
      }

      let createdTopic: SyllabusTopic

      if (isElectronRuntime()) {
        const userId = await getDesktopUserId()
        if (!userId) throw new Error('No local user session found.')

        createdTopic = await invokeDesktopDb<SyllabusTopic>('createTableRecord', [
          'syllabus_topics',
          userId,
          {
            user_id: userId,
            ...topicPayload,
          },
        ])
      } else {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error: dbError } = await supabase
          .from('syllabus_topics')
          .insert({
            user_id: user.id,
            ...topicPayload,
          })
          .select()
          .single()

        if (dbError) throw dbError
        createdTopic = data as SyllabusTopic
      }

      onTopicAdded(createdTopic)
      window.dispatchEvent(new CustomEvent('practice-topics-updated'))
      handleClose(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topic')
    } finally {
      setSaving(false)
    }
  }

  const unitLabel = isCreatingUnit
    ? (newUnitNumber ? `Unit ${newUnitNumber}` : 'New unit')
    : (selectedUnitNumber !== null ? `Unit ${selectedUnitNumber}` : 'No unit')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[var(--card)] border-[var(--border)]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
              <Dumbbell className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <DialogTitle className="text-[var(--card-fg)]">Add Topic to Practice</DialogTitle>
              <p className="text-[10px] text-[var(--muted-fg)] mt-0.5 uppercase tracking-wider">
                Step {step} of 3
              </p>
            </div>
          </div>
          {/* Step progress indicator */}
          <div className="flex gap-1 mt-3">
            {([1, 2, 3] as Step[]).map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        {/* ── Step 1: Select Subject ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 mt-2">
            <p className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Select Subject</p>
            <div className="grid grid-cols-2 gap-2">
              {subjects.map(subject => {
                const colorClass = SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-slate-500'
                const isSelected = selectedSubject?.id === subject.id
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubject(subject)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-smooth ${
                      isSelected
                        ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--card-fg)]'
                        : 'bg-[var(--muted)]/40 border-[var(--border)] hover:border-white/20'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClass}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--card-fg)] truncate">{subject.name}</p>
                      <p className="text-[10px] text-[var(--muted-fg)]">{subject.level}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => handleClose(false)} className="flex-1 btn-glass">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={goToStep2}
                disabled={!selectedSubject}
                className="flex-1 token-btn-accent"
              >
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Select or Create Unit ─────────────────────────────────── */}
        {step === 2 && selectedSubject && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-fg)]">Subject:</span>
              <span className="text-xs font-medium text-[var(--card-fg)]">{selectedSubject.name}</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[10px] text-[var(--accent)] ml-auto"
              >
                Change
              </button>
            </div>

            {existingUnits.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Select Existing Unit</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {existingUnits.map(unitNum => {
                    const isSelected = !isCreatingUnit && selectedUnitNumber === unitNum
                    return (
                      <button
                        key={unitNum}
                        type="button"
                        onClick={() => { setSelectedUnitNumber(unitNum); setIsCreatingUnit(false) }}
                        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-left text-xs transition-smooth ${
                          isSelected
                            ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--card-fg)]'
                            : 'bg-[var(--muted)]/40 border-[var(--border)] hover:border-white/20 text-[var(--card-fg)]'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--muted-fg)]'}`} />
                        Unit {unitNum}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[var(--border)]" />
              <div className="relative flex justify-center">
                <span className="px-2 text-[10px] text-[var(--muted-fg)] bg-[var(--card)]">
                  {existingUnits.length > 0 ? 'OR' : 'Create a unit'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setIsCreatingUnit(true); setSelectedUnitNumber(null) }}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-left text-xs transition-smooth ${
                  isCreatingUnit
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]'
                    : 'bg-[var(--muted)]/40 border-[var(--border)] hover:border-white/20'
                }`}
              >
                <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${isCreatingUnit ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--muted-fg)]'}`} />
                <span className="text-[var(--card-fg)]">Create new unit</span>
              </button>

              {isCreatingUnit && (
                <div className="pl-5">
                  <Label className="text-[10px] text-[var(--muted-fg)] uppercase tracking-wider">Unit Number</Label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={newUnitNumber}
                    onChange={e => setNewUnitNumber(e.target.value)}
                    placeholder="e.g. 6"
                    className="mt-1 h-8 text-xs bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] w-28"
                  />
                </div>
              )}
            </div>

            {/* No unit option */}
            <button
              type="button"
              onClick={() => { setSelectedUnitNumber(null); setIsCreatingUnit(false) }}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-left text-xs transition-smooth ${
                !isCreatingUnit && selectedUnitNumber === null
                  ? 'bg-[var(--accent)]/10 border-[var(--accent)]'
                  : 'bg-[var(--muted)]/40 border-[var(--border)] hover:border-white/20'
              }`}
            >
              <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${!isCreatingUnit && selectedUnitNumber === null ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--muted-fg)]'}`} />
              <span className="text-[var(--card-fg)]">No unit (general topic)</span>
            </button>

            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1 btn-glass">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
              <Button type="button" onClick={goToStep3} className="flex-1 token-btn-accent">
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Create Topic ───────────────────────────────────────────── */}
        {step === 3 && selectedSubject && (
          <div className="space-y-4 mt-2">
            {/* Context summary */}
            <div className="flex items-center gap-2 text-xs text-[var(--muted-fg)]">
              <span className="font-medium text-[var(--card-fg)]">{selectedSubject.name}</span>
              <span>→</span>
              <span>{unitLabel}</span>
            </div>

            {/* Topic Title */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Topic Title *</Label>
              <Input
                value={topicTitle}
                onChange={e => setTopicTitle(e.target.value)}
                placeholder="e.g. EM Induction, Integration by Parts"
                className="bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)]"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">Description (optional)</Label>
              <Textarea
                value={topicDescription}
                onChange={e => setTopicDescription(e.target.value)}
                placeholder="What specifically needs practice?"
                rows={2}
                className="bg-[var(--muted)] border-[var(--border)] text-[var(--card-fg)] resize-none"
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <Label className="text-xs text-[var(--muted-fg)] uppercase tracking-wider">How difficult is this for you?</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {DIFFICULTY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDifficulty(opt.value)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-smooth ${
                      difficulty === opt.value
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                        : 'bg-[var(--muted)] text-[var(--card-fg)] border-[var(--border)] hover:border-white/20'
                    }`}
                  >
                    <span className="text-base leading-none">{opt.emoji}</span>
                    <span className="text-[9px] font-medium leading-none">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reminder Toggle */}
            <button
              type="button"
              onClick={() => setReminderEnabled(v => !v)}
              className="flex items-center gap-3 w-full text-left p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 hover:border-white/20 transition-smooth"
            >
              <div className={`p-1.5 rounded-lg transition-smooth ${reminderEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'}`}>
                {reminderEnabled
                  ? <Bell className="h-3.5 w-3.5 text-[var(--accent-fg)]" />
                  : <BellOff className="h-3.5 w-3.5 text-[var(--muted-fg)]" />
                }
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-[var(--card-fg)]">
                  {reminderEnabled ? 'Remind me to revisit after mastery' : 'No reminders after mastery'}
                </p>
                <p className="text-[10px] text-[var(--muted-fg)]">
                  Every {DIFFICULTY_REMINDER_DAYS[difficulty]}d after mastering (based on difficulty)
                </p>
              </div>
            </button>

            {/* Will be added to */}
            <div className="p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
              <p className="text-[10px] text-[var(--muted-fg)] uppercase tracking-wider mb-1.5">This topic will be added to</p>
              <div className="space-y-1">
                <p className="text-xs text-[var(--card-fg)]">• Syllabus ({selectedSubject.name} → {unitLabel})</p>
                <p className="text-xs text-[var(--card-fg)]">• Practice Tracker (tracking enabled)</p>
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setStep(2)} className="flex-1 btn-glass" disabled={saving}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !topicTitle.trim()}
                className="flex-1 token-btn-accent"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Add to Practice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
