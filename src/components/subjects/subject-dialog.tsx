'use client'

import { useState, useEffect } from 'react'
import { Subject, SUBJECT_COLORS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

interface SubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject?: Subject | null
  onSave: (data: { name: string; level: 'HL' | 'SL'; confidence: number; color: string }) => void
}

export function SubjectDialog({ open, onOpenChange, subject, onSave }: SubjectDialogProps) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState<'HL' | 'SL'>('HL')
  const [confidence, setConfidence] = useState(3)
  const [color, setColor] = useState('slate')

  useEffect(() => {
    if (subject) {
      setName(subject.name)
      setLevel(subject.level)
      setConfidence(subject.confidence)
      setColor(subject.color)
    } else {
      setName('')
      setLevel('HL')
      setConfidence(3)
      setColor('slate')
    }
  }, [subject, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, level, confidence, color })
    onOpenChange(false)
  }

  const confidenceLabels = ['', 'Struggling', 'Needs Work', 'Okay', 'Good', 'Confident']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 border-[var(--border)] bg-[var(--card)]">
        <DialogHeader>
          <DialogTitle>{subject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          <DialogDescription className="sr-only">
            {subject ? 'Update a subject.' : 'Create a new subject.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Subject Name</Label>
            <Input
              id="name"
              placeholder="e.g. Physics, English A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-2 border-[var(--border)] bg-[var(--card)] text-[var(--card-fg)]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as 'HL' | 'SL')}>
              <SelectTrigger className="border-2 border-[var(--border)] bg-[var(--card)] text-[var(--card-fg)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HL">Higher Level (HL)</SelectItem>
                <SelectItem value="SL">Standard Level (SL)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Confidence: {confidenceLabels[confidence]}</Label>
            <Slider
              value={[confidence]}
              onValueChange={(v) => setConfidence(v[0])}
              min={1}
              max={5}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`w-8 h-8 rounded-full ${c.class} ${
                    color === c.name ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">
            {subject ? 'Save Changes' : 'Add Subject'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
