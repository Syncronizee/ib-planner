import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { PlanWeekFlow } from '@/components/planning/plan-week-flow'
import { isElectronRequestHeaders } from '@/lib/electron/request'

export default async function PlanWeekPage() {
  const isElectronRequest = isElectronRequestHeaders(await headers())
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    if (!isElectronRequest) {
      redirect('/login')
    }
  }

  const [
    { data: subjects },
    { data: tasks },
  ] = user
    ? await Promise.all([
      supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('due_date', { ascending: true }),
    ])
    : [
      { data: [] },
      { data: [] },
    ]

  return (
    <div className="min-h-screen app-bg">
      <Header email={user?.email || ''} />
      <main className="max-w-2xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        <PlanWeekFlow
          subjects={subjects || []}
          tasks={tasks || []}
        />
      </main>
    </div>
  )
}
