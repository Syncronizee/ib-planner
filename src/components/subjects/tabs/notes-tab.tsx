'use client'

import { useState } from 'react'
import { Subject } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

interface NotesTabProps {
  subject: Subject
  onSubjectUpdate: (subject: Subject) => void
}

export function NotesTab({ subject, onSubjectUpdate }: NotesTabProps) {
  const [notes, setNotes] = useState(subject.notes || '')
  const [teacherName, setTeacherName] = useState(subject.teacher_name || '')
  const [teacherEmail, setTeacherEmail] = useState(subject.teacher_email || '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    const updateData = {
      notes: notes || null,
      teacher_name: teacherName || null,
      teacher_email: teacherEmail || null,
    }

    const { error } = await supabase
      .from('subjects')
      .update(updateData)
      .eq('id', subject.id)

    if (!error) {
      onSubjectUpdate({ ...subject, ...updateData })
    }

    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Teacher Info */}
      <div className="space-y-4">
        <h3 className="font-semibold">Teacher Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Teacher Name</Label>
            <Input
              placeholder="e.g. Mr. Smith"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Teacher Email</Label>
            <Input
              type="email"
              placeholder="e.g. smith@school.edu"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="font-semibold">Notes</h3>
        <Textarea
          placeholder="Add notes about this subject..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
        />
        <p className="text-xs text-muted-foreground">
          💡 Future feature: Rich text editor with diagrams and drawing tools
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  )
}