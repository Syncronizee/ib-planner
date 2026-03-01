import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { SubjectsSection } from './subjects-section'
import { TasksSection } from './tasks-section'
import { CalendarPreview } from './calendar-preview'
import { TimetableSection } from './timetable-section'
import { EnergyCheckinWrapper } from '@/components/energy/energy-checkin-wrapper'
import { WeeklyPlanWidget } from '@/components/dashboard/weekly-plan-widget'
import { DashboardOverviewCard } from '@/components/dashboard/dashboard-overview-card'
import { StudySessionsWidget } from '@/components/dashboard/study-sessions-widget'
import { FocusAreas } from '@/components/dashboard/focus-areas'
import { PracticeTracker } from '@/components/dashboard/practice-tracker'

import { SessionLoggerFab } from '@/components/study/session-logger-fab'
import { GraduationCap, Target, TrendingUp, CheckSquare } from 'lucide-react'
import { formatDotoNumber } from '@/lib/utils'
import { format, startOfWeek } from 'date-fns'
import { isElectronRequestHeaders } from '@/lib/electron/request'
import { ElectronDashboardAuthGate } from './electron-auth-gate'

export default async function DashboardPage() {
  const isElectronRequest = isElectronRequestHeaders(await headers())

  if (isElectronRequest) {
    return <ElectronDashboardAuthGate />
  }

  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const [
    { data: subjects },
    { data: tasks },
    { data: assessments },
    { data: timetableEntries },
    { data: weeklyPriorities },
    { data: studySessions },
    { data: scheduledSessions },
    { data: schoolEvents },
    { data: weaknesses },
    { data: syllabusTopics },
    { data: energyCheckins },
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
    supabase
      .from('weekly_priorities')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', format(weekStart, 'yyyy-MM-dd'))
      .order('priority_number', { ascending: true }),
    supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false }),
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
    supabase
      .from('weakness_tags')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('syllabus_topics')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('energy_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(1),
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

      {/* Energy Check-In Modal */}
      <EnergyCheckinWrapper
        tasks={tasks || []}
        subjects={subjects || []}
      />

      {/* Floating Action Button for Study Sessions */}
      <SessionLoggerFab subjects={subjects || []} />

      <main className="dashboard-main max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        <DashboardOverviewCard
          tasks={tasks || []}
          assessments={assessments || []}
          subjects={subjects || []}
          scheduledSessions={scheduledSessions || []}
        />

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

        {/* Weekly Plan + Focus Areas Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card hover-lift overflow-hidden">
            <WeeklyPlanWidget
              priorities={weeklyPriorities || []}
              subjects={subjects || []}
            />
          </div>
          <div className="glass-card hover-lift overflow-hidden">
            <FocusAreas
              subjects={subjects || []}
              assessments={assessments || []}
              tasks={tasks || []}
              weaknesses={weaknesses || []}
              energyCheckins={energyCheckins || []}
            />
          </div>
        </div>

        {/* Practice Tracker */}
        <div className="glass-card hover-lift overflow-hidden">
          <PracticeTracker
            subjects={subjects || []}
            syllabusTopics={syllabusTopics || []}
          />
        </div>

        {/* Study Sessions Widget */}
        <div className="glass-card hover-lift overflow-hidden">
          <StudySessionsWidget
            sessions={studySessions || []}
            subjects={subjects || []}
            tasks={tasks || []}
            scheduledSessions={scheduledSessions || []}
          />
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
            scheduledSessions={scheduledSessions || []}
            schoolEvents={schoolEvents || []}
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
