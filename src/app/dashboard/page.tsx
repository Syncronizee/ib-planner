import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubjectsSection } from './subjects-section'
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

        <SubjectsSection initialSubjects={subjects || []} />
      </div>
    </main>
  )
}