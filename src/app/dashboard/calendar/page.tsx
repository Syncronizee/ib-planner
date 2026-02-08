import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { CalendarView } from './calendar-view'

export default async function CalendarPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth')
  }

  // Fetch all data needed for calendar
  const [
    { data: tasks },
    { data: assessments },
    { data: subjects },
  ] = await Promise.all([
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
  ])

  return (
    <div className="min-h-screen bg-background">
      <Header email={user.email || ''} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <CalendarView 
          initialTasks={tasks || []}
          initialAssessments={assessments || []}
          subjects={subjects || []}
        />
      </main>
    </div>
  )
}