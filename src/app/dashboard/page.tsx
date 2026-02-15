import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { SubjectsSection } from './subjects-section'
import { TasksSection } from './tasks-section'
import { CalendarPreview } from './calendar-preview'
import { TimetableSection } from './timetable-section'
import { GraduationCap, Target, TrendingUp, CheckSquare } from 'lucide-react'
import { formatDotoNumber } from '@/lib/utils'

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
    <div className="min-h-screen app-bg">
      <Header email={user.email || ''} />
      
      <main className="dashboard-main max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Theme Demo Surface */}
        <section className="token-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-[var(--card-fg)]">Dashboard Overview</h1>
              <p className="text-sm token-muted mt-1">
                Active theme tokens now drive this page background, panels, borders, and actions.
              </p>
            </div>
            <button className="token-btn-accent rounded-xl px-4 py-2 text-sm font-medium transition-smooth">
              Focus Session
            </button>
          </div>
          <div className="mt-4 border-t border-[var(--border)] pt-3 space-y-2">
            <div className="token-row px-3 py-2 flex items-center justify-between text-sm">
              <span>Upcoming deadlines</span>
              <span className="token-muted">Prioritized by due date</span>
            </div>
            <div className="token-row px-3 py-2 flex items-center justify-between text-sm">
              <span>Study consistency</span>
              <span className="token-muted">Last 7 days trend</span>
            </div>
          </div>
        </section>

        {/* Stats Overview - Colored Glass Cards with Dotted Numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card-colored glass-pink p-5 hover-lift">
            <div className="flex items-center gap-2 token-muted mb-4">
              <GraduationCap className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Subjects</span>
            </div>
            <p className="dotted-number">{formatDotoNumber(totalSubjects)}</p>
          </div>
          
          <div className="glass-card-colored glass-purple p-5 hover-lift">
            <div className="flex items-center gap-2 token-muted mb-4">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Average</span>
            </div>
            <p className="dotted-number">{formatDotoNumber(averageGrade) || '-'}</p>
          </div>
          
          <div className="glass-card-colored glass-cyan p-5 hover-lift">
            <div className="flex items-center gap-2 token-muted mb-4">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Points</span>
            </div>
            <div className="flex items-baseline">
              <span className="dotted-number">{formatDotoNumber(totalPoints)}</span>
              <span className="dotted-divider">/42</span>
            </div>
          </div>
          
          <div className="glass-card-colored glass-orange p-5 hover-lift">
            <div className="flex items-center gap-2 token-muted mb-4">
              <CheckSquare className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Tasks</span>
            </div>
            <p className="dotted-number">{formatDotoNumber(pendingTasks)}</p>
          </div>
        </div>

        {/* Timetable - Full Width */}
        <div className="glass-card hover-lift overflow-hidden">
          <TimetableSection 
            initialEntries={timetableEntries || []} 
            subjects={subjects || []} 
          />
        </div>

        {/* Calendar Preview - Full Width */}
        <div className="glass-card hover-lift overflow-hidden">
          <CalendarPreview 
            tasks={tasks || []} 
            assessments={assessments || []} 
            subjects={subjects || []} 
          />
        </div>

        {/* Subjects and Tasks Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subjects - Left */}
          <div className="glass-card hover-lift overflow-hidden">
            <SubjectsSection initialSubjects={subjects || []} />
          </div>
          
          {/* Tasks - Right */}
          <div className="glass-card hover-lift overflow-hidden">
            <TasksSection initialTasks={tasks || []} subjects={subjects || []} />
          </div>
        </div>
      </main>
    </div>
  )
}
