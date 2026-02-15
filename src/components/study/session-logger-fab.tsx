'use client'

import { useState } from 'react'
import { Subject } from '@/lib/types'
import { SessionLoggerModal } from './session-logger-modal'
import { BookOpen } from 'lucide-react'

interface SessionLoggerFabProps {
  subjects: Subject[]
}

export function SessionLoggerFab({ subjects }: SessionLoggerFabProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-lg hover:scale-105 transition-smooth"
        aria-label="Log study session"
      >
        <BookOpen className="h-5 w-5" />
      </button>

      <SessionLoggerModal
        open={open}
        onOpenChange={setOpen}
        subjects={subjects}
      />
    </>
  )
}
