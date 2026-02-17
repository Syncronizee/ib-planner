'use client'

import { useState, useEffect, useCallback } from 'react'
import { Subject, Assessment, Task, ASSESSMENT_TYPES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface AssessmentsTabProps {
  subject: Subject
  assessments: Assessment[]
  onAssessmentsChange: (assessments: Assessment[]) => void
}

export function AssessmentsTab({ subject, assessments, onAssessmentsChange }: AssessmentsTabProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Assessment | null>(null)
  const [showIncomplete, setShowIncomplete] = useState(true)
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  
  const [title, setTitle] = useState('')
  const [type, setType] = useState<Assessment['type']>('test')
  const [score, setScore] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([])

  const router = useRouter()

  const fetchAvailableTasks = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('subject_id', subject.id)
      .order('due_date', { ascending: true })
    
    setAvailableTasks(data || [])
  }, [subject.id])

  useEffect(() => {
     
    fetchAvailableTasks()
  }, [fetchAvailableTasks])

  const resetForm = () => {
    setTitle('')
    setType('test')
    setScore('')
    setMaxScore('100')
    setWeight('')
    setDate(undefined)
    setNotes('')
    setIsCompleted(false)
    setLinkedTaskIds([])
    setEditing(null)
  }

  const handleAdd = () => {
    resetForm()
    setAdding(true)
  }

  const handleEdit = (assessment: Assessment) => {
    setEditing(assessment)
    setTitle(assessment.title)
    setType(assessment.type)
    setScore(assessment.score?.toString() || '')
    setMaxScore(assessment.max_score?.toString() || '100')
    setWeight(assessment.weight?.toString() || '')
    setDate(assessment.date ? new Date(assessment.date) : undefined)
    setNotes(assessment.notes || '')
    setIsCompleted(assessment.is_completed)
    
    // Get linked task IDs from available tasks
    const linked = availableTasks
      .filter(t => t.linked_assessment_id === assessment.id)
      .map(t => t.id)
    setLinkedTaskIds(linked)
    
    setAdding(true)
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const scoreNum = score ? parseFloat(score) : null
    const maxScoreNum = maxScore ? parseFloat(maxScore) : null
    const percentage = scoreNum !== null && maxScoreNum !== null && maxScoreNum > 0
      ? Math.round((scoreNum / maxScoreNum) * 100 * 100) / 100
      : null

    const assessmentData = {
      title,
      type,
      score: scoreNum,
      max_score: maxScoreNum,
      percentage,
      weight: weight ? parseFloat(weight) : null,
      date: date ? format(date, 'yyyy-MM-dd') : null,
      notes: notes || null,
      is_completed: isCompleted,
    }

    let assessmentId: string

    if (editing) {
      const { data, error } = await supabase
        .from('assessments')
        .update(assessmentData)
        .eq('id', editing.id)
        .select()
        .single()

      if (!error && data) {
        onAssessmentsChange(assessments.map(a => a.id === editing.id ? data : a))
        assessmentId = data.id

        // Unlink all previously linked tasks
        await supabase
          .from('tasks')
          .update({ linked_assessment_id: null })
          .eq('linked_assessment_id', editing.id)

        // Link new tasks
        if (linkedTaskIds.length > 0) {
          await supabase
            .from('tasks')
            .update({ linked_assessment_id: assessmentId })
            .in('id', linkedTaskIds)
        }
      }
    } else {
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          ...assessmentData,
          user_id: user?.id,
          subject_id: subject.id,
        })
        .select()
        .single()

      if (!error && data) {
        onAssessmentsChange([data, ...assessments])
        assessmentId = data.id

        // Link selected tasks
        if (linkedTaskIds.length > 0) {
          await supabase
            .from('tasks')
            .update({ linked_assessment_id: assessmentId })
            .in('id', linkedTaskIds)
        }
      }
    }

    resetForm()
    setAdding(false)
    fetchAvailableTasks()
    router.refresh()
  }

  const handleToggleComplete = async (assessment: Assessment) => {
    const supabase = createClient()
    const newCompletedState = !assessment.is_completed

    const { error } = await supabase
      .from('assessments')
      .update({ is_completed: newCompletedState })
      .eq('id', assessment.id)

    if (!error) {
      onAssessmentsChange(assessments.map(a => 
        a.id === assessment.id ? { ...a, is_completed: newCompletedState } : a
      ))

      // Sync all linked tasks
      const linkedTasks = availableTasks.filter(t => t.linked_assessment_id === assessment.id)
      if (linkedTasks.length > 0) {
        await supabase
          .from('tasks')
          .update({ is_completed: newCompletedState })
          .in('id', linkedTasks.map(t => t.id))
        
        fetchAvailableTasks()
      }
    }
  }

  const handleUnlinkTask = async (assessment: Assessment, taskId: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('tasks')
      .update({ linked_assessment_id: null })
      .eq('id', taskId)

    if (!error) {
      fetchAvailableTasks()
    }
  }

  const handleDelete = async (assessment: Assessment) => {
    const supabase = createClient()

    // Unlink all tasks first
    await supabase
      .from('tasks')
      .update({ linked_assessment_id: null })
      .eq('linked_assessment_id', assessment.id)

    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', assessment.id)

    if (!error) {
      onAssessmentsChange(assessments.filter(a => a.id !== assessment.id))
      fetchAvailableTasks()
    }
  }

  const handleCancel = () => {
    resetForm()
    setAdding(false)
  }

  const handleAddTaskToLink = (taskId: string) => {
    if (taskId && !linkedTaskIds.includes(taskId)) {
      setLinkedTaskIds([...linkedTaskIds, taskId])
    }
  }

  const handleRemoveTaskFromLink = (taskId: string) => {
    setLinkedTaskIds(linkedTaskIds.filter(id => id !== taskId))
  }

  // Get tasks that aren't already linked to OTHER assessments (allow current editing assessment's tasks)
  const getUnlinkedTasks = () => {
    return availableTasks.filter(t => 
      !t.linked_assessment_id || 
      t.linked_assessment_id === editing?.id ||
      linkedTaskIds.includes(t.id)
    )
  }

  // Get tasks linked to a specific assessment
  const getLinkedTasks = (assessmentId: string) => {
    return availableTasks.filter(t => t.linked_assessment_id === assessmentId)
  }

  // Calculate stats - ONLY from completed assessments
  const completedAssessments = assessments.filter(a => a.is_completed)
  const incompleteAssessments = assessments.filter(a => !a.is_completed)
  const totalAssessments = assessments.length
  const assessmentsWithPercentage = completedAssessments.filter(a => a.percentage !== null)
  const averagePercentage = assessmentsWithPercentage.length > 0
    ? Math.round(assessmentsWithPercentage.reduce((sum, a) => sum + (a.percentage || 0), 0) / assessmentsWithPercentage.length)
    : null
  const highestScore = assessmentsWithPercentage.length > 0
    ? Math.max(...assessmentsWithPercentage.map(a => a.percentage || 0))
    : null
  const lowestScore = assessmentsWithPercentage.length > 0
    ? Math.min(...assessmentsWithPercentage.map(a => a.percentage || 0))
    : null

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreIcon = (percentage: number) => {
    if (percentage >= 80) return <TrendingUp className="h-3 w-3 text-green-600" />
    if (percentage >= 60) return <Minus className="h-3 w-3 text-amber-600" />
    return <TrendingDown className="h-3 w-3 text-red-600" />
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {assessments.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-2">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-lg font-bold">{completedAssessments.length}/{totalAssessments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <p className="text-sm text-muted-foreground">Average</p>
              <p className={`text-lg font-bold ${averagePercentage ? getScoreColor(averagePercentage) : ''}`}>
                {averagePercentage !== null ? `${averagePercentage}%` : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <p className="text-sm text-muted-foreground">Highest</p>
              <p className={`text-lg font-bold ${highestScore ? getScoreColor(highestScore) : ''}`}>
                {highestScore !== null ? `${highestScore}%` : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <p className="text-sm text-muted-foreground">Lowest</p>
              <p className={`text-lg font-bold ${lowestScore ? getScoreColor(lowestScore) : ''}`}>
                {lowestScore !== null ? `${lowestScore}%` : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Form */}
      {adding ? (
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="font-semibold text-sm">{editing ? 'Edit Assessment' : 'Add Assessment'}</h3>
            
            {/* Row 1: Title and Type */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-sm">Title</Label>
                <Input
                  placeholder="e.g. Unit 3 Test"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Type</Label>
                <Select value={type} onValueChange={(v: Assessment['type']) => setType(v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Score, Max, Weight, Date */}
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-sm">Score</Label>
                <Input
                  type="number"
                  placeholder="85"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Max</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Weight %</Label>
                <Input
                  type="number"
                  placeholder="20"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm px-2">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {date ? format(date, 'M/d') : 'Pick'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 3: Completed */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_completed"
                checked={isCompleted}
                onCheckedChange={(checked) => setIsCompleted(checked as boolean)}
              />
              <Label htmlFor="is_completed" className="text-sm">
                Completed (include in grade calculation)
              </Label>
            </div>

            {/* Row 4: Link Tasks */}
            <div className="space-y-2 p-2 border rounded-lg bg-muted/50">
              <Label className="text-sm flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                Link Tasks ({linkedTaskIds.length})
              </Label>
              
              {/* Selected Tasks */}
              {linkedTaskIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {linkedTaskIds.map(taskId => {
                    const task = availableTasks.find(t => t.id === taskId)
                    if (!task) return null
                    return (
                      <Badge key={taskId} variant="secondary" className="text-sm flex items-center gap-1">
                        {task.title}
                        <button 
                          onClick={() => handleRemoveTaskFromLink(taskId)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
              
              {/* Add Task Dropdown */}
              <Select onValueChange={handleAddTaskToLink} value="">
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Add a task..." />
                </SelectTrigger>
                <SelectContent>
                  {getUnlinkedTasks()
                    .filter(t => !linkedTaskIds.includes(t.id))
                    .map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                        {task.due_date && ` (${format(new Date(task.due_date), 'MMM d')})`}
                      </SelectItem>
                    ))}
                  {getUnlinkedTasks().filter(t => !linkedTaskIds.includes(t.id)).length === 0 && (
                    <SelectItem value="none" disabled>No tasks available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              <p className="text-sm text-muted-foreground">
                Linked tasks will sync completion status with this assessment
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!title} size="sm" className="text-sm h-9">
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel} size="sm" className="text-sm h-9">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between">
          <Button onClick={handleAdd} size="sm" className="text-sm h-9">
            <Plus className="h-3 w-3 mr-1" />
            Add Assessment
          </Button>
          {incompleteAssessments.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Show pending</Label>
              <Checkbox checked={showIncomplete} onCheckedChange={(v) => setShowIncomplete(v as boolean)} />
            </div>
          )}
        </div>
      )}

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">No assessments logged yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Track your tests, IAs, and assignments here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending Assessments */}
          {showIncomplete && incompleteAssessments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending ({incompleteAssessments.length})
              </h4>
              {incompleteAssessments
                .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
                .map(assessment => (
                  <AssessmentCard
                    key={assessment.id}
                    assessment={assessment}
                    linkedTasks={getLinkedTasks(assessment.id)}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onUnlinkTask={handleUnlinkTask}
                    getScoreColor={getScoreColor}
                    getScoreIcon={getScoreIcon}
                  />
                ))}
            </div>
          )}

          {/* Completed Assessments */}
          {completedAssessments.length > 0 && (
            <div className="space-y-2">
              {showIncomplete && incompleteAssessments.length > 0 && (
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mt-4">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed ({completedAssessments.length})
                </h4>
              )}
              {completedAssessments
                .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                .map(assessment => (
                  <AssessmentCard
                    key={assessment.id}
                    assessment={assessment}
                    linkedTasks={getLinkedTasks(assessment.id)}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onUnlinkTask={handleUnlinkTask}
                    getScoreColor={getScoreColor}
                    getScoreIcon={getScoreIcon}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Assessment Card Component
function AssessmentCard({
  assessment,
  linkedTasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onUnlinkTask,
  getScoreColor,
  getScoreIcon,
}: {
  assessment: Assessment
  linkedTasks: Task[]
  onToggleComplete: (assessment: Assessment) => void
  onEdit: (assessment: Assessment) => void
  onDelete: (assessment: Assessment) => void
  onUnlinkTask: (assessment: Assessment, taskId: string) => void
  getScoreColor: (percentage: number) => string
  getScoreIcon: (percentage: number) => React.ReactNode
}) {
  return (
    <div
      className={`p-2 border rounded-lg hover:bg-muted/50 transition-colors ${
        !assessment.is_completed ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={() => onToggleComplete(assessment)}>
            {assessment.is_completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          
          {assessment.is_completed && assessment.percentage !== null && getScoreIcon(assessment.percentage)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <p className="font-medium text-sm truncate">
                {assessment.title}
              </p>
              <Badge variant="outline" className="text-sm shrink-0">
                {ASSESSMENT_TYPES.find(t => t.value === assessment.type)?.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              {assessment.is_completed && assessment.score !== null && (
                <span>{assessment.score}/{assessment.max_score}</span>
              )}
              {assessment.date && (
                <span>{format(new Date(assessment.date), 'MMM d')}</span>
              )}
              {!assessment.is_completed && (
                <span className="text-amber-600">Not graded</span>
              )}
            </div>
          </div>
          
          {assessment.is_completed && assessment.percentage !== null && (
            <p className={`text-lg font-bold shrink-0 ${getScoreColor(assessment.percentage)}`}>
              {assessment.percentage}%
            </p>
          )}
        </div>
        
        <div className="flex gap-0.5 ml-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(assessment)} className="h-7 w-7">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(assessment)} className="h-7 w-7">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Linked Tasks */}
      {linkedTasks.length > 0 && (
        <div className="mt-2 pt-2 border-t flex flex-wrap gap-1">
          <span className="text-sm text-muted-foreground flex items-center gap-0.5">
            <LinkIcon className="h-3 w-3" />
            Linked:
          </span>
          {linkedTasks.map(task => (
            <Badge key={task.id} variant="secondary" className="text-sm flex items-center gap-1">
              {task.is_completed && <CheckCircle2 className="h-2 w-2 text-green-600" />}
              {task.title}
              <button 
                onClick={() => onUnlinkTask(assessment, task.id)}
                className="hover:text-destructive ml-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
