import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubjectsSection } from './subjects-section'
import { TasksSection } from './tasks-section'
import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/dashboard/stats-cards'

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
    .order('due_date', { ascending: true, nullsFirst: false })

  return (
    <div className="min-h-screen bg-background">
      <Header email={user.email || ''} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Here's your IB overview</p>
        </div>

        <div className="space-y-8">
          <StatsCards subjects={subjects || []} tasks={tasks || []} />
          <SubjectsSection initialSubjects={subjects || []} />
          <TasksSection initialTasks={tasks || []} subjects={subjects || []} />
        </div>
      </main>
    </div>
  )
}