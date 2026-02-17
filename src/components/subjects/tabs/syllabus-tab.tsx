'use client'

import { useState } from 'react'
import { Subject, SyllabusTopic, SUBJECT_COLORS } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { 
  Plus, 
  Pencil, 
  Trash2,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SyllabusTabProps {
  subject: Subject
  topics: SyllabusTopic[]
  onTopicsChange: (topics: SyllabusTopic[]) => void
}

export function SyllabusTab({ subject, topics, onTopicsChange }: SyllabusTabProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SyllabusTopic | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<number[]>([])
  
  const [topicName, setTopicName] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [confidence, setConfidence] = useState(3)
  const [notes, setNotes] = useState('')

  const router = useRouter()
  const colorClass = SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-slate-500'

  const resetForm = () => {
    setTopicName('')
    setUnitNumber('')
    setConfidence(3)
    setNotes('')
    setEditing(null)
  }

  const handleAdd = () => {
    resetForm()
    setAdding(true)
  }

  const handleEdit = (topic: SyllabusTopic) => {
    setEditing(topic)
    setTopicName(topic.topic_name)
    setUnitNumber(topic.unit_number?.toString() || '')
    setConfidence(topic.confidence)
    setNotes(topic.notes || '')
    setAdding(true)
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const topicData = {
      topic_name: topicName,
      unit_number: unitNumber ? parseInt(unitNumber) : null,
      confidence,
      notes: notes || null,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('syllabus_topics')
        .update(topicData)
        .eq('id', editing.id)
        .select()
        .single()

      if (!error && data) {
        onTopicsChange(topics.map(t => t.id === editing.id ? data : t))
      }
    } else {
      const { data, error } = await supabase
        .from('syllabus_topics')
        .insert({
          ...topicData,
          user_id: user?.id,
          subject_id: subject.id,
          is_completed: false,
        })
        .select()
        .single()

      if (!error && data) {
        onTopicsChange([...topics, data])
      }
    }

    resetForm()
    setAdding(false)
    router.refresh()
  }

  const handleToggleComplete = async (topic: SyllabusTopic) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('syllabus_topics')
      .update({ is_completed: !topic.is_completed })
      .eq('id', topic.id)

    if (!error) {
      onTopicsChange(topics.map(t => t.id === topic.id ? { ...t, is_completed: !t.is_completed } : t))
    }
  }

  const handleDelete = async (topic: SyllabusTopic) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('syllabus_topics')
      .delete()
      .eq('id', topic.id)

    if (!error) {
      onTopicsChange(topics.filter(t => t.id !== topic.id))
    }
  }

  const handleCancel = () => {
    resetForm()
    setAdding(false)
  }

  const toggleUnit = (unit: number) => {
    setExpandedUnits(prev => 
      prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
    )
  }

  // Calculate progress
  const completedCount = topics.filter(t => t.is_completed).length
  const totalCount = topics.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Group by unit
  const units = [...new Set(topics.map(t => t.unit_number || 0))].sort((a, b) => a - b)
  const topicsByUnit = units.map(unit => ({
    unit,
    topics: topics.filter(t => (t.unit_number || 0) === unit)
  }))

  const confidenceLabels = ['', 'Struggling', 'Needs Work', 'Okay', 'Good', 'Confident']

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      {topics.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Syllabus Progress</h3>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{totalCount} topics ({progressPercentage}%)
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {adding ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold">{editing ? 'Edit Topic' : 'Add Topic'}</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Topic Name</Label>
                <Input
                  placeholder="e.g. Differentiation, Organic Chemistry"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Number</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confidence: {confidenceLabels[confidence]}</Label>
              <Slider
                value={[confidence]}
                onValueChange={(v) => setConfidence(v[0])}
                min={1}
                max={5}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this topic..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!topicName}>Save</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Topic
        </Button>
      )}

      {/* Topics List */}
      {topics.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No syllabus topics added yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Add topics to track your progress through the course.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topicsByUnit.map(({ unit, topics: unitTopics }) => (
            <div key={unit} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleUnit(unit)}
                className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {unit === 0 ? 'No Unit' : `Unit ${unit}`}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {unitTopics.filter(t => t.is_completed).length}/{unitTopics.length} completed
                  </span>
                </div>
                {expandedUnits.includes(unit) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              {expandedUnits.includes(unit) && (
                <div className="divide-y">
                  {unitTopics.map(topic => (
                    <div
                      key={topic.id}
                      className={`flex items-center gap-4 p-4 ${topic.is_completed ? 'bg-green-50/50 dark:bg-green-950/20' : ''}`}
                    >
                      <button onClick={() => handleToggleComplete(topic)}>
                        {topic.is_completed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${topic.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {topic.topic_name}
                        </p>
                        {topic.notes && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {topic.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`w-2 h-4 rounded-sm ${
                                level <= topic.confidence ? colorClass : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(topic)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(topic)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
