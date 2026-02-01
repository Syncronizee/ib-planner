'use client'

import { useState } from 'react'
import { CASExperience, CASReflection, CASExperienceOutcome, SUBJECT_COLORS } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { ExperienceDialog } from '@/components/cas/experience-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

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
      // Update experience
      const { error } = await supabase
        .from('cas_experiences')
        .update(experienceData)
        .eq('id', editingExperience.id)

      if (!error) {
        // Delete existing outcomes and re-add
        await supabase
          .from('cas_experience_outcomes')
          .delete()
          .eq('experience_id', editingExperience.id)

        if (selectedOutcomes.length > 0) {
          await supabase
            .from('cas_experience_outcomes')
            .insert(selectedOutcomes.map(num => ({
              user_id: user?.id,
              experience_id: editingExperience.id,
              outcome_number: num,
            })))
        }

        setExperiences(experiences.map(e => 
          e.id === editingExperience.id ? { ...e, ...experienceData } : e
        ))
      }
    } else {
      // Create new experience
      const { data: newExperience, error } = await supabase
        .from('cas_experiences')
        .insert({ ...experienceData, user_id: user?.id })
        .select()
        .single()

      if (!error && newExperience) {
        // Add outcomes
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
    }
  }

  const handleAdd = () => {
    setEditingExperience(null)
    setDialogOpen(true)
  }

  const getStrandBadges = (exp: CASExperience) => {
    const badges = []
    if (exp.is_creativity) badges.push({ label: 'C', color: 'bg-purple-500' })
    if (exp.is_activity) badges.push({ label: 'A', color: 'bg-red-500' })
    if (exp.is_service) badges.push({ label: 'S', color: 'bg-green-500' })
    return badges
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
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No CAS experiences yet. Start logging your activities!</p>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Experience
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {experiences.map(experience => {
            const expReflections = reflections.filter(r => r.experience_id === experience.id)
            const expOutcomes = outcomes.filter(o => o.experience_id === experience.id)
            const strandBadges = getStrandBadges(experience)

            return (
              <Card key={experience.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{experience.title}</CardTitle>
                        {experience.is_cas_project && (
                          <Badge variant="outline" className="text-xs">CAS Project</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{format(new Date(experience.date), 'MMM d, yyyy')}</span>
                        <span>•</span>
                        <span>{experience.hours}h</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {strandBadges.map(badge => (
                        <span 
                          key={badge.label}
                          className={`w-6 h-6 rounded-full ${badge.color} text-white text-xs flex items-center justify-center font-medium`}
                        >
                          {badge.label}
                        </span>
                      ))}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(experience)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(experience)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {experience.description && (
                    <p className="text-sm text-muted-foreground mb-3">{experience.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      {expReflections.length} reflection{expReflections.length !== 1 ? 's' : ''}
                    </span>
                    {expOutcomes.length > 0 && (
                      <span className="text-muted-foreground">
                        Outcomes: {expOutcomes.map(o => o.outcome_number).sort().join(', ')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
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