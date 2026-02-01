'use client'

import { Subject, Assessment } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface AssessmentsTabProps {
  subject: Subject
  assessments: Assessment[]
  onAssessmentsChange: (assessments: Assessment[]) => void
}

export function AssessmentsTab({ subject, assessments, onAssessmentsChange }: AssessmentsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Assessments</h3>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Assessment
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center py-8">
        Assessment tracking coming in Chunk 2...
      </p>
    </div>
  )
}