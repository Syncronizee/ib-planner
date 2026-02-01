'use client'

import { useState, useEffect } from 'react'
import { CASExperience, CAS_LEARNING_OUTCOMES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

interface ExperienceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  experience?: CASExperience | null
  existingOutcomes?: number[]
  onSave: (data: {
    title: string
    description: string
    date: string
    hours: number
    is_creativity: boolean
    is_activity: boolean
    is_service: boolean
    is_cas_project: boolean
    outcomes: number[]
  }) => void
}

export function ExperienceDialog({ 
  open, 
  onOpenChange, 
  experience, 
  existingOutcomes = [],
  onSave 
}: ExperienceDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState<Date>(new Date())
  const [hours, setHours] = useState(1)
  const [isCreativity, setIsCreativity] = useState(false)
  const [isActivity, setIsActivity] = useState(false)
  const [isService, setIsService] = useState(false)
  const [isCasProject, setIsCasProject] = useState(false)
  const [selectedOutcomes, setSelectedOutcomes] = useState<number[]>([])

  useEffect(() => {
    if (experience) {
      setTitle(experience.title)
      setDescription(experience.description || '')
      setDate(new Date(experience.date))
      setHours(Number(experience.hours))
      setIsCreativity(experience.is_creativity)
      setIsActivity(experience.is_activity)
      setIsService(experience.is_service)
      setIsCasProject(experience.is_cas_project)
      setSelectedOutcomes(existingOutcomes)
    } else {
      setTitle('')
      setDescription('')
      setDate(new Date())
      setHours(1)
      setIsCreativity(false)
      setIsActivity(false)
      setIsService(false)
      setIsCasProject(false)
      setSelectedOutcomes([])
    }
  }, [experience, existingOutcomes, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      title,
      description,
      date: format(date, 'yyyy-MM-dd'),
      hours,
      is_creativity: isCreativity,
      is_activity: isActivity,
      is_service: isService,
      is_cas_project: isCasProject,
      outcomes: selectedOutcomes,
    })
    onOpenChange(false)
  }

  const toggleOutcome = (num: number) => {
    setSelectedOutcomes(prev => 
      prev.includes(num) 
        ? prev.filter(n => n !== num)
        : [...prev, num]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{experience ? 'Edit Experience' : 'Add Experience'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Volunteer at food bank"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What did you do? What did you learn?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Strands (select all that apply)</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={isCreativity} 
                  onCheckedChange={(c) => setIsCreativity(!!c)} 
                />
                <span className="text-sm">Creativity</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={isActivity} 
                  onCheckedChange={(c) => setIsActivity(!!c)} 
                />
                <span className="text-sm">Activity</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={isService} 
                  onCheckedChange={(c) => setIsService(!!c)} 
                />
                <span className="text-sm">Service</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="cas-project">Part of CAS Project</Label>
            <Switch
              id="cas-project"
              checked={isCasProject}
              onCheckedChange={setIsCasProject}
            />
          </div>

          <div className="space-y-2">
            <Label>Learning Outcomes Demonstrated</Label>
            <div className="grid gap-2">
              {CAS_LEARNING_OUTCOMES.map((outcome) => (
                <label 
                  key={outcome.number}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedOutcomes.includes(outcome.number)}
                    onCheckedChange={() => toggleOutcome(outcome.number)}
                  />
                  <span className="text-sm">
                    <strong>{outcome.number}.</strong> {outcome.short}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">
            {experience ? 'Save Changes' : 'Add Experience'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}