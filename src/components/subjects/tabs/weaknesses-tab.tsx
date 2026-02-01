'use client'

import { Subject, WeaknessTag } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface WeaknessesTabProps {
  subject: Subject
  weaknesses: WeaknessTag[]
  onWeaknessesChange: (weaknesses: WeaknessTag[]) => void
}

export function WeaknessesTab({ subject, weaknesses, onWeaknessesChange }: WeaknessesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Weaknesses</h3>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Weakness
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center py-8">
        Weakness tracking coming in Chunk 3...
      </p>
    </div>
  )
}