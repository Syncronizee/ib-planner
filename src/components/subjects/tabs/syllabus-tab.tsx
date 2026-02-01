'use client'

import { Subject, SyllabusTopic } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface SyllabusTabProps {
  subject: Subject
  topics: SyllabusTopic[]
  onTopicsChange: (topics: SyllabusTopic[]) => void
}

export function SyllabusTab({ subject, topics, onTopicsChange }: SyllabusTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Syllabus Progress</h3>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Topic
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center py-8">
        Syllabus tracking coming in Chunk 3...
      </p>
    </div>
  )
}