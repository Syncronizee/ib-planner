'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { CASOverview } from './cas-overview'
import { CASExperiencesList } from './cas-experiences-list'
import { getLocalDesktopUser, maybePrimeLocalCache, queryLocalTable } from '@/lib/electron/local-route'
import type { CASExperience, CASExperienceOutcome, CASReflection } from '@/lib/types'
import { onDataChanged } from '@/lib/live-data/events'

type Snapshot = {
  experiences: CASExperience[]
  reflections: CASReflection[]
  outcomes: CASExperienceOutcome[]
}

const EMPTY_SNAPSHOT: Snapshot = {
  experiences: [],
  reflections: [],
  outcomes: [],
}

async function loadLocalSnapshot(userId: string): Promise<Snapshot> {
  const [experiences, reflections, outcomes] = await Promise.all([
    queryLocalTable<CASExperience>('cas_experiences', userId, { orderBy: 'date', ascending: false }),
    queryLocalTable<CASReflection>('cas_reflections', userId, { orderBy: 'date', ascending: false }),
    queryLocalTable<CASExperienceOutcome>('cas_experience_outcomes', userId, {
      orderBy: 'created_at',
      ascending: false,
    }),
  ])

  return { experiences, reflections, outcomes }
}

export function ElectronCASPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      setLoading(true)
      setError(null)

      try {
        const localUser = await getLocalDesktopUser()
        if (!localUser) {
          router.replace('/login')
          return
        }

        if (mounted) {
          setEmail(localUser.email)
        }

        let localSnapshot = await loadLocalSnapshot(localUser.id)
        if (mounted) {
          setSnapshot(localSnapshot)
          setRevision((prev) => prev + 1)
        }

        const totalRows =
          localSnapshot.experiences.length +
          localSnapshot.reflections.length +
          localSnapshot.outcomes.length

        const primed = await maybePrimeLocalCache(totalRows)
        if (primed) {
          localSnapshot = await loadLocalSnapshot(localUser.id)
          if (mounted) {
            setSnapshot(localSnapshot)
            setRevision((prev) => prev + 1)
          }
        }
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : 'Unable to load local CAS data')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    const unsubscribe = onDataChanged(() => {
      if (mounted) {
        setReloadTick((prev) => prev + 1)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [reloadTick, router])

  return (
    <div className="min-h-screen app-bg">
      <Header email={email} />
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--card-fg)]">CAS Tracking</h1>
          <p className="text-[var(--muted-fg)]">Creativity, Activity, Service</p>
        </div>

        {loading ? (
          <div className="token-row px-4 py-3 text-sm token-muted">Loading local CAS data...</div>
        ) : null}
        {!loading && error ? (
          <div className="token-row px-4 py-3 text-sm text-amber-400">{error}</div>
        ) : null}

        <div className="space-y-8">
          <CASOverview experiences={snapshot.experiences} outcomes={snapshot.outcomes} />
          <CASExperiencesList
            key={revision}
            initialExperiences={snapshot.experiences}
            initialReflections={snapshot.reflections}
            initialOutcomes={snapshot.outcomes}
          />
        </div>
      </main>
    </div>
  )
}
