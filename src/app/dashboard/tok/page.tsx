import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { TOKEssaySection } from './tok-essay-section'
import { TOKExhibitionSection } from './tok-exhibition-section'
import { TOKKnowledgeQuestionsSection } from './tok-kq-section'
import { TOKNotesSection } from './tok-notes-section'

export default async function TOKPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: essay } = await supabase
    .from('tok_essay')
    .select('*')
    .single()

  const { data: exhibition } = await supabase
    .from('tok_exhibition')
    .select('*')
    .single()

  const { data: exhibitionObjects } = await supabase
    .from('tok_exhibition_objects')
    .select('*')
    .order('object_number')

  const { data: knowledgeQuestions } = await supabase
    .from('tok_knowledge_questions')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: notes } = await supabase
    .from('tok_notes')
    .select('*')

  return (
    <div className="min-h-screen bg-background">
      <Header email={user.email || ''} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">TOK Tracking</h1>
          <p className="text-muted-foreground">Theory of Knowledge</p>
        </div>

        <div className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <TOKEssaySection initialEssay={essay} />
            <TOKExhibitionSection 
              initialExhibition={exhibition} 
              initialObjects={exhibitionObjects || []} 
            />
          </div>
          <TOKKnowledgeQuestionsSection initialQuestions={knowledgeQuestions || []} />
          <TOKNotesSection initialNotes={notes || []} />
        </div>
      </main>
    </div>
  )
}