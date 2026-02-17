'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Subject } from '@/lib/types'
import { isElectronRuntime } from '@/hooks/use-platform'

export function useElectronApi() {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.electronAPI ?? null
  }, [])
}

export function useSubjects(userId: string | null | undefined) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubjects = useCallback(async () => {
    if (!userId) {
      setSubjects([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isElectronRuntime() && window.electronAPI?.db?.getSubjects) {
        const data = await window.electronAPI.db.getSubjects(userId)
        setSubjects(data)
        return
      }

      const supabase = createClient()
      const { data, error: supabaseError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (supabaseError) {
        throw supabaseError
      }

      setSubjects((data ?? []) as Subject[])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load subjects')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchSubjects()
  }, [fetchSubjects])

  return {
    subjects,
    loading,
    error,
    refetch: fetchSubjects,
  }
}
