'use client'

import { useState } from 'react'
import { Subject } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { SubjectCard } from '@/components/subjects/subject-card'
import { SubjectDialog } from '@/components/subjects/subject-dialog'
import { SubjectDetailModal } from '@/components/subjects/subject-detail-modal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
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
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">My Subjects</h2>
        <Button onClick={handleAdd} disabled={subjects.length >= 6}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </Button>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No subjects yet. Add your IB subjects to get started.</p>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Subject
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
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
    </section>
  )
}