'use client'

import { useState } from 'react'
import { TimetableEntry, Subject } from '@/lib/types'
import { WeeklyTimetable } from '@/components/timetable/weekly-timetable'
import { Clock } from 'lucide-react'

interface TimetableSectionProps {
  initialEntries: TimetableEntry[]
  subjects: Subject[]
}

export function TimetableSection({ initialEntries, subjects }: TimetableSectionProps) {
  const [entries, setEntries] = useState<TimetableEntry[]>(initialEntries)

  return (
    <div className="p-4 sm:p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-green-500/10">
          <Clock className="h-5 w-5 text-green-500" />
        </div>
        <h2 className="text-lg font-semibold">Weekly Timetable</h2>
      </div>
    </div>
    <WeeklyTimetable 
      entries={entries} 
      subjects={subjects} 
      onEntriesChange={setEntries}
    />
    </div>
  )
}