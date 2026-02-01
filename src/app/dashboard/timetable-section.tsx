'use client'

import { useState } from 'react'
import { TimetableEntry, Subject } from '@/lib/types'
import { WeeklyTimetable } from '@/components/timetable/weekly-timetable'

interface TimetableSectionProps {
  initialEntries: TimetableEntry[]
  subjects: Subject[]
}

export function TimetableSection({ initialEntries, subjects }: TimetableSectionProps) {
  const [entries, setEntries] = useState<TimetableEntry[]>(initialEntries)

  return (
    <WeeklyTimetable 
      entries={entries} 
      subjects={subjects} 
      onEntriesChange={setEntries}
    />
  )
}