'use client'

import { Subject, ErrorLog } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface ErrorsTabProps {
  subject: Subject
  errorLogs: ErrorLog[]
  onErrorLogsChange: (errorLogs: ErrorLog[]) => void
}

export function ErrorsTab({ subject, errorLogs, onErrorLogsChange }: ErrorsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Error Log</h3>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Log Error
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center py-8">
        Error logging coming in Chunk 3...
      </p>
    </div>
  )
}