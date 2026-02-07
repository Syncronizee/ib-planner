'use client'

import { useState } from 'react'
import { Subject, Assessment, ASSESSMENT_TYPES, TASK_CATEGORIES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
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
  Circle
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
  
  const [title, setTitle] = useState('')
  const [type, setType] = useState<Assessment['type']>('test')
  const [score, setScore] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)
  const [createTask, setCreateTask] = useState(true)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  const router = useRouter()

  const resetForm = () => {
    setTitle('')
    setType('test')
    setScore('')
    setMaxScore('100')
    setWeight('')
    setDate(undefined)
    setNotes('')
    setIsCompleted(false)
    setCreateTask(true)
    setDueDate(undefined)
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
    setCreateTask(false) // Don't create new task when editing
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

    let linkedTaskId = editing?.linked_task_id || null

    // Create linked task if requested (only for new assessments)
    if (createTask && !editing && dueDate) {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user?.id,
          title: `${title} - ${subject.name}`,
          description: notes || null,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          is_completed: false,
          priority: 'high',
          subject_id: subject.id,
          category: 'assessment',
        })
        .select()
        .single()

      if (!taskError && taskData) {
        linkedTaskId = taskData.id
      }
    }

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
      linked_task_id: linkedTaskId,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('assessments')
        .update(assessmentData)
        .eq('id', editing.id)
        .select()
        .single()

      if (!error && data) {
        onAssessmentsChange(assessments.map(a => a.id === editing.id ? data : a))

        // Update linked task completion status if exists
        if (data.linked_task_id) {
          await supabase
            .from('tasks')
            .update({ is_completed: isCompleted })
            .eq('id', data.linked_task_id)
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

        // Update task with linked assessment id
        if (linkedTaskId) {
          await supabase
            .from('tasks')
            .update({ linked_assessment_id: data.id })
            .eq('id', linkedTaskId)
        }
      }
    }

    resetForm()
    setAdding(false)
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

      // Update linked task if exists
      if (assessment.linked_task_id) {
        await supabase
          .from('tasks')
          .update({ is_completed: newCompletedState })
          .eq('id', assessment.linked_task_id)
      }
    }

    router.refresh()
  }

  const handleDelete = async (assessment: Assessment) => {
    const supabase = createClient()

    // Delete linked task first if exists
    if (assessment.linked_task_id) {
      await supabase
        .from('tasks')
        .delete()
        .eq('id', assessment.linked_task_id)
    }

    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', assessment.id)

    if (!error) {
      onAssessmentsChange(assessments.filter(a => a.id !== assessment.id))
    }

    router.refresh()
  }

  const handleCancel = () => {
    resetForm()
    setAdding(false)
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
    if (percentage >= 80) return <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
    if (percentage >= 60) return <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
    return <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
  }

  const displayedAssessments = showIncomplete 
    ? assessments 
    : completedAssessments

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats - Only from completed assessments */}
      {assessments.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-2 sm:pt-4 sm:p-4">
              <p className="text-[10px] sm:text-sm text-muted-foreground">Completed</p>
              <p className="text-lg sm:text-2xl font-bold">{completedAssessments.length}/{totalAssessments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 sm:pt-4 sm:p-4">
              <p className="text-[10px] sm:text-sm text-muted-foreground">Average</p>
              <p className={`text-lg sm:text-2xl font-bold ${averagePercentage ? getScoreColor(averagePercentage) : ''}`}>
                {averagePercentage !== null ? `${averagePercentage}%` : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 sm:pt-4 sm:p-4">
              <p className="text-[10px] sm:text-sm text-muted-foreground">Highest</p>
              <p className={`text-lg sm:text-2xl font-bold ${highestScore ? getScoreColor(highestScore) : ''}`}>
                {highestScore !== null ? `${highestScore}%` : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 sm:pt-4 sm:p-4">
              <p className="text-[10px] sm:text-sm text-muted-foreground">Lowest</p>
              <p className={`text-lg sm:text-2xl font-bold ${lowestScore ? getScoreColor(lowestScore) : ''}`}>
                {lowestScore !== null ? `${lowestScore}%` : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Form */}
      {adding ? (
        <Card>
          <CardContent className="p-3 sm:p-4 space-y-3">
            <h3 className="font-semibold text-sm sm:text-base">{editing ? 'Edit Assessment' : 'Add Assessment'}</h3>
            
            {/* Row 1: Title and Type */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Title</Label>
                <Input
                  placeholder="e.g. Unit 3 Test"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger className="h-8 text-xs">
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
                <Label className="text-xs">Score</Label>
                <Input
                  type="number"
                  placeholder="85"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Weight %</Label>
                <Input
                  type="number"
                  placeholder="20"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs px-2">
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

            {/* Row 3: Completed toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_completed"
                  checked={isCompleted}
                  onCheckedChange={(checked) => setIsCompleted(checked as boolean)}
                />
                <Label htmlFor="is_completed" className="text-xs">
                  Completed (include in grade calculation)
                </Label>
              </div>
            </div>

            {/* Row 4: Create Task toggle (only for new assessments) */}
            {!editing && (
              <div className="space-y-2 p-2 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Add to Tasks/Deadlines</Label>
                  <Switch checked={createTask} onCheckedChange={setCreateTask} />
                </div>
                {createTask && (
                  <div className="space-y-1">
                    <Label className="text-xs">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dueDate ? format(dueDate, 'PPP') : 'Select due date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={!title} size="sm" className="text-xs h-8">
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel} size="sm" className="text-xs h-8">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between">
          <Button onClick={handleAdd} size="sm" className="text-xs h-8">
            <Plus className="h-3 w-3 mr-1" />
            Add Assessment
          </Button>
          {incompleteAssessments.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Show pending</Label>
              <Switch checked={showIncomplete} onCheckedChange={setShowIncomplete} />
            </div>
          )}
        </div>
      )}

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">No assessments logged yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Track your tests, IAs, and assignments here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending Assessments */}
          {showIncomplete && incompleteAssessments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending ({incompleteAssessments.length})
              </h4>
              {incompleteAssessments
                .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
                .map(assessment => (
                  <AssessmentCard
                    key={assessment.id}
                    assessment={assessment}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
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
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-4">
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
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
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
  onToggleComplete,
  onEdit,
  onDelete,
  getScoreColor,
  getScoreIcon,
}: {
  assessment: Assessment
  onToggleComplete: (assessment: Assessment) => void
  onEdit: (assessment: Assessment) => void
  onDelete: (assessment: Assessment) => void
  getScoreColor: (percentage: number) => string
  getScoreIcon: (percentage: number) => React.ReactNode
}) {
  return (
    <div
      className={`flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors ${
        !assessment.is_completed ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' : ''
      }`}
    >
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
          <div className="flex items-center gap-1">
            <p className={`font-medium text-xs truncate ${!assessment.is_completed ? '' : ''}`}>
              {assessment.title}
            </p>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {ASSESSMENT_TYPES.find(t => t.value === assessment.type)?.label}
            </Badge>
            {assessment.linked_task_id && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                <Clock className="h-2 w-2 mr-0.5" />
                Task
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
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
  )
}
