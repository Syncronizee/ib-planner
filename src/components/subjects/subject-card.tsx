'use client'

import { Subject, SUBJECT_COLORS } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Target, TrendingUp } from 'lucide-react'

interface SubjectCardProps {
  subject: Subject
  onEdit: (subject: Subject) => void
  onDelete: (subject: Subject) => void
  onClick: (subject: Subject) => void
}

export function SubjectCard({ subject, onEdit, onDelete, onClick }: SubjectCardProps) {
  const colorClass = SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-slate-500'
  const confidenceLabels = ['', 'Struggling', 'Needs Work', 'Okay', 'Good', 'Confident']

  return (
    <Card 
      className="relative cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(subject)}
    >
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${colorClass}`} />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{subject.name}</CardTitle>
            <Badge variant="secondary" className="mt-1">{subject.level}</Badge>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" onClick={() => onEdit(subject)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(subject)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Grades row */}
        {(subject.current_grade || subject.target_grade) && (
          <div className="flex items-center gap-4 text-sm">
            {subject.current_grade && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{subject.current_grade}</span>
              </div>
            )}
            {subject.target_grade && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>{subject.target_grade}</span>
              </div>
            )}
          </div>
        )}

        {/* Confidence bar */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Confidence:</span>
          <div className="flex gap-1 flex-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`flex-1 h-2 rounded-sm ${
                  level <= subject.confidence ? colorClass : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {confidenceLabels[subject.confidence]}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}