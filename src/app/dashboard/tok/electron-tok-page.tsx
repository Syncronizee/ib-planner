'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { TOKEssaySection } from './tok-essay-section'
import { TOKExhibitionSection } from './tok-exhibition-section'
import { TOKKnowledgeQuestionsSection } from './tok-kq-section'
import { TOKNotesSection } from './tok-notes-section'
import { getLocalDesktopUser, maybePrimeLocalCache, queryLocalTable } from '@/lib/electron/local-route'
import { onDataChanged } from '@/lib/live-data/events'
import type {
  TOKEssay,
  TOKExhibition,
  TOKExhibitionObject,
  TOKKnowledgeQuestion,
  TOKNote,
  TOKPrompt,
} from '@/lib/types'

type Snapshot = {
  essay: TOKEssay | null
  exhibition: TOKExhibition | null
  exhibitionObjects: TOKExhibitionObject[]
  knowledgeQuestions: TOKKnowledgeQuestion[]
  notes: TOKNote[]
  userPrompts: TOKPrompt[]
}

const EMPTY_SNAPSHOT: Snapshot = {
  essay: null,
  exhibition: null,
  exhibitionObjects: [],
  knowledgeQuestions: [],
  notes: [],
  userPrompts: [],
}

async function loadLocalSnapshot(userId: string): Promise<Snapshot> {
  const [essays, exhibitions, exhibitionObjects, knowledgeQuestions, notes, userPrompts] = await Promise.all([
    queryLocalTable<TOKEssay>('tok_essay', userId, { orderBy: 'updated_at', ascending: false, limit: 1 }),
    queryLocalTable<TOKExhibition>('tok_exhibition', userId, { orderBy: 'updated_at', ascending: false, limit: 1 }),
    queryLocalTable<TOKExhibitionObject>('tok_exhibition_objects', userId, {
      orderBy: 'object_number',
      ascending: true,
    }),
    queryLocalTable<TOKKnowledgeQuestion>('tok_knowledge_questions', userId, {
      orderBy: 'created_at',
      ascending: false,
    }),
    queryLocalTable<TOKNote>('tok_notes', userId, { orderBy: 'created_at', ascending: false }),
    queryLocalTable<TOKPrompt>('tok_prompts', userId, { orderBy: 'created_at', ascending: false }),
  ])

  return {
    essay: essays[0] ?? null,
    exhibition: exhibitions[0] ?? null,
    exhibitionObjects,
    knowledgeQuestions,
    notes,
    userPrompts,
  }
}

export function ElectronTOKPage() {
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
          (localSnapshot.essay ? 1 : 0) +
          (localSnapshot.exhibition ? 1 : 0) +
          localSnapshot.exhibitionObjects.length +
          localSnapshot.knowledgeQuestions.length +
          localSnapshot.notes.length +
          localSnapshot.userPrompts.length

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
          setError(cause instanceof Error ? cause.message : 'Unable to load local TOK data')
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
    <div className="min-h-screen bg-background">
      <Header email={email} />

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">TOK Tracking</h1>
          <p className="text-muted-foreground">Theory of Knowledge</p>
        </div>

        {loading ? (
          <div className="token-row px-4 py-3 text-sm token-muted">Loading local TOK data...</div>
        ) : null}
        {!loading && error ? (
          <div className="token-row px-4 py-3 text-sm text-amber-400">{error}</div>
        ) : null}

        <div key={revision} className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <TOKEssaySection initialEssay={snapshot.essay} initialUserPrompts={snapshot.userPrompts} />
            <TOKExhibitionSection
              initialExhibition={snapshot.exhibition}
              initialObjects={snapshot.exhibitionObjects}
              initialUserPrompts={snapshot.userPrompts}
            />
          </div>
          <TOKKnowledgeQuestionsSection initialQuestions={snapshot.knowledgeQuestions} />
          <TOKNotesSection initialNotes={snapshot.notes} />
        </div>
      </main>
    </div>
  )
}
