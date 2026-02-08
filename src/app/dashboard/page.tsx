import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { SubjectsSection } from './subjects-section'
import { TasksSection } from './tasks-section'
import { CalendarPreview } from './calendar-preview'
import { TimetableSection } from './timetable-section'
import { Card, CardContent } from '@/components/ui/card'
import { GraduationCap, Target, TrendingUp, CheckSquare } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth')
  }

  const [
    { data: subjects },
    { data: tasks },
    { data: assessments },
    { data: timetableEntries },
  ] = await Promise.all([
    supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
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
      .from('timetable_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true }),
  ])

  // Calculate stats
  const totalSubjects = subjects?.length || 0
  const subjectsWithGrades = subjects?.filter(s => s.current_grade !== null) || []
  const averageGrade = subjectsWithGrades.length > 0
    ? (subjectsWithGrades.reduce((sum, s) => sum + (s.current_grade || 0), 0) / subjectsWithGrades.length).toFixed(1)
    : null
  const totalPoints = subjectsWithGrades.reduce((sum, s) => sum + (s.current_grade || 0), 0)
  const pendingTasks = tasks?.filter(t => !t.is_completed).length || 0

  return (
    <div className="min-h-screen bg-background">
      <Header email={user.email || ''} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <GraduationCap className="h-4 w-4" />
                <span className="text-xs">Subjects</span>
              </div>
              <p className="text-2xl font-bold">{totalSubjects}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Average Grade</span>
              </div>
              <p className="text-2xl font-bold">{averageGrade || '-'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">Current Points</span>
              </div>
              <p className="text-2xl font-bold">{totalPoints}/42</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckSquare className="h-4 w-4" />
                <span className="text-xs">Pending Tasks</span>
              </div>
              <p className="text-2xl font-bold">{pendingTasks}</p>
            </CardContent>
          </Card>
        </div>

        {/* Subjects */}
        <SubjectsSection initialSubjects={subjects || []} />

        {/* Timetable */}
        <TimetableSection 
          initialEntries={timetableEntries || []} 
          subjects={subjects || []} 
        />

        {/* Tasks and Calendar Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TasksSection initialTasks={tasks || []} subjects={subjects || []} />
          </div>
          <div>
            <CalendarPreview 
              tasks={tasks || []} 
              assessments={assessments || []} 
              subjects={subjects || []} 
            />
          </div>
        </div>
      </main>
    </div>
  )
}