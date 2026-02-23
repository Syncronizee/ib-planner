import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { CalendarView } from './calendar-view'
import { isElectronRequestHeaders } from '@/lib/electron/request'
import { ElectronCalendarPage } from './electron-calendar-page'

export default async function CalendarPage() {
  const isElectronRequest = isElectronRequestHeaders(await headers())
  if (isElectronRequest) {
    return <ElectronCalendarPage />
  }

  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }

  // Fetch all data needed for calendar
  const [
    { data: tasks },
    { data: assessments },
    { data: subjects },
    { data: scheduledSessions },
    { data: schoolEvents },
  ] = user
    ? await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
      supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true }),
      supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('scheduled_study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true }),
      supabase
        .from('school_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true }),
    ])
    : [
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
    ]

  return (
    <div className="min-h-screen bg-background">
      <Header email={user?.email || ''} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <CalendarView 
          initialTasks={tasks || []}
          initialAssessments={assessments || []}
          subjects={subjects || []}
          initialScheduledSessions={scheduledSessions || []}
          initialSchoolEvents={schoolEvents || []}
        />
      </main>
    </div>
  )
}
