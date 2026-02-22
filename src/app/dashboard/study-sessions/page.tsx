import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { StudySessionsList } from '@/components/study/study-sessions-list'
import { isElectronRequestHeaders } from '@/lib/electron/request'

export default async function StudySessionsPage() {
  const isElectronRequest = isElectronRequestHeaders(await headers())
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    if (!isElectronRequest) {
      redirect('/login')
    }
  }

  const [
    { data: sessions },
    { data: subjects },
  ] = user
    ? await Promise.all([
      supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false }),
      supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
    ])
    : [
      { data: [] },
      { data: [] },
    ]

  return (
    <div className="min-h-screen app-bg">
      <Header email={user?.email || ''} />
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        <StudySessionsList
          sessions={sessions || []}
          subjects={subjects || []}
        />
      </main>
    </div>
  )
}
