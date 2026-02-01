import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { CASOverview } from './cas-overview'
import { CASExperiencesList } from './cas-experiences-list'

export default async function CASPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: experiences } = await supabase
    .from('cas_experiences')
    .select('*')
    .order('date', { ascending: false })

  const { data: reflections } = await supabase
    .from('cas_reflections')
    .select('*')

  const { data: outcomes } = await supabase
    .from('cas_experience_outcomes')
    .select('*')

  return (
    <div className="min-h-screen bg-background">
      <Header email={user.email || ''} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">CAS Tracking</h1>
          <p className="text-muted-foreground">Creativity, Activity, Service</p>
        </div>

        <div className="space-y-8">
          <CASOverview 
            experiences={experiences || []} 
            outcomes={outcomes || []} 
          />
          <CASExperiencesList 
            initialExperiences={experiences || []} 
            initialReflections={reflections || []}
            initialOutcomes={outcomes || []}
          />
        </div>
      </main>
    </div>
  )
}