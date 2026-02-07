'use client'

import { useState, useEffect } from 'react'
import { CASReflection } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface ReflectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reflection?: CASReflection | null
  experienceTitle: string
  onSave: (data: { content: string; date: string }) => void
}

export function ReflectionDialog({ 
  open, 
  onOpenChange, 
  reflection, 
  experienceTitle,
  onSave 
}: ReflectionDialogProps) {
  const [content, setContent] = useState('')
  const [date, setDate] = useState<Date>(new Date())

  useEffect(() => {
    if (reflection) {
      setContent(reflection.content)
      setDate(new Date(reflection.date))
    } else {
      setContent('')
      setDate(new Date())
    }
  }, [reflection, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      content,
      date: format(date, 'yyyy-MM-dd'),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{reflection ? 'Edit Reflection' : 'Add Reflection'}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            For: {experienceTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="content">Reflection</Label>
            <Textarea
              id="content"
              placeholder="What did you learn? How did you feel? What challenges did you face? How did you grow?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              Tip: Connect your reflection to the CAS learning outcomes where possible.
            </p>
          </div>

          <Button type="submit" className="w-full">
            {reflection ? 'Save Changes' : 'Add Reflection'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
