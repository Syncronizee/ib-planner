'use client'

import { useState } from 'react'
import { Subject, WeaknessTag, WEAKNESS_TYPES } from '@/lib/types'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Pencil, 
  Trash2,
  CheckCircle,
  Circle,
  Brain,
  BookOpen,
  AlertTriangle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WeaknessesTabProps {
  subject: Subject
  weaknesses: WeaknessTag[]
  onWeaknessesChange: (weaknesses: WeaknessTag[]) => void
}

export function WeaknessesTab({ subject, weaknesses, onWeaknessesChange }: WeaknessesTabProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<WeaknessTag | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'content' | 'logic'>('all')
  
  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [weaknessType, setWeaknessType] = useState<'content' | 'logic'>('content')

  const router = useRouter()

  const resetForm = () => {
    setTag('')
    setDescription('')
    setWeaknessType('content')
    setEditing(null)
  }

  const handleAdd = () => {
    resetForm()
    setAdding(true)
  }

  const handleEdit = (weakness: WeaknessTag) => {
    setEditing(weakness)
    setTag(weakness.tag)
    setDescription(weakness.description || '')
    setWeaknessType(weakness.weakness_type || 'content')
    setAdding(true)
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const weaknessData = {
      tag,
      description: description || null,
      weakness_type: weaknessType,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('weakness_tags')
        .update(weaknessData)
        .eq('id', editing.id)
        .select()
        .single()

      if (!error && data) {
        onWeaknessesChange(weaknesses.map(w => w.id === editing.id ? data : w))
      }
    } else {
      const { data, error } = await supabase
        .from('weakness_tags')
        .insert({
          ...weaknessData,
          user_id: user?.id,
          subject_id: subject.id,
          is_resolved: false,
        })
        .select()
        .single()

      if (!error && data) {
        onWeaknessesChange([data, ...weaknesses])
      }
    }

    resetForm()
    setAdding(false)
    router.refresh()
  }

  const handleToggleResolved = async (weakness: WeaknessTag) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('weakness_tags')
      .update({ is_resolved: !weakness.is_resolved })
      .eq('id', weakness.id)

    if (!error) {
      onWeaknessesChange(weaknesses.map(w => w.id === weakness.id ? { ...w, is_resolved: !w.is_resolved } : w))
    }
  }

  const handleDelete = async (weakness: WeaknessTag) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('weakness_tags')
      .delete()
      .eq('id', weakness.id)

    if (!error) {
      onWeaknessesChange(weaknesses.filter(w => w.id !== weakness.id))
    }
  }

  const handleCancel = () => {
    resetForm()
    setAdding(false)
  }

  // Filter and group
  const filteredWeaknesses = weaknesses.filter(w => 
    filterType === 'all' || w.weakness_type === filterType
  )
  const unresolvedWeaknesses = filteredWeaknesses.filter(w => !w.is_resolved)
  const resolvedWeaknesses = filteredWeaknesses.filter(w => w.is_resolved)

  const contentCount = weaknesses.filter(w => w.weakness_type === 'content' && !w.is_resolved).length
  const logicCount = weaknesses.filter(w => w.weakness_type === 'logic' && !w.is_resolved).length

  const getTypeIcon = (type: 'content' | 'logic') => {
    return type === 'content' 
      ? <BookOpen className="h-4 w-4" />
      : <Brain className="h-4 w-4" />
  }

  const getTypeBadgeColor = (type: 'content' | 'logic') => {
    return type === 'content'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {weaknesses.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Unresolved</span>
              </div>
              <p className="text-2xl font-bold mt-1">{unresolvedWeaknesses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Content</span>
              </div>
              <p className="text-2xl font-bold mt-1">{contentCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Logic</span>
              </div>
              <p className="text-2xl font-bold mt-1">{logicCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Form */}
      {adding ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold">{editing ? 'Edit Weakness' : 'Add Weakness'}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weakness</Label>
                <Input
                  placeholder="e.g. Integration by parts"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={weaknessType} onValueChange={(v: any) => setWeaknessType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEAKNESS_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          {t.value === 'content' ? <BookOpen className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Describe what specifically you struggle with..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!tag}>Save</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Weakness
        </Button>
      )}

      {/* Filter Tabs */}
      {weaknesses.length > 0 && (
        <Tabs value={filterType} onValueChange={(v: any) => setFilterType(v)}>
          <TabsList>
            <TabsTrigger value="all">All ({weaknesses.filter(w => !w.is_resolved).length})</TabsTrigger>
            <TabsTrigger value="content">Content ({contentCount})</TabsTrigger>
            <TabsTrigger value="logic">Logic ({logicCount})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Weaknesses List */}
      {weaknesses.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No weaknesses identified yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Track areas where you need improvement.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unresolved */}
          {unresolvedWeaknesses.length > 0 && (
            <div className="space-y-3">
              {unresolvedWeaknesses.map(weakness => (
                <div
                  key={weakness.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <button onClick={() => handleToggleResolved(weakness)} className="mt-0.5">
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{weakness.tag}</p>
                      <Badge className={getTypeBadgeColor(weakness.weakness_type || 'content')}>
                        {getTypeIcon(weakness.weakness_type || 'content')}
                        <span className="ml-1">{weakness.weakness_type === 'logic' ? 'Logic' : 'Content'}</span>
                      </Badge>
                    </div>
                    {weakness.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {weakness.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(weakness)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(weakness)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolved */}
          {resolvedWeaknesses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Resolved ({resolvedWeaknesses.length})
              </h3>
              <div className="space-y-2">
                {resolvedWeaknesses.map(weakness => (
                  <div
                    key={weakness.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20"
                  >
                    <button onClick={() => handleToggleResolved(weakness)}>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-through text-muted-foreground">{weakness.tag}</p>
                    </div>

                    <Badge variant="outline" className="text-green-600">Resolved</Badge>

                    <Button variant="ghost" size="icon" onClick={() => handleDelete(weakness)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
