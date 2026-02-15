'use client'

import { useState } from 'react'
import { Subject } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { SubjectCard } from '@/components/subjects/subject-card'
import { SubjectDialog } from '@/components/subjects/subject-dialog'
import { SubjectDetailModal } from '@/components/subjects/subject-detail-modal'
import { Button } from '@/components/ui/button'
import { Plus, GraduationCap } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SubjectsSectionProps {
  initialSubjects: Subject[]
}

export function SubjectsSection({ initialSubjects }: SubjectsSectionProps) {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const router = useRouter()

  const handleSave = async (data: { name: string; level: 'HL' | 'SL'; confidence: number; color: string }) => {
    const supabase = createClient()

    if (editingSubject) {
      const { error } = await supabase
        .from('subjects')
        .update(data)
        .eq('id', editingSubject.id)

      if (!error) {
        setSubjects(subjects.map(s => 
          s.id === editingSubject.id ? { ...s, ...data } : s
        ))
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: newSubject, error } = await supabase
        .from('subjects')
        .insert({ ...data, user_id: user?.id })
        .select()
        .single()

      if (!error && newSubject) {
        setSubjects([...subjects, newSubject])
      }
    }
    
    setEditingSubject(null)
    router.refresh()
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setDialogOpen(true)
  }

  const handleDelete = async (subject: Subject) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subject.id)

    if (!error) {
      setSubjects(subjects.filter(s => s.id !== subject.id))
    }
  }

  const handleAdd = () => {
    setEditingSubject(null)
    setDialogOpen(true)
  }

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject)
    setDetailModalOpen(true)
  }

  const handleSubjectUpdate = (updatedSubject: Subject) => {
    setSubjects(subjects.map(s => s.id === updatedSubject.id ? updatedSubject : s))
    setSelectedSubject(updatedSubject)
  }

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <GraduationCap className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--card-fg)] uppercase tracking-wide">Subjects</h2>
        </div>
        <Button 
          onClick={handleAdd} 
          disabled={subjects.length >= 6} 
          size="sm" 
          className="btn-glass rounded-xl"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--muted)]/40">
          <GraduationCap className="h-12 w-12 mx-auto text-[var(--muted-fg)] mb-4" />
          <p className="text-[var(--muted-fg)] mb-4">No subjects yet</p>
          <Button onClick={handleAdd} className="btn-glass rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Subject
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {subjects.map(subject => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClick={handleSubjectClick}
            />
          ))}
        </div>
      )}

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={editingSubject}
        onSave={handleSave}
      />

      {selectedSubject && (
        <SubjectDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          subject={selectedSubject}
          onSubjectUpdate={handleSubjectUpdate}
        />
      )}
    </div>
  )
}
