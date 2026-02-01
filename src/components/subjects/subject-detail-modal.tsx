'use client'

import { useState, useEffect } from 'react'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation'

import { GradesTab } from './tabs/grades-tab'
import { AssessmentsTab } from './tabs/assessments-tab'
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
  const router = useRouter()

  const colorClass = SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-slate-500'

  useEffect(() => {
    if (open) {
      fetchAllData()
    }
  }, [open, subject.id])

  const fetchAllData = async () => {
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
  }

  const unresolvedWeaknesses = weaknesses.filter(w => !w.is_resolved).length
  const unresolvedErrors = errorLogs.filter(e => !e.is_resolved).length
  const averageScore = assessments.length > 0
    ? Math.round(assessments.filter(a => a.percentage !== null).reduce((sum, a) => sum + (a.percentage || 0), 0) / assessments.filter(a => a.percentage !== null).length)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-8 py-6 border-b bg-muted/30">
          <div className="flex items-center gap-6">
            <div className={`w-3 h-16 rounded-full ${colorClass}`} />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-3xl font-bold truncate">{subject.name}</DialogTitle>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">{subject.level}</Badge>
                {subject.teacher_name && (
                  <span className="text-sm text-muted-foreground truncate">
                    {subject.teacher_name}
                  </span>
                )}
              </div>
            </div>
            {/* Quick stats */}
            <div className="flex gap-8 text-center shrink-0">
              <div className="px-4">
                <p className="text-4xl font-bold">{subject.current_grade ?? '-'}</p>
                <p className="text-sm text-muted-foreground mt-1">Current</p>
              </div>
              <div className="px-4 border-l">
                <p className="text-4xl font-bold">{subject.predicted_grade ?? '-'}</p>
                <p className="text-sm text-muted-foreground mt-1">Predicted</p>
              </div>
              <div className="px-4 border-l">
                <p className="text-4xl font-bold">{subject.target_grade ?? '-'}</p>
                <p className="text-sm text-muted-foreground mt-1">Target</p>
              </div>
              {averageScore !== null && (
                <div className="px-4 border-l hidden lg:block">
                  <p className="text-4xl font-bold">{averageScore}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Avg Score</p>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-8 py-4 border-b bg-background">
            <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-muted p-1.5">
              <TabsTrigger 
                value="grades" 
                className="px-6 py-2.5 text-sm font-medium whitespace-nowrap rounded-md"
              >
                Grades
              </TabsTrigger>
              <TabsTrigger 
                value="assessments" 
                className="px-6 py-2.5 text-sm font-medium whitespace-nowrap rounded-md"
              >
                Assessments
              </TabsTrigger>
              <TabsTrigger 
                value="syllabus" 
                className="px-6 py-2.5 text-sm font-medium whitespace-nowrap rounded-md"
              >
                Syllabus
              </TabsTrigger>
              <TabsTrigger 
                value="resources" 
                className="px-6 py-2.5 text-sm font-medium whitespace-nowrap rounded-md"
              >
                Resources
              </TabsTrigger>
              <TabsTrigger 
                value="weaknesses" 
                className="px-6 py-2.5 text-sm font-medium whitespace-nowrap rounded-md flex items-center gap-2"
              >
                Weaknesses
                {unresolvedWeaknesses > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 p-0 text-xs flex items-center justify-center">
                    {unresolvedWeaknesses}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="errors" 
                className="px-6 py-2.5 text-sm font-medium whitespace-nowrap rounded-md flex items-center gap-2"
              >
                Errors
                {unresolvedErrors > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 p-0 text-xs flex items-center justify-center">
                    {unresolvedErrors}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="px-6 py-2.5 text-sm font-medium whitespace-nowrap rounded-md"
              >
                Notes
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">Loading...</p>
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
                    <NotesTab
                      subject={subject}
                      onSubjectUpdate={onSubjectUpdate}
                    />
                  </TabsContent>
                </>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}