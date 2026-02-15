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
    <div className="space-y-4 sm:space-y-6">
      {/* Current Grades */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-base">Current Grades</h3>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="text-sm h-8 sm:h-9">
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="text-sm h-8 sm:h-9">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveGrades} className="text-sm h-8 sm:h-9">
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card>
            <CardContent className="pt-3 sm:pt-4 p-2 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground mb-1 sm:mb-2">
                <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-sm">Current</span>
              </div>
              {editing ? (
                <Select 
                  value={currentGrade?.toString() || 'none'} 
                  onValueChange={(v) => setCurrentGrade(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger className="h-8 sm:h-10 text-sm">
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
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{currentGrade ?? '-'}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-3 sm:pt-4 p-2 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground mb-1 sm:mb-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-sm">Predicted</span>
              </div>
              {editing ? (
                <Select 
                  value={predictedGrade?.toString() || 'none'} 
                  onValueChange={(v) => setPredictedGrade(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger className="h-8 sm:h-10 text-sm">
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
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{predictedGrade ?? '-'}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-3 sm:pt-4 p-2 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground mb-1 sm:mb-2">
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-sm">Target</span>
              </div>
              {editing ? (
                <Select 
                  value={targetGrade?.toString() || 'none'} 
                  onValueChange={(v) => setTargetGrade(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger className="h-8 sm:h-10 text-sm">
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
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{targetGrade ?? '-'}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grade gap indicator */}
        {gradeGap !== null && gradeGap !== 0 && (
          <div className={`mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg ${gradeGap > 0 ? 'bg-amber-50 dark:bg-amber-950' : 'bg-green-50 dark:bg-green-950'}`}>
            <p className="text-sm">
              {gradeGap > 0 
                ? `📈 ${gradeGap} grade${gradeGap > 1 ? 's' : ''} to reach your target`
                : `🎉 You're ${Math.abs(gradeGap)} grade${Math.abs(gradeGap) > 1 ? 's' : ''} above your target!`
              }
            </p>
          </div>
        )}

        {/* Confidence */}
        <div className="mt-3 sm:mt-4 space-y-2">
          <Label className="text-sm">Confidence: {confidenceLabels[confidence]}</Label>
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
                  className={`flex-1 h-2 sm:h-3 rounded-sm ${
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
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-base">Grade History</h3>
          {!addingHistory && (
            <Button variant="outline" size="sm" onClick={() => setAddingHistory(true)} className="text-sm h-8 sm:h-9">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Add Entry
            </Button>
          )}
        </div>

        {addingHistory && (
          <Card className="mb-3 sm:mb-4">
            <CardContent className="pt-3 sm:pt-4 p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-sm">Grade</Label>
                  <Select 
                    value={historyGrade.toString()} 
                    onValueChange={(v) => setHistoryGrade(parseInt(v))}
                  >
                    <SelectTrigger className="h-8 sm:h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IB_GRADES.map(g => (
                        <SelectItem key={g.value} value={g.value.toString()}>{g.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-sm">Type</Label>
                  <Select 
                    value={historyType} 
                    onValueChange={(v: GradeHistory['grade_type']) => setHistoryType(v)}
                  >
                    <SelectTrigger className="h-8 sm:h-10 text-sm">
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

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-sm">Label (optional)</Label>
                  <Input
                    placeholder="e.g. Semester 1"
                    value={historyLabel}
                    onChange={(e) => setHistoryLabel(e.target.value)}
                    className="h-8 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-sm">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-8 sm:h-10 text-sm">
                        <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        {format(historyDate, 'MMM d')}
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
                <Button onClick={handleAddHistory} size="sm" className="text-sm h-8 sm:h-9">
                  Save
                </Button>
                <Button variant="outline" onClick={() => setAddingHistory(false)} size="sm" className="text-sm h-8 sm:h-9">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {gradeHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 sm:py-8">
            No grade history yet. Track your progress over time!
          </p>
        ) : (
          <div className="space-y-2">
            {gradeHistory.map((entry) => (
              <div 
                key={entry.id}
                className="flex items-center justify-between p-2 sm:p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${colorClass} flex items-center justify-center text-white font-bold text-base`}>
                    {entry.grade}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {entry.label || entry.grade_type.charAt(0).toUpperCase() + entry.grade_type.slice(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteHistory(entry.id)} className="h-7 w-7 sm:h-8 sm:w-8">
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}