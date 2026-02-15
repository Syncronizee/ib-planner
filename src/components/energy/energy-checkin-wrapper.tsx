'use client'

import { useState, useEffect } from 'react'
import { Task, Subject } from '@/lib/types'
import { EnergyCheckinModal } from './energy-checkin-modal'

interface EnergyCheckinWrapperProps {
  tasks: Task[]
  subjects: Subject[]
  enabled?: boolean
}

export function EnergyCheckinWrapper({ tasks, subjects, enabled = true }: EnergyCheckinWrapperProps) {
  const [showCheckin, setShowCheckin] = useState(false)

  useEffect(() => {
    if (!enabled) return

    // Check if dismissed recently (within last 4 hours)
    const dismissed = localStorage.getItem('energy-checkin-dismissed')
    if (dismissed) {
      const dismissedAt = new Date(dismissed)
      const hoursSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60)
      if (hoursSince < 4) return
    }

    // Check if already checked in today
    const lastCheckin = localStorage.getItem('energy-checkin-last')
    if (lastCheckin) {
      const lastDate = new Date(lastCheckin).toDateString()
      const today = new Date().toDateString()
      if (lastDate === today) return
    }

    // Show after a short delay so dashboard loads first
    const timer = setTimeout(() => setShowCheckin(true), 800)
    return () => clearTimeout(timer)
  }, [enabled])

  const handleOpenChange = (open: boolean) => {
    setShowCheckin(open)
    if (!open) {
      localStorage.setItem('energy-checkin-last', new Date().toISOString())
    }
  }

  return (
    <EnergyCheckinModal
      open={showCheckin}
      onOpenChange={handleOpenChange}
      tasks={tasks}
      subjects={subjects}
    />
  )
}
