import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { FocusSession } from '@/components/study/focus-session'
import { EnergyLevel, SessionType } from '@/lib/types'
import { isElectronRequestHeaders } from '@/lib/electron/request'
import { ElectronFocusPage } from './electron-focus-page'

type FocusPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function FocusPage({ searchParams }: FocusPageProps) {
  const isElectronRequest = isElectronRequestHeaders(await headers())
  if (isElectronRequest) {
    return <ElectronFocusPage />
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const params = (await searchParams) || {}
  const subjectId = typeof params.subject === 'string' ? params.subject : ''
  const taskId = typeof params.task === 'string' ? params.task : ''
  const durationGoal = typeof params.duration === 'string' ? Number.parseInt(params.duration, 10) : 45
  const sessionType = typeof params.sessionType === 'string' ? params.sessionType as SessionType : 'practice'
  const energyLevel = typeof params.energy === 'string' ? params.energy as EnergyLevel : 'medium'
  const taskSuggestion = typeof params.objective === 'string'
    ? params.objective
    : typeof params.taskSuggestion === 'string'
      ? params.taskSuggestion
      : ''
  const autoStart = params.autostart === '1'
  const plannedSessionId = typeof params.plannedSessionId === 'string' ? params.plannedSessionId : undefined

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
    <FocusSession
      subjects={subjects || []}
      tasks={tasks || []}
      initialSubjectId={subjectId}
      initialTaskId={taskId}
      initialDurationGoal={Number.isNaN(durationGoal) ? 45 : durationGoal}
      initialSessionType={sessionType}
      initialEnergyLevel={energyLevel}
      initialTaskSuggestion={taskSuggestion}
      autoStart={autoStart}
      plannedSessionId={plannedSessionId}
    />
  )
}
