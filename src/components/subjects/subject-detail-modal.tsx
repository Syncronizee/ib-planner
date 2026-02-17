'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Subject, 
  GradeHistory, 
  Assessment, 
  StudyResource,
  SyllabusTopic,
  WeaknessTag,
  ErrorLog,
  SUBJECT_COLORS 
} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { GradesTab } from './tabs/grades-tab'
import { AssessmentsTab } from './tabs/assessments-tab'
import { HomeworkTab } from './tabs/homework-tab'
import { ResourcesTab } from './tabs/resources-tab'
import { SyllabusTab } from './tabs/syllabus-tab'
import { WeaknessesTab } from './tabs/weaknesses-tab'
import { ErrorsTab } from './tabs/errors-tab'
import { NotesTab } from './tabs/notes-tab'

interface SubjectDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: Subject
  onSubjectUpdate: (subject: Subject) => void
}

export function SubjectDetailModal({
  open,
  onOpenChange,
  subject,
  onSubjectUpdate,
}: SubjectDetailModalProps) {
  const [activeTab, setActiveTab] = useState('grades')
  const [gradeHistory, setGradeHistory] = useState<GradeHistory[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [resources, setResources] = useState<StudyResource[]>([])
  const [syllabusTopics, setSyllabusTopics] = useState<SyllabusTopic[]>([])
  const [weaknesses, setWeaknesses] = useState<WeaknessTag[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)

  const colorClass = SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-slate-500'

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [
      { data: historyData },
      { data: assessmentData },
      { data: resourceData },
      { data: syllabusData },
      { data: weaknessData },
      { data: errorData },
    ] = await Promise.all([
      supabase.from('grade_history').select('*').eq('subject_id', subject.id).order('date', { ascending: false }),
      supabase.from('assessments').select('*').eq('subject_id', subject.id).order('date', { ascending: false }),
      supabase.from('study_resources').select('*').eq('subject_id', subject.id).order('created_at', { ascending: false }),
      supabase.from('syllabus_topics').select('*').eq('subject_id', subject.id).order('unit_number', { ascending: true }),
      supabase.from('weakness_tags').select('*').eq('subject_id', subject.id).order('created_at', { ascending: false }),
      supabase.from('error_logs').select('*').eq('subject_id', subject.id).order('date', { ascending: false }),
    ])

    setGradeHistory(historyData || [])
    setAssessments(assessmentData || [])
    setResources(resourceData || [])
    setSyllabusTopics(syllabusData || [])
    setWeaknesses(weaknessData || [])
    setErrorLogs(errorData || [])
    setLoading(false)
  }, [subject.id])

  useEffect(() => {
    if (open) {
       
      fetchAllData()
    }
  }, [open, fetchAllData])

  const unresolvedWeaknesses = weaknesses.filter(w => !w.is_resolved).length
  const unresolvedErrors = errorLogs.filter(e => !e.is_resolved).length
  const averageScore = assessments.length > 0
    ? Math.round(assessments.filter(a => a.percentage !== null).reduce((sum, a) => sum + (a.percentage || 0), 0) / assessments.filter(a => a.percentage !== null).length)
    : null
  const tabTriggerClass = "px-2 sm:px-4 py-1.5 sm:py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-all text-[var(--muted-fg)] data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-fg)] data-[state=active]:border-[var(--accent)] data-[state=active]:shadow-sm hover:bg-[var(--muted)] hover:text-[var(--card-fg)] border border-transparent"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-[var(--card)] text-[var(--card-fg)] border-[var(--border)]">
        {/* Header - Fixed */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] bg-[var(--muted)] shrink-0">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <div className={`w-2 h-10 sm:h-12 rounded-full shrink-0 ${colorClass}`} />
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-xl lg:text-2xl font-bold truncate text-[var(--card-fg)]">
                  {subject.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  View subject details, grades, assessments, homework, and notes.
                </DialogDescription>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs bg-[var(--muted)] text-[var(--muted-fg)]">{subject.level}</Badge>
                  {subject.teacher_name && (
                    <span className="text-xs text-[var(--muted-fg)] truncate hidden sm:inline">
                      {subject.teacher_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Quick stats */}
            <div className="flex gap-3 sm:gap-6 text-center shrink-0 text-[var(--card-fg)]">
              <div className="px-1 sm:px-3">
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{subject.current_grade ?? '-'}</p>
                <p className="text-xs text-[var(--muted-fg)]">Current</p>
              </div>
              <div className="px-1 sm:px-3 border-l border-[var(--border)]">
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{subject.predicted_grade ?? '-'}</p>
                <p className="text-xs text-[var(--muted-fg)]">Predicted</p>
              </div>
              <div className="px-1 sm:px-3 border-l border-[var(--border)]">
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{subject.target_grade ?? '-'}</p>
                <p className="text-xs text-[var(--muted-fg)]">Target</p>
              </div>
              {averageScore !== null && (
                <div className="px-1 sm:px-3 border-l border-[var(--border)] hidden md:block">
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{averageScore}%</p>
                  <p className="text-xs text-[var(--muted-fg)]">Avg</p>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          {/* Tab List - Fixed */}
          <div className="px-4 sm:px-6 py-2 border-b border-[var(--border)] bg-[var(--card)] shrink-0 overflow-x-auto">
            <TabsList className="inline-flex h-auto min-h-10 items-center justify-start rounded-xl bg-[var(--muted)] border border-[var(--border)] p-1.5 gap-1">
              <TabsTrigger 
                value="grades" 
                className={tabTriggerClass}
              >
                Grades
              </TabsTrigger>
              <TabsTrigger 
                value="assessments" 
                className={tabTriggerClass}
              >
                Assessments
              </TabsTrigger>
              <TabsTrigger 
                value="homework" 
                className={tabTriggerClass}
              >
                Homework
              </TabsTrigger>
              <TabsTrigger 
                value="syllabus" 
                className={tabTriggerClass}
              >
                Syllabus
              </TabsTrigger>
              <TabsTrigger 
                value="resources" 
                className={tabTriggerClass}
              >
                Resources
              </TabsTrigger>
              <TabsTrigger 
                value="weaknesses" 
                className={`${tabTriggerClass} flex items-center gap-1`}
              >
                Weaknesses
                {unresolvedWeaknesses > 0 && (
                  <Badge variant="destructive" className="h-4 w-4 p-0 text-[8px] flex items-center justify-center">
                    {unresolvedWeaknesses}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="errors" 
                className={`${tabTriggerClass} flex items-center gap-1`}
              >
                Errors
                {unresolvedErrors > 0 && (
                  <Badge variant="destructive" className="h-4 w-4 p-0 text-[8px] flex items-center justify-center">
                    {unresolvedErrors}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className={tabTriggerClass}
              >
                Notes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-[var(--muted-fg)] text-sm">Loading...</p>
                </div>
              ) : (
                <>
                  <TabsContent value="grades" className="mt-0 m-0">
                    <GradesTab 
                      subject={subject}
                      gradeHistory={gradeHistory}
                      onSubjectUpdate={onSubjectUpdate}
                      onGradeHistoryChange={setGradeHistory}
                    />
                  </TabsContent>

                  <TabsContent value="assessments" className="mt-0 m-0">
                    <AssessmentsTab
                      subject={subject}
                      assessments={assessments}
                      onAssessmentsChange={setAssessments}
                    />
                  </TabsContent>

                  <TabsContent value="homework" className="mt-0 m-0">
                    <HomeworkTab subject={subject} />
                  </TabsContent>

                  <TabsContent value="syllabus" className="mt-0 m-0">
                    <SyllabusTab
                      subject={subject}
                      topics={syllabusTopics}
                      onTopicsChange={setSyllabusTopics}
                    />
                  </TabsContent>

                  <TabsContent value="resources" className="mt-0 m-0">
                    <ResourcesTab
                      subject={subject}
                      resources={resources}
                      onResourcesChange={setResources}
                    />
                  </TabsContent>

                  <TabsContent value="weaknesses" className="mt-0 m-0">
                    <WeaknessesTab
                      subject={subject}
                      weaknesses={weaknesses}
                      onWeaknessesChange={setWeaknesses}
                    />
                  </TabsContent>

                  <TabsContent value="errors" className="mt-0 m-0">
                    <ErrorsTab
                      subject={subject}
                      errorLogs={errorLogs}
                      onErrorLogsChange={setErrorLogs}
                    />
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0 m-0">
                    <NotesTab subject={subject} />
                  </TabsContent>
                </>
              )}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
