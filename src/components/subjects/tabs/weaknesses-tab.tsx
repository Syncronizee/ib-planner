'use client'

import { useState, useEffect, useRef } from 'react'
import { Subject, WeaknessTag, WEAKNESS_TYPES, StudySession } from '@/lib/types'
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
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'

interface WeaknessesTabProps {
  subject: Subject
  weaknesses: WeaknessTag[]
  onWeaknessesChange: (weaknesses: WeaknessTag[]) => void
  highlightWeaknessId?: string
}

export function WeaknessesTab({ subject, weaknesses, onWeaknessesChange, highlightWeaknessId }: WeaknessesTabProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<WeaknessTag | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'content' | 'logic'>('all')

  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [weaknessType, setWeaknessType] = useState<'content' | 'logic'>('content')

  // Study sessions linked to weaknesses
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  // Highlighted weakness ref for scrolling
  const highlightRef = useRef<HTMLDivElement | null>(null)
  const [flashHighlight, setFlashHighlight] = useState(false)

  const router = useRouter()

  // Fetch linked study sessions once weaknesses are available
  useEffect(() => {
    if (weaknesses.length === 0) { setSessionsLoaded(true); return }
    const ids = weaknesses.map(w => w.id)
    const supabase = createClient()
    supabase
      .from('study_sessions')
      .select('*')
      .in('weakness_tag_id', ids)
      .order('started_at', { ascending: false })
      .then(({ data }: { data: StudySession[] | null }) => {
        setSessions(data || [])
        setSessionsLoaded(true)
      })
  }, [weaknesses])

  // Scroll to + flash the highlighted weakness
  useEffect(() => {
    if (!highlightWeaknessId || !highlightRef.current) return
    const t = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlashHighlight(true)
      const off = setTimeout(() => setFlashHighlight(false), 2500)
      return () => clearTimeout(off)
    }, 120)
    return () => clearTimeout(t)
  }, [highlightWeaknessId])

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

  function toggleSessionExpand(weaknessId: string) {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(weaknessId)) next.delete(weaknessId)
      else next.add(weaknessId)
      return next
    })
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

  function sessionsByWeakness(weaknessId: string) {
    return sessions.filter(s => (s as StudySession & { weakness_tag_id?: string }).weakness_tag_id === weaknessId)
  }

  function WeaknessRow({ weakness }: { weakness: WeaknessTag }) {
    const isHighlighted = weakness.id === highlightWeaknessId
    const linkedSessions = sessionsByWeakness(weakness.id)
    const sessionExpanded = expandedSessions.has(weakness.id)
    const hasBeenAddressed = (weakness.address_count ?? 0) > 0 && weakness.last_addressed_at

    return (
      <div
        ref={isHighlighted ? highlightRef : null}
        className={`rounded-lg border transition-all duration-300 ${
          isHighlighted && flashHighlight
            ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-md shadow-[var(--accent)]/20'
            : 'border-[var(--border)] bg-transparent hover:bg-[var(--muted)]/30'
        }`}
      >
        <div className="flex items-start gap-4 p-4">
          <button onClick={() => handleToggleResolved(weakness)} className="mt-0.5 flex-shrink-0">
            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-[var(--card-fg)]">{weakness.tag}</p>
              <Badge className={getTypeBadgeColor(weakness.weakness_type || 'content')}>
                {getTypeIcon(weakness.weakness_type || 'content')}
                <span className="ml-1">{weakness.weakness_type === 'logic' ? 'Logic' : 'Content'}</span>
              </Badge>
              {hasBeenAddressed && (
                <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  Studied {formatDistanceToNow(new Date(weakness.last_addressed_at!), { addSuffix: true })}
                  {(weakness.address_count ?? 0) > 1 && ` · ${weakness.address_count}x`}
                </span>
              )}
            </div>
            {weakness.description && (
              <p className="text-sm text-muted-foreground mt-1">{weakness.description}</p>
            )}
            {weakness.reflection_notes && (
              <p className="text-xs text-[var(--muted-fg)] mt-1 italic">Note: {weakness.reflection_notes}</p>
            )}

            {/* Linked study sessions toggle */}
            {sessionsLoaded && linkedSessions.length > 0 && (
              <button
                type="button"
                onClick={() => toggleSessionExpand(weakness.id)}
                className="mt-2 flex items-center gap-1 text-xs text-[var(--muted-fg)] hover:text-[var(--card-fg)] transition-smooth"
              >
                {sessionExpanded
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />}
                {linkedSessions.length} focus session{linkedSessions.length !== 1 ? 's' : ''}
              </button>
            )}

            {/* Session list */}
            {sessionExpanded && linkedSessions.length > 0 && (
              <div className="mt-2 space-y-1 pl-1 border-l-2 border-[var(--border)] ml-1">
                {linkedSessions.map(session => (
                  <div key={session.id} className="pl-3 py-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-[var(--card-fg)]">
                        {format(new Date(session.started_at), 'dd MMM yyyy')}
                      </span>
                      <span className="text-xs text-[var(--muted-fg)]">
                        {session.duration_minutes} min
                      </span>
                      {session.productivity_rating && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                          session.productivity_rating === 'good'
                            ? 'border-green-500/30 text-green-400 bg-green-500/10'
                            : session.productivity_rating === 'okay'
                            ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                            : 'border-red-500/30 text-red-400 bg-red-500/10'
                        }`}>
                          {session.productivity_rating}
                        </span>
                      )}
                    </div>
                    {session.notes && (
                      <p className="text-[11px] text-[var(--muted-fg)] mt-0.5 line-clamp-2">{session.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(weakness)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(weakness)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
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
                <Select value={weaknessType} onValueChange={(v: 'content' | 'logic') => setWeaknessType(v)}>
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
        <Tabs
          value={filterType}
          onValueChange={(value) => {
            if (value === 'all' || value === 'content' || value === 'logic') {
              setFilterType(value)
            }
          }}
        >
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
                <WeaknessRow key={weakness.id} weakness={weakness} />
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
                      {weakness.reflection_notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{weakness.reflection_notes}</p>
                      )}
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
