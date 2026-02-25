'use client'

import { useEffect, useState } from 'react'
import { CASExperience, CASReflection, CASExperienceOutcome } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { ExperienceDialog } from '@/components/cas/experience-dialog'
import { ExperienceCard } from '@/components/cas/experience-card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CASExperiencesListProps {
  initialExperiences: CASExperience[]
  initialReflections: CASReflection[]
  initialOutcomes: CASExperienceOutcome[]
}

export function CASExperiencesList({ 
  initialExperiences, 
  initialReflections,
  initialOutcomes 
}: CASExperiencesListProps) {
  const [experiences, setExperiences] = useState<CASExperience[]>(initialExperiences)
  const [reflections, setReflections] = useState<CASReflection[]>(initialReflections)
  const [outcomes, setOutcomes] = useState<CASExperienceOutcome[]>(initialOutcomes)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExperience, setEditingExperience] = useState<CASExperience | null>(null)
  const router = useRouter()

  useEffect(() => {
    setExperiences(initialExperiences)
  }, [initialExperiences])

  useEffect(() => {
    setReflections(initialReflections)
  }, [initialReflections])

  useEffect(() => {
    setOutcomes(initialOutcomes)
  }, [initialOutcomes])

  const handleSave = async (data: {
    title: string
    description: string
    date: string
    hours: number
    is_creativity: boolean
    is_activity: boolean
    is_service: boolean
    is_cas_project: boolean
    outcomes: number[]
  }) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { outcomes: selectedOutcomes, ...experienceData } = data

    if (editingExperience) {
      const { error } = await supabase
        .from('cas_experiences')
        .update(experienceData)
        .eq('id', editingExperience.id)

      if (!error) {
        await supabase
          .from('cas_experience_outcomes')
          .delete()
          .eq('experience_id', editingExperience.id)

        if (selectedOutcomes.length > 0) {
          const { data: newOutcomes } = await supabase
            .from('cas_experience_outcomes')
            .insert(selectedOutcomes.map(num => ({
              user_id: user?.id,
              experience_id: editingExperience.id,
              outcome_number: num,
            })))
            .select()

          if (newOutcomes) {
            setOutcomes([
              ...outcomes.filter(o => o.experience_id !== editingExperience.id),
              ...newOutcomes
            ])
          }
        } else {
          setOutcomes(outcomes.filter(o => o.experience_id !== editingExperience.id))
        }

        setExperiences(experiences.map(e => 
          e.id === editingExperience.id ? { ...e, ...experienceData } : e
        ))
      }
    } else {
      const { data: newExperience, error } = await supabase
        .from('cas_experiences')
        .insert({ ...experienceData, user_id: user?.id })
        .select()
        .single()

      if (!error && newExperience) {
        if (selectedOutcomes.length > 0) {
          const { data: newOutcomes } = await supabase
            .from('cas_experience_outcomes')
            .insert(selectedOutcomes.map(num => ({
              user_id: user?.id,
              experience_id: newExperience.id,
              outcome_number: num,
            })))
            .select()

          if (newOutcomes) {
            setOutcomes([...outcomes, ...newOutcomes])
          }
        }

        setExperiences([newExperience, ...experiences])
      }
    }

    setEditingExperience(null)
    router.refresh()
  }

  const handleEdit = (experience: CASExperience) => {
    setEditingExperience(experience)
    setDialogOpen(true)
  }

  const handleDelete = async (experience: CASExperience) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('cas_experiences')
      .delete()
      .eq('id', experience.id)

    if (!error) {
      setExperiences(experiences.filter(e => e.id !== experience.id))
      setReflections(reflections.filter(r => r.experience_id !== experience.id))
      setOutcomes(outcomes.filter(o => o.experience_id !== experience.id))
      router.refresh()
    }
  }

  const handleAdd = () => {
    setEditingExperience(null)
    setDialogOpen(true)
  }

  const handleReflectionsChange = (experienceId: string, newReflections: CASReflection[]) => {
    setReflections([
      ...reflections.filter(r => r.experience_id !== experienceId),
      ...newReflections
    ])
  }

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Experiences</h2>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Experience
        </Button>
      </div>

      {experiences.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-lg">
          <p className="text-[var(--muted-fg)] mb-4">No CAS experiences yet. Start logging your activities!</p>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Experience
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {experiences.map(experience => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              reflections={reflections.filter(r => r.experience_id === experience.id)}
              outcomes={outcomes.filter(o => o.experience_id === experience.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReflectionsChange={(newReflections) => 
                handleReflectionsChange(experience.id, newReflections)
              }
            />
          ))}
        </div>
      )}

      <ExperienceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        experience={editingExperience}
        existingOutcomes={editingExperience 
          ? outcomes.filter(o => o.experience_id === editingExperience.id).map(o => o.outcome_number)
          : []
        }
        onSave={handleSave}
      />
    </section>
  )
}
