'use client'

import { useState } from 'react'
import { Subject, ErrorLog, ERROR_TYPES } from '@/lib/types'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Pencil, 
  Trash2,
  CheckCircle,
  Circle,
  CalendarIcon,
  BookX,
  BrainCog,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface ErrorsTabProps {
  subject: Subject
  errorLogs: ErrorLog[]
  onErrorLogsChange: (errorLogs: ErrorLog[]) => void
}

export function ErrorsTab({ subject, errorLogs, onErrorLogsChange }: ErrorsTabProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ErrorLog | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'content_gap' | 'logic_gap' | 'careless'>('all')
  const [expandedErrors, setExpandedErrors] = useState<string[]>([])
  
  const [concept, setConcept] = useState('')
  const [errorDescription, setErrorDescription] = useState('')
  const [correction, setCorrection] = useState('')
  const [errorType, setErrorType] = useState<'content_gap' | 'logic_gap' | 'careless'>('content_gap')
  const [source, setSource] = useState('')
  const [date, setDate] = useState<Date>(new Date())

  const router = useRouter()

  const resetForm = () => {
    setConcept('')
    setErrorDescription('')
    setCorrection('')
    setErrorType('content_gap')
    setSource('')
    setDate(new Date())
    setEditing(null)
  }

  const handleAdd = () => {
    resetForm()
    setAdding(true)
  }

  const handleEdit = (error: ErrorLog) => {
    setEditing(error)
    setConcept(error.concept)
    setErrorDescription(error.error_description)
    setCorrection(error.correction || '')
    setErrorType(error.error_type || 'content_gap')
    setSource(error.source || '')
    setDate(new Date(error.date))
    setAdding(true)
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const errorData = {
      concept,
      error_description: errorDescription,
      correction: correction || null,
      error_type: errorType,
      source: source || null,
      date: format(date, 'yyyy-MM-dd'),
    }

    if (editing) {
      const { data, error } = await supabase
        .from('error_logs')
        .update(errorData)
        .eq('id', editing.id)
        .select()
        .single()

      if (!error && data) {
        onErrorLogsChange(errorLogs.map(e => e.id === editing.id ? data : e))
      }
    } else {
      const { data, error } = await supabase
        .from('error_logs')
        .insert({
          ...errorData,
          user_id: user?.id,
          subject_id: subject.id,
          is_resolved: false,
        })
        .select()
        .single()

      if (!error && data) {
        onErrorLogsChange([data, ...errorLogs])
      }
    }

    resetForm()
    setAdding(false)
    router.refresh()
  }

  const handleToggleResolved = async (error: ErrorLog) => {
    const supabase = createClient()

    const { error: err } = await supabase
      .from('error_logs')
      .update({ is_resolved: !error.is_resolved })
      .eq('id', error.id)

    if (!err) {
      onErrorLogsChange(errorLogs.map(e => e.id === error.id ? { ...e, is_resolved: !e.is_resolved } : e))
    }
  }

  const handleDelete = async (error: ErrorLog) => {
    const supabase = createClient()

    const { error: err } = await supabase
      .from('error_logs')
      .delete()
      .eq('id', error.id)

    if (!err) {
      onErrorLogsChange(errorLogs.filter(e => e.id !== error.id))
    }
  }

  const handleCancel = () => {
    resetForm()
    setAdding(false)
  }

  const toggleExpanded = (id: string) => {
    setExpandedErrors(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  // Filter and count
  const filteredErrors = errorLogs.filter(e => 
    filterType === 'all' || e.error_type === filterType
  )
  const unresolvedErrors = filteredErrors.filter(e => !e.is_resolved)
  const resolvedErrors = filteredErrors.filter(e => e.is_resolved)

  const contentGapCount = errorLogs.filter(e => e.error_type === 'content_gap' && !e.is_resolved).length
  const logicGapCount = errorLogs.filter(e => e.error_type === 'logic_gap' && !e.is_resolved).length
  const carelessCount = errorLogs.filter(e => e.error_type === 'careless' && !e.is_resolved).length

  const getTypeIcon = (type: ErrorLog['error_type']) => {
    switch (type) {
      case 'content_gap': return <BookX className="h-4 w-4" />
      case 'logic_gap': return <BrainCog className="h-4 w-4" />
      case 'careless': return <AlertCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTypeBadgeColor = (type: ErrorLog['error_type']) => {
    switch (type) {
      case 'content_gap': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      case 'logic_gap': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      case 'careless': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getTypeLabel = (type: ErrorLog['error_type']) => {
    return ERROR_TYPES.find(t => t.value === type)?.label || type
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {errorLogs.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{errorLogs.filter(e => !e.is_resolved).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BookX className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Content Gap</span>
              </div>
              <p className="text-2xl font-bold mt-1">{contentGapCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BrainCog className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Logic Gap</span>
              </div>
              <p className="text-2xl font-bold mt-1">{logicGapCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Careless</span>
              </div>
              <p className="text-2xl font-bold mt-1">{carelessCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Form */}
      {adding ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold">{editing ? 'Edit Error' : 'Log Error'}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Concept/Topic</Label>
                <Input
                  placeholder="e.g. Chain rule, Stoichiometry"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Error Type</Label>
                <Select value={errorType} onValueChange={(v: 'content_gap' | 'logic_gap' | 'careless') => setErrorType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ERROR_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(t.value as ErrorLog['error_type'])}
                          <div>
                            <p>{t.label}</p>
                            <p className="text-sm text-muted-foreground">{t.description}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>What went wrong?</Label>
              <Textarea
                placeholder="Describe the mistake you made..."
                value={errorDescription}
                onChange={(e) => setErrorDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Correction / What you learned</Label>
              <Textarea
                placeholder="How should it be done correctly? What did you learn?"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source (optional)</Label>
                <Input
                  placeholder="e.g. Unit 3 Test, Practice Paper 2"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!concept || !errorDescription}>Save</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Log Error
        </Button>
      )}

      {/* Filter Tabs */}
      {errorLogs.length > 0 && (
        <Tabs
          value={filterType}
          onValueChange={(value) => {
            if (value === 'all' || value === 'content_gap' || value === 'logic_gap' || value === 'careless') {
              setFilterType(value)
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All ({errorLogs.filter(e => !e.is_resolved).length})</TabsTrigger>
            <TabsTrigger value="content_gap">Content ({contentGapCount})</TabsTrigger>
            <TabsTrigger value="logic_gap">Logic ({logicGapCount})</TabsTrigger>
            <TabsTrigger value="careless">Careless ({carelessCount})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Errors List */}
      {errorLogs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No errors logged yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Track your mistakes to learn from them.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unresolved */}
          {unresolvedErrors.length > 0 && (
            <div className="space-y-3">
              {unresolvedErrors
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(error => (
                  <div
                    key={error.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div 
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpanded(error.id)}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleResolved(error); }}
                        className="shrink-0"
                      >
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{error.concept}</p>
                          <Badge className={getTypeBadgeColor(error.error_type || 'content_gap')}>
                            {getTypeIcon(error.error_type || 'content_gap')}
                            <span className="ml-1">{getTypeLabel(error.error_type || 'content_gap')}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {error.error_description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(error.date), 'MMM d')}
                        </span>
                        {expandedErrors.includes(error.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {expandedErrors.includes(error.id) && (
                      <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                        <div className="pt-4 space-y-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">What went wrong:</p>
                            <p className="text-sm mt-1">{error.error_description}</p>
                          </div>
                          
                          {error.correction && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Correction:</p>
                              <p className="text-sm mt-1">{error.correction}</p>
                            </div>
                          )}

                          {error.source && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Source:</p>
                              <p className="text-sm mt-1">{error.source}</p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(error)}>
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(error)}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Resolved */}
          {resolvedErrors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Resolved ({resolvedErrors.length})
              </h3>
              <div className="space-y-2">
                {resolvedErrors.map(error => (
                  <div
                    key={error.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20"
                  >
                    <button onClick={() => handleToggleResolved(error)}>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-through text-muted-foreground">{error.concept}</p>
                      <p className="text-sm text-muted-foreground truncate">{error.error_description}</p>
                    </div>

                    <Badge variant="outline" className="text-green-600 shrink-0">Resolved</Badge>

                    <Button variant="ghost" size="icon" onClick={() => handleDelete(error)}>
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
