'use client'

import { Subject } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, ChevronRight } from 'lucide-react'
import { formatDotoNumber } from '@/lib/utils'

interface SubjectCardProps {
  subject: Subject
  onEdit: (subject: Subject) => void
  onDelete: (subject: Subject) => void
  onClick: (subject: Subject) => void
}

export function SubjectCard({ subject, onEdit, onDelete, onClick }: SubjectCardProps) {
  const confidenceValue = Math.max(0, Math.min(5, subject.confidence ?? 0))

  return (
    <div
      onClick={() => onClick(subject)}
      className="subject-tile group relative p-4 rounded-2xl bg-[var(--muted)]/45 backdrop-blur-xl border border-[var(--border)] hover:border-[var(--ring)] transition-smooth cursor-pointer hover-lift shadow-[0_8px_28px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center gap-4">
        {/* Grade Circle with Dotted Number */}
        <div className="w-16 h-16 rounded-xl bg-[var(--card)]/70 backdrop-blur flex items-center justify-center shadow-lg border border-[var(--border)]">
          <span className="dotted-number-md">{formatDotoNumber(subject.current_grade)}</span>
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--card-fg)] truncate">{subject.name}</h3>
            <Badge className="bg-[var(--muted)] text-[var(--muted-fg)] border-0 text-[10px]">
              {subject.level}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-[var(--muted-fg)]">
            <span className="flex items-center gap-1">
              Target: <span className="dotted-number-xs">{formatDotoNumber(subject.target_grade)}</span>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-[var(--muted-fg)]">Confidence</span>
            <div className="flex-1 flex gap-1">
              {Array.from({ length: 5 }, (_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full ${
                    idx < confidenceValue ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-[var(--muted-fg)] tabular-nums">{confidenceValue}/5</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--muted-fg)] hover:text-[var(--card-fg)] hover:bg-[var(--muted)]"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(subject)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--muted-fg)] hover:text-red-500 hover:bg-red-500/10"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(subject)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <ChevronRight className="h-5 w-5 text-[var(--muted-fg)] group-hover:text-[var(--card-fg)] transition-colors" />
      </div>
    </div>
  )
}
