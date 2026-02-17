'use client'

import { useMemo } from 'react'
import { getDatabaseService } from '@/lib/db'

export function useDatabase() {
  return useMemo(() => getDatabaseService(), [])
}
