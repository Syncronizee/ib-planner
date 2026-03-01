import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { WeeklyPriorityPlanner } from '@/components/dashboard/weekly-priority-planner'
import { isElectronRequestHeaders } from '@/lib/electron/request'
import { ElectronPlanPage } from './electron-plan-page'
import { getRelativeWeekStart } from '@/lib/weekly-planning'

type PlanPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const isElectronRequest = isElectronRequestHeaders(await headers())
  const params = (await searchParams) || {}
  const weekVariant = params.week === 'next' ? 'next' : 'current'
  if (isElectronRequest) {
    return <ElectronPlanPage />
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const weekStart = getRelativeWeekStart(weekVariant === 'next' ? 1 : 0)

  const [
    { data: subjects },
    { data: priorities },
  ] = await Promise.all([
    supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('weekly_priorities')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .order('priority_number', { ascending: true }),
  ])

  return (
    <div className="min-h-screen app-bg">
      <Header email={user.email || ''} />
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
        <WeeklyPriorityPlanner
          subjects={subjects || []}
          initialPriorities={priorities || []}
          weekStart={weekStart}
          weekVariant={weekVariant}
        />
      </main>
    </div>
  )
}
