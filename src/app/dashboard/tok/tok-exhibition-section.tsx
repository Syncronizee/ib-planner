'use client'

import { useState } from 'react'
import { TOKExhibition, TOKExhibitionObject, TOKPrompt, TOK_EXHIBITION_STATUSES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarIcon, Pencil, Images } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { PromptSelector } from '@/components/tok/prompt-selector'
import { List } from 'lucide-react'

interface TOKExhibitionSectionProps {
  initialExhibition: TOKExhibition | null
  initialObjects: TOKExhibitionObject[]
  initialUserPrompts: TOKPrompt[]
}

export function TOKExhibitionSection({ initialExhibition, initialObjects, initialUserPrompts }: TOKExhibitionSectionProps) {
  const [exhibition, setExhibition] = useState<TOKExhibition | null>(initialExhibition)
  const [objects, setObjects] = useState<TOKExhibitionObject[]>(initialObjects)
  const [userPrompts, setUserPrompts] = useState<TOKPrompt[]>(initialUserPrompts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [prompt, setPrompt] = useState(exhibition?.prompt || '')
  const [status, setStatus] = useState(exhibition?.status || 'not_started')
  const [deadline, setDeadline] = useState<Date | undefined>(
    exhibition?.deadline ? new Date(exhibition.deadline) : undefined
  )
  const [objectsData, setObjectsData] = useState<{
    title: string
    description: string
    commentary: string
  }[]>([
    { title: objects.find(o => o.object_number === 1)?.title || '', description: objects.find(o => o.object_number === 1)?.description || '', commentary: objects.find(o => o.object_number === 1)?.commentary || '' },
    { title: objects.find(o => o.object_number === 2)?.title || '', description: objects.find(o => o.object_number === 2)?.description || '', commentary: objects.find(o => o.object_number === 2)?.commentary || '' },
    { title: objects.find(o => o.object_number === 3)?.title || '', description: objects.find(o => o.object_number === 3)?.description || '', commentary: objects.find(o => o.object_number === 3)?.commentary || '' },
  ])
  const router = useRouter()
  const [promptSelectorOpen, setPromptSelectorOpen] = useState(false)
  const handlePromptSelect = (prompt: string) => {
  setPrompt(prompt)
}

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const exhibitionData = {
      prompt,
      status,
      deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
    }

    let exhibitionId = exhibition?.id

    if (exhibition) {
      const { error } = await supabase
        .from('tok_exhibition')
        .update(exhibitionData)
        .eq('id', exhibition.id)

      if (!error) {
        setExhibition({ ...exhibition, ...exhibitionData })
      }
    } else {
      const { data, error } = await supabase
        .from('tok_exhibition')
        .insert({ ...exhibitionData, user_id: user?.id })
        .select()
        .single()

      if (!error && data) {
        setExhibition(data)
        exhibitionId = data.id
      }
    }

    // Save objects
    if (exhibitionId) {
      for (let i = 0; i < 3; i++) {
        const objectNum = i + 1
        const existingObject = objects.find(o => o.object_number === objectNum)
        const objectData = {
          title: objectsData[i].title,
          description: objectsData[i].description,
          commentary: objectsData[i].commentary,
        }

        if (existingObject) {
          await supabase
            .from('tok_exhibition_objects')
            .update(objectData)
            .eq('id', existingObject.id)
        } else if (objectData.title || objectData.description || objectData.commentary) {
          await supabase
            .from('tok_exhibition_objects')
            .insert({
              ...objectData,
              user_id: user?.id,
              exhibition_id: exhibitionId,
              object_number: objectNum,
            })
        }
      }
    }

    setDialogOpen(false)
    router.refresh()
  }

  const openDialog = () => {
    setPrompt(exhibition?.prompt || '')
    setStatus(exhibition?.status || 'not_started')
    setDeadline(exhibition?.deadline ? new Date(exhibition.deadline) : undefined)
    setObjectsData([
      { title: objects.find(o => o.object_number === 1)?.title || '', description: objects.find(o => o.object_number === 1)?.description || '', commentary: objects.find(o => o.object_number === 1)?.commentary || '' },
      { title: objects.find(o => o.object_number === 2)?.title || '', description: objects.find(o => o.object_number === 2)?.description || '', commentary: objects.find(o => o.object_number === 2)?.commentary || '' },
      { title: objects.find(o => o.object_number === 3)?.title || '', description: objects.find(o => o.object_number === 3)?.description || '', commentary: objects.find(o => o.object_number === 3)?.commentary || '' },
    ])
    setDialogOpen(true)
  }

  const updateObject = (index: number, field: string, value: string) => {
    setObjectsData(prev => prev.map((obj, i) => 
      i === index ? { ...obj, [field]: value } : obj
    ))
  }

  const statusLabel = TOK_EXHIBITION_STATUSES.find(s => s.value === exhibition?.status)?.label || 'Not Started'
  const statusColor = {
    'not_started': 'bg-slate-500',
    'selecting_objects': 'bg-blue-500',
    'writing_commentaries': 'bg-amber-500',
    'complete': 'bg-green-500',
  }[exhibition?.status || 'not_started']

  const objectCount = objects.filter(o => o.title).length

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Images className="h-5 w-5" />
            Exhibition
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={openDialog}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={statusColor}>{statusLabel}</Badge>
            {exhibition?.deadline && (
              <span className="text-sm text-muted-foreground">
                Due: {format(new Date(exhibition.deadline), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {exhibition?.prompt ? (
            <div>
              <p className="text-sm font-medium">Prompt:</p>
              <p className="text-sm text-muted-foreground">{exhibition.prompt}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No prompt selected yet.</p>
          )}

          <p className="text-sm text-muted-foreground">
            Objects: {objectCount}/3 selected
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit TOK Exhibition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOK_EXHIBITION_STATUSES.map(s => (
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
            </div>

            <div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label>IA Prompt</Label>
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
    placeholder="Enter or select your IA prompt..."
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    rows={2}
  />
</div>

            <div className="space-y-2">
              <Label>Objects</Label>
              <Tabs defaultValue="1">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="1">Object 1</TabsTrigger>
                  <TabsTrigger value="2">Object 2</TabsTrigger>
                  <TabsTrigger value="3">Object 3</TabsTrigger>
                </TabsList>
                {[0, 1, 2].map(i => (
                  <TabsContent key={i} value={String(i + 1)} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        placeholder="Object title..."
                        value={objectsData[i].title}
                        onChange={(e) => updateObject(i, 'title', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="What is this object? Why did you choose it?"
                        value={objectsData[i].description}
                        onChange={(e) => updateObject(i, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Commentary</Label>
                      <Textarea
                        placeholder="How does this object connect to the prompt?"
                        value={objectsData[i].commentary}
                        onChange={(e) => updateObject(i, 'commentary', e.target.value)}
                        rows={4}
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      <PromptSelector
        open={promptSelectorOpen}
        onOpenChange={setPromptSelectorOpen}
        type="exhibition"
        currentPrompt={prompt}
        userPrompts={userPrompts}
        onSelect={handlePromptSelect}
        onPromptsChange={setUserPrompts}
    />
    </>
  )
}