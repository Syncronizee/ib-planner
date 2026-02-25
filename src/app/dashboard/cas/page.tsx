import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { CASOverview } from './cas-overview'
import { CASExperiencesList } from './cas-experiences-list'
import { isElectronRequestHeaders } from '@/lib/electron/request'
import { ElectronCASPage } from './electron-cas-page'

export default async function CASPage() {
  const isElectronRequest = isElectronRequestHeaders(await headers())
  if (isElectronRequest) {
    return <ElectronCASPage />
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: experiences } = user
    ? await supabase
      .from('cas_experiences')
      .select('*')
      .order('date', { ascending: false })
    : { data: [] }

  const { data: reflections } = user
    ? await supabase
      .from('cas_reflections')
      .select('*')
    : { data: [] }

  const { data: outcomes } = user
    ? await supabase
      .from('cas_experience_outcomes')
      .select('*')
    : { data: [] }

  return (
    <div className="min-h-screen app-bg">
      <Header email={user?.email || ''} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--card-fg)]">CAS Tracking</h1>
          <p className="text-[var(--muted-fg)]">Creativity, Activity, Service</p>
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
