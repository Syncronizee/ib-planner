import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { TOKEssaySection } from './tok-essay-section'
import { TOKExhibitionSection } from './tok-exhibition-section'
import { TOKKnowledgeQuestionsSection } from './tok-kq-section'
import { TOKNotesSection } from './tok-notes-section'
import { isElectronRequestHeaders } from '@/lib/electron/request'
import { ElectronTOKPage } from './electron-tok-page'

export default async function TOKPage() {
  const isElectronRequest = isElectronRequestHeaders(await headers())
  if (isElectronRequest) {
    return <ElectronTOKPage />
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: essay } = user
    ? await supabase
      .from('tok_essay')
      .select('*')
      .single()
    : { data: null }

  const { data: exhibition } = user
    ? await supabase
      .from('tok_exhibition')
      .select('*')
      .single()
    : { data: null }

  const { data: exhibitionObjects } = user
    ? await supabase
      .from('tok_exhibition_objects')
      .select('*')
      .order('object_number')
    : { data: [] }

  const { data: knowledgeQuestions } = user
    ? await supabase
      .from('tok_knowledge_questions')
      .select('*')
      .order('created_at', { ascending: false })
    : { data: [] }

  const { data: notes } = user
    ? await supabase
      .from('tok_notes')
      .select('*')
    : { data: [] }

  const { data: userPrompts } = user
    ? await supabase
      .from('tok_prompts')
      .select('*')
      .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="min-h-screen app-bg">
      <Header email={user?.email || ''} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--card-fg)]">TOK Tracking</h1>
          <p className="text-[var(--muted-fg)]">Theory of Knowledge</p>
        </div>

        <div className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <TOKEssaySection 
              initialEssay={essay} 
              initialUserPrompts={userPrompts || []} 
            />
            <TOKExhibitionSection 
              initialExhibition={exhibition} 
              initialObjects={exhibitionObjects || []} 
              initialUserPrompts={userPrompts || []}
            />
          </div>
          <TOKKnowledgeQuestionsSection initialQuestions={knowledgeQuestions || []} />
          <TOKNotesSection initialNotes={notes || []} />
        </div>
      </main>
    </div>
  )
}
