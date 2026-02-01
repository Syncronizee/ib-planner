'use client'

import { useState } from 'react'
import { Subject, Assessment, ASSESSMENT_TYPES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Minus
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
  
  const [title, setTitle] = useState('')
  const [type, setType] = useState<Assessment['type']>('test')
  const [score, setScore] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState('')

  const router = useRouter()

  const resetForm = () => {
    setTitle('')
    setType('test')
    setScore('')
    setMaxScore('100')
    setWeight('')
    setDate(undefined)
    setNotes('')
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
      }
    }

    resetForm()
    setAdding(false)
    router.refresh()
  }

  const handleDelete = async (assessment: Assessment) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', assessment.id)

    if (!error) {
      onAssessmentsChange(assessments.filter(a => a.id !== assessment.id))
    }
  }

  const handleCancel = () => {
    resetForm()
    setAdding(false)
  }

  // Calculate stats
  const totalAssessments = assessments.length
  const averagePercentage = assessments.length > 0
    ? Math.round(assessments.filter(a => a.percentage !== null).reduce((sum, a) => sum + (a.percentage || 0), 0) / assessments.filter(a => a.percentage !== null).length)
    : null
  const highestScore = assessments.length > 0
    ? Math.max(...assessments.filter(a => a.percentage !== null).map(a => a.percentage || 0))
    : null
  const lowestScore = assessments.length > 0
    ? Math.min(...assessments.filter(a => a.percentage !== null).map(a => a.percentage || 0))
    : null

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreIcon = (percentage: number) => {
    if (percentage >= 80) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (percentage >= 60) return <Minus className="h-4 w-4 text-amber-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {assessments.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{totalAssessments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Average</p>
              <p className={`text-2xl font-bold ${averagePercentage ? getScoreColor(averagePercentage) : ''}`}>
                {averagePercentage !== null ? `${averagePercentage}%` : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Highest</p>
              <p className={`text-2xl font-bold ${highestScore ? getScoreColor(highestScore) : ''}`}>
                {highestScore !== null ? `${highestScore}%` : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Lowest</p>
              <p className={`text-2xl font-bold ${lowestScore ? getScoreColor(lowestScore) : ''}`}>
                {lowestScore !== null ? `${lowestScore}%` : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Form */}
      {adding ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold">{editing ? 'Edit Assessment' : 'Add Assessment'}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Unit 3 Test, IA Draft 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger>
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

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Score</Label>
                <Input
                  type="number"
                  placeholder="85"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Score</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Weight %</Label>
                <Input
                  type="number"
                  placeholder="20"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'MMM d') : 'Pick'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this assessment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!title}>Save</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Assessment
        </Button>
      )}

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No assessments logged yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Track your tests, IAs, and assignments here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assessments
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
            .map(assessment => (
              <div
                key={assessment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {assessment.percentage !== null && getScoreIcon(assessment.percentage)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{assessment.title}</p>
                      <Badge variant="outline" className="shrink-0">
                        {ASSESSMENT_TYPES.find(t => t.value === assessment.type)?.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      {assessment.score !== null && (
                        <span>{assessment.score}/{assessment.max_score}</span>
                      )}
                      {assessment.weight && (
                        <span>Weight: {assessment.weight}%</span>
                      )}
                      {assessment.date && (
                        <span>{format(new Date(assessment.date), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                  {assessment.percentage !== null && (
                    <p className={`text-2xl font-bold shrink-0 ${getScoreColor(assessment.percentage)}`}>
                      {assessment.percentage}%
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(assessment)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(assessment)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}