'use client'

import { useState } from 'react'
import { Subject, GradeHistory, IB_GRADES, SUBJECT_COLORS } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
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
  GraduationCap, 
  Target, 
  TrendingUp,
  Plus,
  Trash2,
  CalendarIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface GradesTabProps {
  subject: Subject
  gradeHistory: GradeHistory[]
  onSubjectUpdate: (subject: Subject) => void
  onGradeHistoryChange: (history: GradeHistory[]) => void
}

export function GradesTab({ 
  subject, 
  gradeHistory,
  onSubjectUpdate,
  onGradeHistoryChange 
}: GradesTabProps) {
  const [editing, setEditing] = useState(false)
  const [currentGrade, setCurrentGrade] = useState<number | null>(subject.current_grade)
  const [predictedGrade, setPredictedGrade] = useState<number | null>(subject.predicted_grade)
  const [targetGrade, setTargetGrade] = useState<number | null>(subject.target_grade)
  const [confidence, setConfidence] = useState(subject.confidence)
  
  const [addingHistory, setAddingHistory] = useState(false)
  const [historyGrade, setHistoryGrade] = useState<number>(4)
  const [historyType, setHistoryType] = useState<GradeHistory['grade_type']>('current')
  const [historyLabel, setHistoryLabel] = useState('')
  const [historyDate, setHistoryDate] = useState<Date>(new Date())

  const router = useRouter()
  const colorClass = SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-slate-500'
  const confidenceLabels = ['', 'Struggling', 'Needs Work', 'Okay', 'Good', 'Confident']

  const handleSaveGrades = async () => {
    const supabase = createClient()

    const updateData = {
      current_grade: currentGrade,
      predicted_grade: predictedGrade,
      target_grade: targetGrade,
      confidence,
    }

    const { error } = await supabase
      .from('subjects')
      .update(updateData)
      .eq('id', subject.id)

    if (!error) {
      onSubjectUpdate({ ...subject, ...updateData })
      setEditing(false)
    }

    router.refresh()
  }

  const handleAddHistory = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('grade_history')
      .insert({
        user_id: user?.id,
        subject_id: subject.id,
        grade: historyGrade,
        grade_type: historyType,
        label: historyLabel || null,
        date: format(historyDate, 'yyyy-MM-dd'),
      })
      .select()
      .single()

    if (!error && data) {
      onGradeHistoryChange([data, ...gradeHistory])
      setAddingHistory(false)
      setHistoryLabel('')
      setHistoryGrade(4)
      setHistoryType('current')
      setHistoryDate(new Date())
    }

    router.refresh()
  }

  const handleDeleteHistory = async (id: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('grade_history')
      .delete()
      .eq('id', id)

    if (!error) {
      onGradeHistoryChange(gradeHistory.filter(h => h.id !== id))
    }
  }

  // Calculate grade gap
  const gradeGap = targetGrade && currentGrade ? targetGrade - currentGrade : null

  return (
    <div className="space-y-6">
      {/* Current Grades */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Current Grades</h3>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveGrades}>Save</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <GraduationCap className="h-4 w-4" />
                <span className="text-sm">Current</span>
              </div>
              {editing ? (
                <Select 
                  value={currentGrade?.toString() || 'none'} 
                  onValueChange={(v) => setCurrentGrade(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {IB_GRADES.map(g => (
                      <SelectItem key={g.value} value={g.value.toString()}>{g.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-3xl font-bold">{currentGrade ?? '-'}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Predicted</span>
              </div>
              {editing ? (
                <Select 
                  value={predictedGrade?.toString() || 'none'} 
                  onValueChange={(v) => setPredictedGrade(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {IB_GRADES.map(g => (
                      <SelectItem key={g.value} value={g.value.toString()}>{g.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-3xl font-bold">{predictedGrade ?? '-'}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Target className="h-4 w-4" />
                <span className="text-sm">Target</span>
              </div>
              {editing ? (
                <Select 
                  value={targetGrade?.toString() || 'none'} 
                  onValueChange={(v) => setTargetGrade(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {IB_GRADES.map(g => (
                      <SelectItem key={g.value} value={g.value.toString()}>{g.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-3xl font-bold">{targetGrade ?? '-'}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grade gap indicator */}
        {gradeGap !== null && gradeGap !== 0 && (
          <div className={`mt-4 p-3 rounded-lg ${gradeGap > 0 ? 'bg-amber-50 dark:bg-amber-950' : 'bg-green-50 dark:bg-green-950'}`}>
            <p className="text-sm">
              {gradeGap > 0 
                ? `📈 ${gradeGap} grade${gradeGap > 1 ? 's' : ''} to reach your target`
                : `🎉 You're ${Math.abs(gradeGap)} grade${Math.abs(gradeGap) > 1 ? 's' : ''} above your target!`
              }
            </p>
          </div>
        )}

        {/* Confidence */}
        <div className="mt-4 space-y-2">
          <Label>Confidence: {confidenceLabels[confidence]}</Label>
          {editing ? (
            <Slider
              value={[confidence]}
              onValueChange={(v) => setConfidence(v[0])}
              min={1}
              max={5}
              step={1}
            />
          ) : (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`flex-1 h-3 rounded-sm ${
                    level <= confidence ? colorClass : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grade History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Grade History</h3>
          <Button variant="outline" size="sm" onClick={() => setAddingHistory(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        </div>

        {addingHistory && (
          <Card className="mb-4">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select 
                    value={historyGrade.toString()} 
                    onValueChange={(v) => setHistoryGrade(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IB_GRADES.map(g => (
                        <SelectItem key={g.value} value={g.value.toString()}>{g.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={historyType} 
                    onValueChange={(v: any) => setHistoryType(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Grade</SelectItem>
                      <SelectItem value="predicted">Predicted Grade</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Label (optional)</Label>
                  <Input
                    placeholder="e.g. Semester 1"
                    value={historyLabel}
                    onChange={(e) => setHistoryLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(historyDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={historyDate}
                        onSelect={(d) => d && setHistoryDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddHistory}>Save</Button>
                <Button variant="outline" onClick={() => setAddingHistory(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {gradeHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No grade history yet. Track your progress over time!
          </p>
        ) : (
          <div className="space-y-2">
            {gradeHistory.map((entry) => (
              <div 
                key={entry.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-white font-bold`}>
                    {entry.grade}
                  </div>
                  <div>
                    <p className="font-medium">
                      {entry.label || entry.grade_type.charAt(0).toUpperCase() + entry.grade_type.slice(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteHistory(entry.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}