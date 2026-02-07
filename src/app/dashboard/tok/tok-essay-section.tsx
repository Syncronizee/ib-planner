'use client'

import { useState } from 'react'
import { TOKEssay, TOKPrompt, TOK_ESSAY_STATUSES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { PromptSelector } from '@/components/tok/prompt-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { CalendarIcon, Pencil, FileText, List } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface TOKEssaySectionProps {
  initialEssay: TOKEssay | null
  initialUserPrompts: TOKPrompt[]
}

export function TOKEssaySection({ initialEssay, initialUserPrompts }: TOKEssaySectionProps) {
  const [essay, setEssay] = useState<TOKEssay | null>(initialEssay)
  const [userPrompts, setUserPrompts] = useState<TOKPrompt[]>(initialUserPrompts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [promptSelectorOpen, setPromptSelectorOpen] = useState(false)
  const [prescribedTitle, setPrescribedTitle] = useState(essay?.prescribed_title || '')
  const [thesis, setThesis] = useState(essay?.thesis || '')
  const [outline, setOutline] = useState(essay?.outline || '')
  const [status, setStatus] = useState(essay?.status || 'not_started')
  const [wordCount, setWordCount] = useState(essay?.word_count || 0)
  const [deadline, setDeadline] = useState<Date | undefined>(
    essay?.deadline ? new Date(essay.deadline) : undefined
  )
  const router = useRouter()

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const essayData = {
      prescribed_title: prescribedTitle,
      thesis,
      outline,
      status,
      word_count: wordCount,
      deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
    }

    if (essay) {
      const { data, error } = await supabase
        .from('tok_essay')
        .update(essayData)
        .eq('id', essay.id)
        .select()
        .single()

      if (!error && data) {
        setEssay(data)
      }
    } else {
      const { data, error } = await supabase
        .from('tok_essay')
        .insert({ ...essayData, user_id: user?.id })
        .select()
        .single()

      if (!error && data) {
        setEssay(data)
      }
    }

    setDialogOpen(false)
    router.refresh()
  }

  const openDialog = () => {
    setPrescribedTitle(essay?.prescribed_title || '')
    setThesis(essay?.thesis || '')
    setOutline(essay?.outline || '')
    setStatus(essay?.status || 'not_started')
    setWordCount(essay?.word_count || 0)
    setDeadline(essay?.deadline ? new Date(essay.deadline) : undefined)
    setDialogOpen(true)
  }

  const handlePromptSelect = (prompt: string) => {
    setPrescribedTitle(prompt)
  }

  const statusLabel = TOK_ESSAY_STATUSES.find(s => s.value === essay?.status)?.label || 'Not Started'
  const statusColor = {
    'not_started': 'bg-slate-500',
    'planning': 'bg-blue-500',
    'drafting': 'bg-amber-500',
    'revising': 'bg-purple-500',
    'complete': 'bg-green-500',
  }[essay?.status || 'not_started']

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Essay
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={openDialog}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={statusColor}>{statusLabel}</Badge>
            {essay?.deadline && (
              <span className="text-sm text-muted-foreground">
                Due: {format(new Date(essay.deadline), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {essay?.prescribed_title ? (
            <div>
              <p className="text-sm font-medium">Prescribed Title:</p>
              <p className="text-sm text-muted-foreground">{essay.prescribed_title}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No prescribed title selected yet.</p>
          )}

          {(essay?.word_count ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">
              Word count: {essay?.word_count ?? 0}/1600
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit TOK Essay</DialogTitle>
            <DialogDescription className="sr-only">
              Edit TOK essay details and progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOK_ESSAY_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prescribed Title</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPromptSelectorOpen(true)}
                >
                  <List className="h-4 w-4 mr-1" />
                  Browse
                </Button>
              </div>
              <Textarea
                placeholder="Enter or select your prescribed title..."
                value={prescribedTitle}
                onChange={(e) => setPrescribedTitle(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Thesis</Label>
              <Textarea
                placeholder="Your main argument..."
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Outline</Label>
              <Textarea
                placeholder="Essay structure and key points..."
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Word Count</Label>
              <Input
                type="number"
                min="0"
                max="1600"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Maximum: 1600 words</p>
            </div>

            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <PromptSelector
        open={promptSelectorOpen}
        onOpenChange={setPromptSelectorOpen}
        type="essay"
        currentPrompt={prescribedTitle}
        userPrompts={userPrompts}
        onSelect={handlePromptSelect}
        onPromptsChange={setUserPrompts}
      />
    </>
  )
}
