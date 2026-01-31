import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubjectsSection } from './subjects-section'
import { TasksSection } from './tasks-section'
import { LogoutButton } from './logout-button'

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
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <LogoutButton />
        </div>

        <div className="space-y-8">
          <SubjectsSection initialSubjects={subjects || []} />
          <TasksSection initialTasks={tasks || []} subjects={subjects || []} />
        </div>
      </div>
    </main>
  )
}