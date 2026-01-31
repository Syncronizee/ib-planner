'use client'

import { Subject, SUBJECT_COLORS } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'

interface SubjectCardProps {
  subject: Subject
  onEdit: (subject: Subject) => void
  onDelete: (subject: Subject) => void
}

export function SubjectCard({ subject, onEdit, onDelete }: SubjectCardProps) {
  const colorClass = SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-slate-500'
  
  const confidenceLabels = ['', 'Struggling', 'Needs Work', 'Okay', 'Good', 'Confident']

  return (
    <Card className="relative">
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${colorClass}`} />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{subject.name}</CardTitle>
            <Badge variant="secondary" className="mt-1">{subject.level}</Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(subject)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(subject)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Confidence:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`w-2 h-6 rounded-sm ${
                  level <= subject.confidence ? colorClass : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {confidenceLabels[subject.confidence]}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}