'use client'

import { useState } from 'react'
import { CASExperience, CASReflection, CASExperienceOutcome } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { ReflectionDialog } from './reflection-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Pencil, 
  Trash2, 
  MessageSquare, 
  Plus, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface ExperienceCardProps {
  experience: CASExperience
  reflections: CASReflection[]
  outcomes: CASExperienceOutcome[]
  onEdit: (experience: CASExperience) => void
  onDelete: (experience: CASExperience) => void
  onReflectionsChange: (reflections: CASReflection[]) => void
}

export function ExperienceCard({ 
  experience, 
  reflections, 
  outcomes,
  onEdit, 
  onDelete,
  onReflectionsChange
}: ExperienceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [reflectionDialogOpen, setReflectionDialogOpen] = useState(false)
  const [editingReflection, setEditingReflection] = useState<CASReflection | null>(null)
  const router = useRouter()

  const getStrandBadges = () => {
    const badges = []
    if (experience.is_creativity) badges.push({ label: 'C', color: 'bg-purple-500' })
    if (experience.is_activity) badges.push({ label: 'A', color: 'bg-red-500' })
    if (experience.is_service) badges.push({ label: 'S', color: 'bg-green-500' })
    return badges
  }

  const handleSaveReflection = async (data: { content: string; date: string }) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (editingReflection) {
      const { error } = await supabase
        .from('cas_reflections')
        .update(data)
        .eq('id', editingReflection.id)

      if (!error) {
        onReflectionsChange(
          reflections.map(r => r.id === editingReflection.id ? { ...r, ...data } : r)
        )
      }
    } else {
      const { data: newReflection, error } = await supabase
        .from('cas_reflections')
        .insert({
          ...data,
          user_id: user?.id,
          experience_id: experience.id,
        })
        .select()
        .single()

      if (!error && newReflection) {
        onReflectionsChange([...reflections, newReflection])
      }
    }

    setEditingReflection(null)
    router.refresh()
  }

  const handleDeleteReflection = async (reflection: CASReflection) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('cas_reflections')
      .delete()
      .eq('id', reflection.id)

    if (!error) {
      onReflectionsChange(reflections.filter(r => r.id !== reflection.id))
    }
  }

  const handleAddReflection = () => {
    setEditingReflection(null)
    setReflectionDialogOpen(true)
  }

  const handleEditReflection = (reflection: CASReflection) => {
    setEditingReflection(reflection)
    setReflectionDialogOpen(true)
  }

  const strandBadges = getStrandBadges()

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
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
            <Button variant="ghost" size="icon" onClick={() => onEdit(experience)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(experience)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {experience.description && (
          <p className="text-sm text-muted-foreground">{experience.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <MessageSquare className="h-4 w-4" />
            {reflections.length} reflection{reflections.length !== 1 ? 's' : ''}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {outcomes.length > 0 && (
            <span className="text-muted-foreground">
              Outcomes: {outcomes.map(o => o.outcome_number).sort().join(', ')}
            </span>
          )}
        </div>

        {expanded && (
          <div className="pt-2 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Reflections</h4>
              <Button variant="outline" size="sm" onClick={handleAddReflection}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {reflections.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
                No reflections yet. Add one to document your learning.
              </p>
            ) : (
              <div className="space-y-3">
                {reflections
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(reflection => (
                    <div 
                      key={reflection.id}
                      className="p-3 bg-muted/50 rounded-lg space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reflection.date), 'MMM d, yyyy')}
                        </span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => handleEditReflection(reflection)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => handleDeleteReflection(reflection)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reflection.content}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <ReflectionDialog
        open={reflectionDialogOpen}
        onOpenChange={setReflectionDialogOpen}
        reflection={editingReflection}
        experienceTitle={experience.title}
        onSave={handleSaveReflection}
      />
    </Card>
  )
}