import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { SubjectsSection } from './subjects-section'
import { TasksSection } from './tasks-section'
import { TimetableSection } from './timetable-section'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true })

  const { data: timetableEntries } = await supabase
    .from('timetable_entries')
    .select('*')
    .order('start_time', { ascending: true })

  return (
    <div className="min-h-screen bg-background">
      <Header email={user.email || ''} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Your IB Diploma overview</p>
        </div>

        <div className="space-y-8">
          <StatsCards subjects={subjects || []} tasks={tasks || []} />
          
          <TimetableSection 
            initialEntries={timetableEntries || []} 
            subjects={subjects || []} 
          />

          <div className="grid gap-8 lg:grid-cols-2">
            <SubjectsSection initialSubjects={subjects || []} />
            <TasksSection initialTasks={tasks || []} subjects={subjects || []} />
          </div>
        </div>
      </main>
    </div>
  )
}