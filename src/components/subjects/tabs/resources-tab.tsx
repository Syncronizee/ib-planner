'use client'

import { Subject, StudyResource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface ResourcesTabProps {
  subject: Subject
  resources: StudyResource[]
  onResourcesChange: (resources: StudyResource[]) => void
}

export function ResourcesTab({ subject, resources, onResourcesChange }: ResourcesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Study Resources</h3>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Resource
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center py-8">
        Resources coming in Chunk 2...
      </p>
    </div>
  )
}